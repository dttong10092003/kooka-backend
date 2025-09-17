# routes/api.py
from fastapi import APIRouter, HTTPException
from models.models import SearchRequest, KeywordSearchRequest
from data.db import collection, embed_model
from unidecode import unidecode
from typing import List
import math

router = APIRouter()

@router.post("/search")
def search(req: SearchRequest):
    try:
        # Build query text cho embedding
        ingredients_text = ", ".join(req.ingredients) if req.ingredients else ""
        tags_text = ", ".join(req.tags) if req.tags else ""
        q = f"Nguyên liệu: {ingredients_text}"
        if tags_text:
            q += f". Tags: {tags_text}"
        if req.cuisine:
            q += f". Cuisine: {req.cuisine}"
        if req.category:
            q += f". Category: {req.category}"
        if not q.strip():
            q = "Tìm món"

        print(f"[Debug] Query: {q}")

        # Encode query thành vector
        q_emb = embed_model.encode(q).tolist()

        # Bỏ where_filter tạm thời để debug
        where_filter = None

        # Hybrid query
        results = collection.query(
            query_embeddings=[q_emb],
            n_results=req.top_k * 5,
            where=where_filter,
            include=["metadatas", "distances"]
        )

        hits = []
        if results and results.get("ids"):
            for i, rid in enumerate(results["ids"][0]):
                meta = results["metadatas"][0][i]
                hit_ings = set(ing.strip().lower() for ing in meta.get("ingredients", "").split(", "))
                user_ings = set(ing.strip().lower() for ing in req.ingredients)
                hit_tags = set(tag.strip().lower() for tag in meta.get("tags", "").split(", "))
                user_tags = set(tag.strip().lower() for tag in req.tags)

                # Tính match_ratio chỉ khi có user_ings
                match_ratio = 0
                if user_ings:
                    common_ings = hit_ings & user_ings
                    match_ratio = len(common_ings) / len(user_ings) if len(user_ings) > 0 else 0
                else:
                    match_ratio = 1  # Nếu không nhập nguyên liệu, chấp nhận tất cả

                # Kiểm tra tags
                tags_match = user_tags.issubset(hit_tags) if user_tags else True

                # Kiểm tra cuisine
                hit_cuisine = meta.get("cuisine", "").lower()
                user_cuisine = req.cuisine.lower() if req.cuisine else None
                cuisine_match = not user_cuisine or hit_cuisine == user_cuisine

                # Kiểm tra category
                hit_category = meta.get("category", "").lower()
                user_category = req.category.lower() if req.category else None
                category_match = not user_category or hit_category == user_category

                print(f"[Debug] Recipe {rid}: match_ratio = {match_ratio}, tags_match = {tags_match}, cuisine_match = {cuisine_match}, category_match = {category_match}, hit_ings = {hit_ings}, user_ings = {user_ings}, hit_tags = {hit_tags}, user_tags = {user_tags}, hit_cuisine = {hit_cuisine}, user_cuisine = {user_cuisine}, hit_category = {hit_category}, user_category = {user_category}")

                if match_ratio >= 0.3 and tags_match and cuisine_match and category_match:
                    rate = meta.get("rate", 0.0)
                    num_rates = meta.get("numberOfRate", 0)
                    ingredients_raw = meta.get("ingredients", "")
                    ingredients_list = [ing.strip() for ing in ingredients_raw.split(",") if ing.strip()]
                    distance = results["distances"][0][i]
                    weighted_score = (rate * math.log(1 + num_rates)) / (distance + 1) if distance > 0 else rate * math.log(1 + num_rates)
                    hits.append({
                        "id": meta.get("id"),
                        "name": meta.get("name"),
                        "short": meta.get("short", ""),
                        "image": meta.get("image", ""),
                        "calories": meta.get("calories", 0),
                        "time": meta.get("time", ""),
                        "size": meta.get("size", ""),
                        "difficulty": meta.get("difficulty", ""),
                        "cuisine": meta.get("cuisine", ""),
                        "category": meta.get("category", ""),
                        "rate": rate,
                        "numberOfRate": num_rates,
                        "ingredients": ingredients_list,
                        "distance": distance,
                        "weighted_score": weighted_score
                    })
        hits = sorted(hits, key=lambda x: x["weighted_score"], reverse=True)[:req.top_k]

        return {"query": q, "hits": hits}
    except Exception as e:
        print(f"[Debug] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search-by-keyword")
def search_by_keyword(req: KeywordSearchRequest):
    try:
        # Chuẩn hóa và tách từ khóa
        keywords = req.keywords.strip()
        if not keywords:
            keywords = "Tìm món"
        # Loại bỏ dấu và tách thành danh sách từ
        keywords_no_accent = unidecode(keywords).lower()
        keyword_list = [kw.strip() for kw in keywords_no_accent.split()]

        # Build query text
        q = f"Tìm kiếm: {keywords}"

        print(f"[Debug] Query: {q}, Normalized keywords: {keyword_list}")

        # Encode query thành vector
        q_emb = embed_model.encode(q).tolist()

        # Query ChromaDB
        results = collection.query(
            query_embeddings=[q_emb],
            n_results=req.top_k * 2,
            include=["metadatas", "distances"]
        )

        hits = []
        if results and results.get("ids"):
            for i, rid in enumerate(results["ids"][0]):
                meta = results["metadatas"][0][i]
                # Chuẩn bị text để tìm kiếm (name)
                text_to_search = meta.get('name', '').lower()
                text_no_accent = unidecode(text_to_search).lower()

                # Kiểm tra từ khóa
                keyword_match = any(kw in text_no_accent for kw in keyword_list)

                # Kiểm tra tags
                hit_tags = set(tag.strip().lower() for tag in meta.get("tags", "").split(", "))
                user_tags = set(tag.strip().lower() for tag in req.tags)
                tags_match = user_tags.issubset(hit_tags) if user_tags else True

                # Kiểm tra cuisine
                hit_cuisine = meta.get("cuisine", "").lower()
                user_cuisine = req.cuisine.lower() if req.cuisine else None
                cuisine_match = not user_cuisine or hit_cuisine == user_cuisine

                # Kiểm tra category
                hit_category = meta.get("category", "").lower()
                user_category = req.category.lower() if req.category else None
                category_match = not user_category or hit_category == user_category

                if keyword_match and tags_match and cuisine_match and category_match:
                    rate = meta.get("rate", 0.0)
                    num_rates = meta.get("numberOfRate", 0)
                    ingredients_raw = meta.get("ingredients", "")
                    ingredients_list = [ing.strip() for ing in ingredients_raw.split(",") if ing.strip()]
                    distance = results["distances"][0][i]

                    # Tính số từ khóa khớp trong name
                    match_count = sum(1 for kw in keyword_list if kw in text_no_accent)
                    keyword_weight = match_count / len(keyword_list) if keyword_list else 1.0

                    # Tính weighted_score
                    base_score = (rate * math.log(1 + num_rates)) / (distance + 1) if distance > 0 else rate * math.log(1 + num_rates)
                    weighted_score = base_score * (1 + 2 * keyword_weight)

                    hits.append({
                        "id": meta.get("id"),
                        "name": meta.get("name"),
                        "short": meta.get("short", ""),
                        "image": meta.get("image", ""),
                        "calories": meta.get("calories", 0),
                        "time": meta.get("time", ""),
                        "size": meta.get("size", ""),
                        "difficulty": meta.get("difficulty", ""),
                        "cuisine": meta.get("cuisine", ""),
                        "category": meta.get("category", ""),
                        "rate": rate,
                        "numberOfRate": num_rates,
                        "ingredients": ingredients_list,
                        "distance": distance,
                        "weighted_score": weighted_score
                    })
        # Sort bằng weighted_score giảm dần, giới hạn top_k
        hits = sorted(hits, key=lambda x: x["weighted_score"], reverse=True)[:req.top_k]

        return {"query": q, "hits": hits}
    except Exception as e:
        print(f"[Debug] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))