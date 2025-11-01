# data/indexing.py
from data.db import load_recipes, collection, embed_model, json_util, ingredients_col, tags_col, cuisines_col, categories_col
from fastapi import HTTPException
from bson import ObjectId
import json
import time
from unidecode import unidecode

def build_cache():
    """Cache lookup nhanh cho ingredients, tags, cuisines, categories"""
    return {
        "ingredients": {str(i["_id"]): i["name"] for i in ingredients_col.find()},
        "tags": {str(t["_id"]): t["name"] for t in tags_col.find()},
        "cuisines": {str(c["_id"]): c["name"] for c in cuisines_col.find()},
        "categories": {str(c["_id"]): c["name"] for c in categories_col.find()},
    }

def resolve_names(r, cache):
    """Trích tên từ cache"""
    ing_names = [cache["ingredients"].get(str(oid), "") for oid in r.get("ingredients", [])]
    tag_names = [cache["tags"].get(str(oid), "") for oid in r.get("tags", [])]
    cuisine_name = cache["cuisines"].get(str(r.get("cuisine")), "")
    category_name = cache["categories"].get(str(r.get("category")), "")
    return ing_names, tag_names, cuisine_name, category_name

def generate_text_and_meta(r, cache):
    """
    Sinh văn bản và metadata cho 1 recipe với trọng số cao cho tên món.
    Cải thiện indexing để tìm kiếm chính xác hơn như Google.
    """
    ing_names, tag_names, cuisine_name, category_name = resolve_names(r, cache)
    ingredients_str = ", ".join(ing_names)
    tags_str = ", ".join(tag_names)
    instructions_str = json.dumps(r.get("instructions", []), default=json_util.default)

    # Tăng trọng số cho tên món bằng cách lặp lại 3 lần
    # Điều này giúp embedding model học rằng tên món quan trọng nhất
    name = r['name']
    name_lowercase = r.get('nameLowercase', name.lower())
    name_no_accent = unidecode(name_lowercase)
    
    # Format text với trọng số cao cho tên món
    text = (
        f"{name}. {name}. {name}. "  # Lặp lại 3 lần để tăng trọng số
        f"Món ăn: {name}. "
        f"Cuisine: {cuisine_name}. Category: {category_name}. "
        f"Tags: {tags_str}. "
        f"Nguyên liệu: {ingredients_str}. "
        f"Tóm tắt: {r.get('short', '')}. "
        f"Calories: {r.get('calories', 0)}."
    )

    # Lưu thêm các trường để matching chính xác
    meta = {
        "id": r["id"],
        "name": r["name"],
        "nameLowercase": name_lowercase,
        "nameNoAccent": name_no_accent,  # Thêm version không dấu
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
        "cuisine": cuisine_name,
        "cuisineLowercase": cuisine_name.lower(),
        "category": category_name,
        "categoryLowercase": category_name.lower(),
        "rate": r.get("rate", 0.0),
        "numberOfRate": r.get("numberOfRate", 0),
        "updatedAt": str(r.get("updatedAt", ""))  # để so sánh lần sau
    }
    return text, meta


def sync_recipes_to_chroma():
    """Đồng bộ MongoDB ↔ ChromaDB (tự động thêm/sửa/xóa)"""
    try:
        start = time.time()
        cache = build_cache()
        recipes = load_recipes()

        # Lấy toàn bộ ID & metadata hiện tại từ Chroma
        chroma_data = collection.get()
        chroma_map = {m["id"]: m for m in chroma_data["metadatas"]}

        mongo_ids = {r["id"] for r in recipes}
        chroma_ids = set(chroma_map.keys())

        new_or_updated, deleted_ids = [], []

        for r in recipes:
            rid = str(r["id"])
            r_updated = str(r.get("updatedAt", ""))
            chroma_meta = chroma_map.get(rid)

            # Nếu chưa có hoặc updatedAt khác thì cần update
            if not chroma_meta or chroma_meta.get("updatedAt") != r_updated:
                new_or_updated.append(r)

        # Các bản ghi bị xóa trong Mongo
        deleted_ids = list(chroma_ids - mongo_ids)

        if new_or_updated:
            print(f"[Sync] 🆕 Updating {len(new_or_updated)} recipes...")
            texts, metas, ids = [], [], []
            for r in new_or_updated:
                text, meta = generate_text_and_meta(r, cache)
                texts.append(text)
                metas.append(meta)
                ids.append(r["id"])

            embeddings = embed_model.encode(texts, batch_size=32, show_progress_bar=False)
            collection.upsert(ids=ids, documents=texts, metadatas=metas, embeddings=embeddings)

        if deleted_ids:
            collection.delete(ids=deleted_ids)
            print(f"[Sync] 🗑 Deleted {len(deleted_ids)} recipes.")

        print(f"[Sync] ✅ Done. Added/updated: {len(new_or_updated)}, deleted: {len(deleted_ids)}. ({round(time.time()-start,2)}s)")
    except Exception as e:
        print(f"[Sync] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))





















# def get_name_from_id(col, oid):
#     if not oid:
#         return ""
#     try:
#         if isinstance(oid, str):
#             oid = ObjectId(oid)
#         doc = col.find_one({"_id": oid})
#         return doc["name"] if doc and "name" in doc else ""
#     except Exception:
#         return ""
    
# def get_names_from_ids(col, oid_list):
#     if not oid_list:
#         return []
#     names = []
#     for oid in oid_list:
#         names.append(get_name_from_id(col, oid))
#     return [n for n in names if n]

# def load_and_index(force_reindex=False):
#     try:
#         if force_reindex or collection.count() == 0:
#             recipes = load_recipes()
#             ids, docs, metas, embs = [], [], [], []
#             for r in recipes:
#                 if not isinstance(r, dict) or "name" not in r or "id" not in r:
#                     print(f"[Index] Skipping invalid recipe (missing name or id): {r}")
#                     continue
                
#                 rid = r["id"]

#                 # Resolve refs
#                 ingredient_names = get_names_from_ids(ingredients_col, r.get("ingredients", []))
#                 tag_names = get_names_from_ids(tags_col, r.get("tags", []))
#                 cuisine_name = get_name_from_id(cuisines_col, r.get("cuisine"))
#                 category_name = get_name_from_id(categories_col, r.get("category"))

#                 ingredients_str = ", ".join(ingredient_names)
#                 tags_str = ", ".join(tag_names)
#                 instructions = r.get("instructions", [])
#                 instructions_str = json.dumps(instructions, default=json_util.default)

#                 # ingredients_str = ", ".join(r.get("ingredients", []))
#                 # tags_str = ", ".join(r.get("tags", []))
#                 # instructions = r.get("instructions", [])
#                 # instructions_str = json.dumps(instructions, default=json_util.default)

#                 text = f"{r['name']}. Nguyên liệu: {ingredients_str}. Tags: {tags_str}. Tóm tắt: {r.get('short','')}. Cuisine: {r.get('cuisine','')}. Category: {r.get('category','')}. Calories: {r.get('calories',0)}."
                
#                 emb = embed_model.encode(text).tolist()
                
#                 ids.append(str(rid))
#                 docs.append(text)
#                 metas.append({
#                     "id": rid,
#                     "name": r["name"],
#                     "short": r.get("short", ""),
#                     "ingredients": ingredients_str,
#                     "tags": tags_str,
#                     "instructions": instructions_str,
#                     "image": r.get("image", ""),
#                     "video": r.get("video", ""),
#                     "calories": r.get("calories", 0),
#                     "time": r.get("time", ""),
#                     "size": r.get("size", ""),
#                     "difficulty": r.get("difficulty", ""),
#                     # "cuisine": r.get("cuisine", ""),
#                     # "category": r.get("category", ""),
#                     "cuisine": cuisine_name,
#                     "category": category_name,
#                     "rate": r.get("rate", 0.0),
#                     "numberOfRate": r.get("numberOfRate", 0)
#                 })
#                 embs.append(emb)
            
#             collection.upsert(ids=ids, documents=docs, metadatas=metas, embeddings=embs)
#             print(f"[Index] Indexed {len(ids)} recipes from MongoDB")
#         else:
#             print(f"[Index] Collection already has {collection.count()} items")
#     except Exception as e:
#         print(f"[Index] Error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))