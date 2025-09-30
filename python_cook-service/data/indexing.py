# data/indexing.py
from data.db import load_recipes, collection, embed_model, json_util, ingredients_col, tags_col, cuisines_col, categories_col
from fastapi import HTTPException
from bson import ObjectId
import json

def get_name_from_id(col, oid):
    if not oid:
        return ""
    try:
        if isinstance(oid, str):
            oid = ObjectId(oid)
        doc = col.find_one({"_id": oid})
        return doc["name"] if doc and "name" in doc else ""
    except Exception:
        return ""
    
def get_names_from_ids(col, oid_list):
    if not oid_list:
        return []
    names = []
    for oid in oid_list:
        names.append(get_name_from_id(col, oid))
    return [n for n in names if n]

def load_and_index(force_reindex=False):
    try:
        if force_reindex or collection.count() == 0:
            recipes = load_recipes()
            ids, docs, metas, embs = [], [], [], []
            for r in recipes:
                if not isinstance(r, dict) or "name" not in r or "id" not in r:
                    print(f"[Index] Skipping invalid recipe (missing name or id): {r}")
                    continue
                
                rid = r["id"]

                # Resolve refs
                ingredient_names = get_names_from_ids(ingredients_col, r.get("ingredients", []))
                tag_names = get_names_from_ids(tags_col, r.get("tags", []))
                cuisine_name = get_name_from_id(cuisines_col, r.get("cuisine"))
                category_name = get_name_from_id(categories_col, r.get("category"))

                ingredients_str = ", ".join(ingredient_names)
                tags_str = ", ".join(tag_names)
                instructions = r.get("instructions", [])
                instructions_str = json.dumps(instructions, default=json_util.default)

                # ingredients_str = ", ".join(r.get("ingredients", []))
                # tags_str = ", ".join(r.get("tags", []))
                # instructions = r.get("instructions", [])
                # instructions_str = json.dumps(instructions, default=json_util.default)

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
                    # "cuisine": r.get("cuisine", ""),
                    # "category": r.get("category", ""),
                    "cuisine": cuisine_name,
                    "category": category_name,
                    "rate": r.get("rate", 0.0),
                    "numberOfRate": r.get("numberOfRate", 0)
                })
                embs.append(emb)
            
            collection.upsert(ids=ids, documents=docs, metadatas=metas, embeddings=embs)
            print(f"[Index] Indexed {len(ids)} recipes from MongoDB")
        else:
            print(f"[Index] Collection already has {collection.count()} items")
    except Exception as e:
        print(f"[Index] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))