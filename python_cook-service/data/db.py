from pymongo import MongoClient
import chromadb
from sentence_transformers import SentenceTransformer
from fastapi import HTTPException
from config.settings import settings
from bson import json_util

# Kết nối MongoDB
mongo_client = MongoClient(settings.MONGODB_URI)
db = mongo_client[settings.DB_NAME]
mongo_collection = db[settings.COLLECTION_NAME]

# Kết nối ChromaDB
client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
collection = client.get_or_create_collection(name=settings.COLLECTION_NAME)

# Embedding model
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

def load_recipes():
    try:
        recipes = list(mongo_collection.find())
        for r in recipes:
            if "_id" in r:
                r["id"] = str(r["_id"])
                del r["_id"]
            else:
                print(f"[MongoDB] Warning: Document without _id: {r}")
        return recipes
    except Exception as e:
        print(f"[MongoDB] Error loading recipes: {e}")
        raise HTTPException(status_code=500, detail=str(e))