# routes/api.py
from fastapi import APIRouter, HTTPException
from models.models import SearchRequest, KeywordSearchRequest
from data.db import collection, embed_model
from unidecode import unidecode
from typing import List
import math
from data.indexing import sync_recipes_to_chroma

router = APIRouter()

@router.post("/search")
def search(req: SearchRequest):
    """
    Tìm kiếm theo danh sách nguyên liệu với scoring thông minh:
    - Ưu tiên món có nhiều nguyên liệu khớp
    - Kết hợp với vector similarity
    - Tính đến rating và popularity
    """
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

        print(f"[Search] Ingredients query: {req.ingredients}")

        # Encode query thành vector
        q_emb = embed_model.encode(q).tolist()

        # Query ChromaDB
        results = collection.query(
            query_embeddings=[q_emb],
            n_results=min(req.top_k * 5, 100),
            include=["metadatas", "distances"]
        )

        hits = []
        if results and results.get("ids"):
            for i, rid in enumerate(results["ids"][0]):
                meta = results["metadatas"][0][i]
                
                # Parse ingredients và tags
                hit_ings = set(ing.strip().lower() for ing in meta.get("ingredients", "").split(", ") if ing.strip())
                user_ings = set(ing.strip().lower() for ing in req.ingredients)
                hit_tags = set(tag.strip().lower() for tag in meta.get("tags", "").split(", ") if tag.strip())
                user_tags = set(tag.strip().lower() for tag in req.tags)

                # === FILTERS ===
                # Tags filter
                tags_match = user_tags.issubset(hit_tags) if user_tags else True
                if not tags_match:
                    continue

                # Cuisine filter
                hit_cuisine = meta.get("cuisineLowercase", "")
                user_cuisine = req.cuisine.lower() if req.cuisine else None
                cuisine_match = not user_cuisine or hit_cuisine == user_cuisine
                if not cuisine_match:
                    continue

                # Category filter
                hit_category = meta.get("categoryLowercase", "")
                user_category = req.category.lower() if req.category else None
                category_match = not user_category or hit_category == user_category
                if not category_match:
                    continue

                # === SCORING ===
                # 1. Ingredient matching score (ưu tiên trùng nguyên liệu cao hơn vector)
                if user_ings:
                    common_ings = hit_ings & user_ings
                    common_count = len(common_ings)
                    match_ratio = common_count / len(user_ings)
                    coverage_ratio = common_count / len(hit_ings) if len(hit_ings) > 0 else 0
                    union_count = len(hit_ings | user_ings)
                    jaccard = common_count / union_count if union_count else 0

                    # Ngưỡng tối thiểu về độ phủ nguyên liệu: món nhiều nguyên liệu cần trùng nhiều hơn
                    coverage_threshold = 0.25
                    if len(hit_ings) >= 12:
                        coverage_threshold = 0.35
                    elif len(hit_ings) >= 8:
                        coverage_threshold = 0.30

                    # Loại bỏ món có độ phủ thấp hoặc tỉ lệ trùng thấp
                    if match_ratio < 0.5:
                        continue
                    if coverage_ratio < coverage_threshold:
                        continue

                    ingredient_signal = (
                        match_ratio * 0.55 +
                        coverage_ratio * 0.35 +
                        jaccard * 0.10
                    )
                    ingredient_score = ingredient_signal * 1500
                else:
                    # Không có nguyên liệu filter
                    ingredient_score = 500

                # 2. Vector similarity
                distance = results["distances"][0][i]
                vector_score = 1000 / (1 + distance) if distance >= 0 else 0

                # 3. Popularity score
                rate = meta.get("rate", 0.0)
                num_rates = meta.get("numberOfRate", 0)
                popularity_score = (rate / 5.0) * math.log(1 + num_rates) * 100

                # === TỔNG HỢP ===
                relevance_score = (
                    ingredient_score * 3.0 +    # Ưu tiên nguyên liệu khớp mạnh hơn
                    vector_score * 0.3 +        # Vector chỉ hỗ trợ
                    popularity_score * 0.4      # Popularity
                )

                ingredients_raw = meta.get("ingredients", "")
                ingredients_list = [ing.strip() for ing in ingredients_raw.split(",") if ing.strip()]

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
                    "relevance_score": relevance_score,
                    "match_ratio": match_ratio if user_ings else 1.0
                })

        # Sort theo relevance_score
        hits = sorted(hits, key=lambda x: x["relevance_score"], reverse=True)[:req.top_k]
        
        print(f"[Search] Found {len(hits)} results")

        return {"query": q, "hits": hits}
    except Exception as e:
        print(f"[Search] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search/search-by-keyword")
def search_by_keyword(req: KeywordSearchRequest):
    """
    Tìm kiếm theo keyword với thuật toán thông minh như Google/YouTube:
    1. Exact match (khớp chính xác) - điểm cao nhất
    2. Phrase match (chuỗi từ liên tiếp) - điểm cao
    3. All words match (tất cả từ có mặt) - điểm trung bình
    4. Partial match (một số từ) - điểm thấp
    """
    try:
        # Chuẩn hóa query
        keywords = req.keywords.strip()
        if not keywords:
            return {"query": "", "hits": []}
        
        keywords_lower = keywords.lower()
        keywords_no_accent = unidecode(keywords_lower)
        keyword_list = [kw.strip() for kw in keywords_no_accent.split() if kw.strip()]
        
        if not keyword_list:
            return {"query": keywords, "hits": []}

        print(f"[Search] Query: '{keywords}' → Keywords: {keyword_list}")

        # Build query text với trọng số cao cho tên món
        q = f"{keywords}. Món ăn: {keywords}. Tìm kiếm: {keywords}"

        # Encode query thành vector
        q_emb = embed_model.encode(q).tolist()

        # Query ChromaDB với nhiều kết quả hơn để có thể re-rank
        results = collection.query(
            query_embeddings=[q_emb],
            n_results=min(req.top_k * 5, 100),  # Lấy nhiều để re-rank
            include=["metadatas", "distances"]
        )

        hits = []
        if results and results.get("ids"):
            for i, rid in enumerate(results["ids"][0]):
                meta = results["metadatas"][0][i]
                
                # Lấy các text fields để matching
                name = meta.get('name', '')
                name_lower = meta.get('nameLowercase', name.lower())
                name_no_accent = meta.get('nameNoAccent', unidecode(name_lower))
                short = meta.get('short', '').lower()
                short_no_accent = unidecode(short)
                
                # Kiểm tra filters trước (nhanh hơn)
                # Tags filter
                hit_tags = set(tag.strip().lower() for tag in meta.get("tags", "").split(", ") if tag.strip())
                user_tags = set(tag.strip().lower() for tag in req.tags)
                tags_match = user_tags.issubset(hit_tags) if user_tags else True
                
                if not tags_match:
                    continue

                # Cuisine filter
                hit_cuisine = meta.get("cuisineLowercase", "")
                user_cuisine = req.cuisine.lower() if req.cuisine else None
                cuisine_match = not user_cuisine or hit_cuisine == user_cuisine
                
                if not cuisine_match:
                    continue

                # Category filter
                hit_category = meta.get("categoryLowercase", "")
                user_category = req.category.lower() if req.category else None
                category_match = not user_category or hit_category == user_category
                
                if not category_match:
                    continue

                # === SCORING SYSTEM (Giống Google) ===
                
                # 1. EXACT MATCH - Khớp chính xác toàn bộ query (score cao nhất)
                exact_match_score = 0
                if keywords_no_accent == name_no_accent:
                    exact_match_score = 1000  # Điểm cực cao - match chính xác 100%
                elif keywords_lower == name_lower:
                    exact_match_score = 900
                # Substring exact match: Chỉ cho điểm cao nếu là WORD BOUNDARY
                # Ví dụ: "bún chả" trong "bún chả hà nội" ✅
                # Nhưng: "chao" trong "chao ga" ✅ (này sẽ được xử lý bởi phrase match)
                elif len(keyword_list) >= 2 and (" " + keywords_no_accent + " ") in (" " + name_no_accent + " "):
                    # Thêm space để đảm bảo word boundary
                    exact_match_score = 800
                elif len(keyword_list) >= 2 and (" " + keywords_lower + " ") in (" " + name_lower + " "):
                    exact_match_score = 700
                
                # 2. PHRASE MATCH - Chuỗi từ liên tiếp xuất hiện
                phrase_match_score = 0
                if len(keyword_list) >= 2:
                    # Kiểm tra chuỗi từ có xuất hiện liên tiếp không
                    query_phrase = " ".join(keyword_list)
                    if query_phrase in name_no_accent:
                        phrase_match_score = 500
                    elif query_phrase in short_no_accent:
                        phrase_match_score = 300
                
                # 3. ALL WORDS MATCH - Tất cả từ có mặt (không nhất thiết liên tiếp)
                # Tách thành words (từ riêng biệt), không dùng substring matching
                name_words = set(name_no_accent.split())
                short_words = set(short_no_accent.split())
                
                # Chỉ match CHÍNH XÁC từ, không phải substring
                # Ví dụ: "ga" match với "ga" nhưng KHÔNG match với "nga"
                matched_in_name = sum(1 for kw in keyword_list if kw in name_words)
                matched_in_short = sum(1 for kw in keyword_list if kw in short_words)
                
                all_words_match_score = 0
                if matched_in_name == len(keyword_list):
                    all_words_match_score = 400  # Match TẤT CẢ từ trong NAME → Điểm cao
                elif matched_in_short == len(keyword_list):
                    all_words_match_score = 100  # Match TẤT CẢ từ trong SHORT → Điểm thấp hơn (giảm từ 200 xuống 100)
                
                # 4. PARTIAL MATCH - Một số từ khớp (BM25-like scoring)
                partial_match_score = 0
                if matched_in_name > 0:
                    # Tỷ lệ từ khớp trong name
                    match_ratio = matched_in_name / len(keyword_list)
                    partial_match_score = match_ratio * 300
                elif matched_in_short > 0:
                    # Tỷ lệ từ khớp trong short description
                    match_ratio = matched_in_short / len(keyword_list)
                    partial_match_score = match_ratio * 150
                
                # CHÚ Ý: Nếu không match từ nào cả (matched_in_name = 0 và matched_in_short = 0)
                # thì partial_match_score = 0, và exact/phrase cũng = 0
                # → keyword_relevance sẽ = 0 → sẽ bị skip ở dưới

                # 5. POSITION BOOST - Từ xuất hiện ở đầu tên món được ưu tiên
                position_score = 0
                name_first_word = name_no_accent.split()[0] if name_no_accent.split() else ""
                if name_first_word and keyword_list and keyword_list[0] == name_first_word:
                    position_score = 100

                # === KEYWORD MATCHING SCORE ===
                # Tổng điểm từ keyword matching (không tính vector và popularity)
                keyword_relevance = (
                    exact_match_score +
                    phrase_match_score +
                    all_words_match_score +
                    partial_match_score +
                    position_score
                )
                
                # === THRESHOLD THÔNG MINH HƠN ===
                # Ưu tiên NAME hơn SHORT (như Google/YouTube)
                
                # Rule 1: Query 1 từ (như "phở", "gà") - BẮT BUỘC match trong NAME
                if len(keyword_list) == 1:
                    if matched_in_name == 0:
                        print(f"[Search] ❌ Skip '{name}' - Single-word query must match in NAME (matched_in_name=0)")
                        continue
                
                # Rule 2: Query 2+ từ (như "cháo gà", "phở bò") - Linh hoạt hơn
                else:
                    # Case A: Nếu match ít nhất 50% trong NAME → OK (ví dụ: "cháo gà" → "Cháo gà hầm", match 2/2)
                    name_match_percentage = matched_in_name / len(keyword_list)
                    
                    # Case B: Nếu có exact/phrase match → OK luôn
                    has_strong_match = exact_match_score > 0 or phrase_match_score > 0
                    
                    # Case C: Match trong SHORT chỉ chấp nhận nếu match >= 100% (tất cả từ)
                    short_match_percentage = matched_in_short / len(keyword_list)
                    
                    # Quyết định: Phải thỏa ít nhất 1 trong 3 điều kiện
                    if not has_strong_match:
                        # Không có exact/phrase → Phải match đủ từ
                        if name_match_percentage < 0.5 and short_match_percentage < 1.0:
                            print(f"[Search] ❌ Skip '{name}' - Insufficient match (name={matched_in_name}/{len(keyword_list)}={name_match_percentage*100:.0f}%, short={matched_in_short}/{len(keyword_list)}={short_match_percentage*100:.0f}%)")
                            continue
                        
                        # Nếu chỉ match trong SHORT (không match trong NAME) → Phải 100%
                        if matched_in_name == 0 and short_match_percentage < 1.0:
                            print(f"[Search] ❌ Skip '{name}' - Match only in SHORT but not 100% ({matched_in_short}/{len(keyword_list)})")
                            continue
                
                print(f"[Search] ✅ Match '{name}' - keyword_relevance={keyword_relevance:.0f} (exact={exact_match_score}, phrase={phrase_match_score}, name_match={matched_in_name}/{len(keyword_list)}, short_match={matched_in_short}/{len(keyword_list)})")

                # 6. VECTOR SIMILARITY - Khoảng cách vector (semantic)
                distance = results["distances"][0][i]
                # Chuyển distance thành score (distance nhỏ → score cao)
                vector_score = 1000 / (1 + distance) if distance >= 0 else 0
                
                # 7. POPULARITY SCORE - Rating và số lượng đánh giá
                rate = meta.get("rate", 0.0)
                num_rates = meta.get("numberOfRate", 0)
                popularity_score = (rate / 5.0) * math.log(1 + num_rates) * 50

                # === TỔNG HỢP ĐIỂM ===
                # Trọng số theo độ ưu tiên (giống Google/YouTube)
                # Tăng vector_score để tìm kiếm semantic thông minh hơn
                relevance_score = (
                    exact_match_score * 5.0 +      # Ưu tiên cao nhất
                    phrase_match_score * 3.0 +     # Ưu tiên cao
                    all_words_match_score * 2.0 +  # Ưu tiên trung bình
                    partial_match_score * 1.0 +    # Ưu tiên thấp
                    position_score * 1.5 +         # Boost cho từ đầu tiên
                    vector_score * 1.0 +           # Semantic similarity (TĂNG từ 0.3 lên 1.0 để tìm kiếm thông minh)
                    popularity_score * 0.5         # Popularity (chỉ boost thêm)
                )

                # Lúc này relevance_score > 0 là chắc chắn (do đã check keyword_relevance > 0)
                if relevance_score > 0:
                    ingredients_raw = meta.get("ingredients", "")
                    ingredients_list = [ing.strip() for ing in ingredients_raw.split(",") if ing.strip()]
                    
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
                        "relevance_score": relevance_score,
                        # Debug info (có thể bỏ sau)
                        "_debug": {
                            "exact": exact_match_score,
                            "phrase": phrase_match_score,
                            "all_words": all_words_match_score,
                            "partial": partial_match_score,
                            "position": position_score,
                            "vector": round(vector_score, 2),
                            "popularity": round(popularity_score, 2)
                        }
                    })

        # Sort theo relevance_score giảm dần
        hits = sorted(hits, key=lambda x: x["relevance_score"], reverse=True)[:req.top_k]
        
        print(f"[Search] Found {len(hits)} results")
        if hits:
            print(f"[Search] Top result: '{hits[0]['name']}' (score: {hits[0]['relevance_score']:.2f})")

        return {"query": keywords, "hits": hits}
    except Exception as e:
        print(f"[Search] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/reindex")
async def reindex_data():
    sync_recipes_to_chroma()
    return {"message": "Reindex completed"}