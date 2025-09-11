# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import chromadb
from sentence_transformers import SentenceTransformer
import json
from typing import List, Optional
import math
import os
from unidecode import unidecode  # Import hàm unidecode từ thư viện unidecode
import requests  # Import requests for HTTP calls

# --- CONFIG ---
JSON_FILE = "recipe_test.json"  # File data của bạn
CHROMA_PATH = "./chroma_db"  # Folder lưu ChromaDB

# ChromaDB config
client = chromadb.PersistentClient(path=CHROMA_PATH)
COLLECTION_NAME = "recipes"
if COLLECTION_NAME in [c.name for c in client.list_collections()]:
    collection = client.get_collection(COLLECTION_NAME)
else:
    collection = client.create_collection(name=COLLECTION_NAME)

# Embedding model
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

app = FastAPI(title="Recipe Search Service")

# Hàm load recipes từ JSON
def load_recipes():
    with open(JSON_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# Hàm index data vào ChromaDB
def load_and_index(force_reindex=False):
    try:
        if force_reindex or collection.count() == 0:
            recipes = load_recipes()
            ids, docs, metas, embs = [], [], [], []
            for r in recipes:
                if not isinstance(r, dict) or "name" not in r or "id" not in r:
                    print(f"[Index] Skipping invalid recipe: {r}")
                    continue
                
                rid = r["id"]
                ingredients_str = ", ".join(r.get("ingredients", []))
                tags_str = ", ".join(r.get("tags", []))
                instructions_str = json.dumps(r.get("instructions", []))
                
                text = f"{r['name']}. Nguyên liệu: {ingredients_str}. Tags: {tags_str}. Tóm tắt: {r.get('short','')}. Cuisine: {r.get('cuisine','')}. Category: {r.get('category','')}. Calories: {r.get('calories',0)}."
                
                emb = embed_model.encode(text).tolist()
                
                ids.append(str(rid))
                docs.append(text)
                metas.append({
                    "id": rid,
                    "name": r["name"],
                    "short": r.get("short", ""),
                    "ingredients": ingredients_str,
                    "tags": tags_str,
                    "instructions": instructions_str,
                    "image": r.get("image", ""),
                    "video": r.get("video", ""),
                    "calories": r.get("calories", 0),
                    "time": r.get("time", ""),
                    "size": r.get("size", ""),
                    "difficulty": r.get("difficulty", ""),
                    "cuisine": r.get("cuisine", ""),
                    "category": r.get("category", ""),
                    "rate": r.get("rate", 0.0),
                    "numberOfRate": r.get("numberOfRate", 0)
                })
                embs.append(emb)
            
            collection.upsert(ids=ids, documents=docs, metadatas=metas, embeddings=embs)
            print(f"[Index] Indexed {len(ids)} recipes")
        else:
            print(f"[Index] Collection already has {collection.count()} items")
    except Exception as e:
        print(f"[Index] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Khởi động: Index nếu rỗng
load_and_index()

# Model request cho /search
class SearchRequest(BaseModel):
    ingredients: List[str] = []
    tags: List[str] = []
    cuisine: Optional[str] = None
    category: Optional[str] = None
    top_k: int = 20

# Model request cho /search-by-keyword
class KeywordSearchRequest(BaseModel):
    keywords: str = ""  # Chuỗi từ khóa (ví dụ: "phở bò" hoặc "thịt bò")
    tags: List[str] = []  # Danh sách tags để filter
    cuisine: Optional[str] = None  # Thêm cuisine (tuỳ chọn)
    category: Optional[str] = None  # Thêm category (tuỳ chọn)
    top_k: int = 20  # Số kết quả tối đa

@app.post("/search")
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
                        "distance": distance,
                        "weighted_score": weighted_score
                    })
        hits = sorted(hits, key=lambda x: x["weighted_score"], reverse=True)[:req.top_k]

        return {"query": q, "hits": hits}
    except Exception as e:
        print(f"[Debug] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search-by-keyword")
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
                        "distance": distance,
                        "weighted_score": weighted_score
                    })
        # Sort bằng weighted_score giảm dần, giới hạn top_k
        hits = sorted(hits, key=lambda x: x["weighted_score"], reverse=True)[:req.top_k]

        return {"query": q, "hits": hits}
    except Exception as e:
        print(f"[Debug] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint fetch full recipe
@app.get("/recipe/{recipe_id}")
def get_recipe(recipe_id: str):
    result = collection.get(ids=[recipe_id], include=["metadatas"])
    if result and result["metadatas"]:
        meta = result["metadatas"][0]
        meta["instructions"] = json.loads(meta.get("instructions", "[]"))
        return meta
    raise HTTPException(status_code=404, detail="Recipe not found")




# # Model request cho /chat
# class ChatRequest(BaseModel):
#     query: str  # Câu hỏi của người dùng (ví dụ: "Gợi ý món ăn chay dưới 500 calo?")
#     context: Optional[List[str]] = None  # Optional: Lịch sử chat nếu multi-turn

# OLLAMA_URL = "http://localhost:11434/api/generate"  # URL Ollama local
# MODEL = "llama3.1:8b"  # Model Llama3.1 8B

# @app.post("/chat")
# def chat(req: ChatRequest):
#     try:
#         # Step 1: Intent detection bằng Ollama
#         intent_prompt = f"""
# Phân loại query: '{req.query}'.
# - Nếu hỏi gợi ý món/tìm món/công thức/tính calo món, intent='rag', extract ingredients (list str), tags (list str), cuisine (str or None), category (str or None), keyword (str or None).
# - Nếu hỏi sức khỏe chung/tính BMI/chế độ ăn, intent='general'.
# Output chỉ JSON: {{'intent': 'rag' or 'general', 'ingredients': [], 'tags': [], 'cuisine': None, 'category': None, 'keyword': None}}.
# """
#         print(f"[Debug] Intent Prompt: {intent_prompt}")
#         intent_response = requests.post(OLLAMA_URL, json={"model": MODEL, "prompt": intent_prompt, "stream": False}, timeout=30)
#         if intent_response.status_code != 200:
#             raise requests.exceptions.RequestException(f"Ollama returned status {intent_response.status_code}")
#         intent_data = json.loads(intent_response.json()["response"])

#         hits = []
#         if intent_data.get("intent") == "rag":
#             # Step 2: Retrieve hits từ Chroma
#             ingredients = intent_data.get("ingredients", [])
#             tags = intent_data.get("tags", [])
#             cuisine = intent_data.get("cuisine")
#             category = intent_data.get("category")
#             keyword = intent_data.get("keyword")

#             print(f"[Debug] Intent Data: {intent_data}")
#             if keyword:
#                 search_req = KeywordSearchRequest(keywords=keyword, tags=tags)
#                 results = search_by_keyword(search_req)
#                 hits = results["hits"]
#             else:
#                 search_req = SearchRequest(ingredients=ingredients, tags=tags, cuisine=cuisine, category=category)
#                 results = search(search_req)
#                 hits = results["hits"]

#         # Step 3: Augment & Generate với Ollama
#         hits_summary = "\n".join([f"Món: {h['name']}, short: {h['short']}, calories: {h['calories']}, rate: {h['rate']}, cuisine: {h['cuisine']}, category: {h['category']}. Link: [recipe/{h['id']}]" for h in hits]) if hits else "Không tìm thấy món phù hợp trong DB."
#         generate_prompt = f"""
# Dựa trên query người dùng: '{req.query}'.
# Nếu liên quan món ăn, dùng hits từ DB: {hits_summary}.
# Trả lời tiếng Việt rõ ràng, hấp dẫn. Gợi ý 2-7 món nếu cần, kèm calo/lợi ích sức khỏe, link [recipe/id] để xem công thức. Nếu tính calo, dùng data DB hoặc ước lượng. Nếu hỏi sức khỏe chung (BMI = cân nặng / (chiều cao m^2), gợi ý chế độ ăn), tự trả lời dựa kiến thức (không bịa data DB).
# Giữ response ngắn gọn, hữu ích.
# """
#         print(f"[Debug] Generate Prompt: {generate_prompt}")
#         generate_response = requests.post(OLLAMA_URL, json={"model": MODEL, "prompt": generate_prompt, "stream": False}, timeout=30)
#         if generate_response.status_code != 200:
#             raise requests.exceptions.RequestException(f"Ollama returned status {generate_response.status_code}")
#         response_text = generate_response.json()["response"]

#         return {"query": req.query, "response": response_text, "hits": hits}
#     except requests.exceptions.RequestException as e:
#         print(f"[Debug] Ollama Error: {e}")
#         return {"query": req.query, "response": f"Lỗi kết nối với AI: {str(e)}, vui lòng thử lại sau!", "hits": []}
#     except json.JSONDecodeError as e:
#         print(f"[Debug] JSON Error: {e}")
#         return {"query": req.query, "response": "Lỗi phân tích dữ liệu AI, vui lòng thử lại!", "hits": []}
#     except Exception as e:
#         print(f"[Debug] Error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))