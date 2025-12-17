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
    - KHÔNG dùng vector search (không cần semantic cho ingredient matching)
    - Filtering chính xác: Chỉ trả về món có TỈ LỆ MATCH ≥ 60%
    - Ưu tiên món ít nguyên liệu (3/5 > 3/10)
    - Sắp xếp theo: Match ratio → Số nguyên liệu khớp → Popularity
    """
    try:
        if not req.ingredients:
            return {"query": "No ingredients provided", "hits": []}
        
        print(f"[Search Ingredients] User ingredients: {req.ingredients}")

        # Chuẩn hóa user ingredients
        user_ings = set(ing.strip().lower() for ing in req.ingredients)
        
        # Lấy TẤT CẢ recipes từ ChromaDB (không dùng vector search)
        results = collection.get(include=["metadatas"])

        hits = []
        if results and results.get("ids"):
            for i, rid in enumerate(results["ids"]):
                meta = results["metadatas"][i]
                
                # Parse ingredients và tags từ recipe
                hit_ings = set(ing.strip().lower() for ing in meta.get("ingredients", "").split(", ") if ing.strip())
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

                # === INGREDIENT MATCHING ===
                matched_ings = user_ings.intersection(hit_ings)
                matched_count = len(matched_ings)
                total_ings = len(hit_ings)
                
                # TỈ LỆ MATCH: Số nguyên liệu user có / Tổng nguyên liệu của món
                match_ratio = matched_count / total_ings if total_ings > 0 else 0
                
                # USER COVERAGE: Bao nhiêu % nguyên liệu user được sử dụng
                user_coverage = matched_count / len(user_ings) if user_ings else 0
                
                # === NGƯỠNG LỌC ===
                # Rule 1: Món PHẢI match ít nhất 60% tổng nguyên liệu
                MIN_MATCH_RATIO = 0.6  # 60%
                if match_ratio < MIN_MATCH_RATIO:
                    print(f"[Search] ❌ Skip '{meta.get('name')}' - Match {matched_count}/{total_ings} = {match_ratio*100:.0f}% < {MIN_MATCH_RATIO*100:.0f}%")
                    continue
                
                # Rule 2: Hoặc món match ít nhất 80% nguyên liệu user nhập (cho phép user nhập thêm 1-2 thứ)
                MIN_USER_COVERAGE = 0.8  # 80%
                if user_coverage < MIN_USER_COVERAGE and match_ratio < 0.8:
                    print(f"[Search] ❌ Skip '{meta.get('name')}' - User coverage {matched_count}/{len(user_ings)} = {user_coverage*100:.0f}% < {MIN_USER_COVERAGE*100:.0f}%")
                    continue
                
                print(f"[Search] ✅ Match '{meta.get('name')}' - {matched_count}/{total_ings} ({match_ratio*100:.0f}%), user coverage: {user_coverage*100:.0f}%")

                # === SCORING ===
                # 1. Match ratio score (càng cao càng tốt)
                ratio_score = match_ratio * 1000
                
                # 2. Matched count score (càng nhiều càng tốt)
                count_score = matched_count * 50
                
                # 3. Recipe size penalty (ưu tiên món ít nguyên liệu hơn)
                # Món 3/5 nguyên liệu > Món 3/10 nguyên liệu
                size_penalty = -total_ings * 5
                
                # 4. User coverage bonus (sử dụng hết nguyên liệu user có)
                coverage_bonus = user_coverage * 200
                
                # 5. Popularity score (rating thấp để không ảnh hưởng nhiều)
                rate = meta.get("rate", 0.0)
                num_rates = meta.get("numberOfRate", 0)
                popularity_score = (rate / 5.0) * math.log(1 + num_rates) * 30

                # === TỔNG HỢP ===
                relevance_score = (
                    ratio_score +           # Ưu tiên cao nhất: Tỉ lệ match
                    count_score +           # Số lượng nguyên liệu khớp
                    size_penalty +          # Penalty cho món nhiều nguyên liệu
                    coverage_bonus +        # Bonus cho sử dụng hết nguyên liệu user có
                    popularity_score        # Popularity (thấp)
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
                    "relevance_score": relevance_score,
                    "match_ratio": match_ratio,
                    "matched_count": matched_count,
                    "total_ingredients": total_ings,
                    "user_coverage": user_coverage
                })

        # Sort theo: 1. Match ratio, 2. Matched count, 3. Popularity
        hits = sorted(hits, key=lambda x: (x["match_ratio"], x["matched_count"], x["rate"]), reverse=True)[:req.top_k]
        
        print(f"[Search Ingredients] Found {len(hits)} results with match_ratio ≥ {0.6*100:.0f}%")

        return {"query": f"Ingredients: {', '.join(req.ingredients)}", "hits": hits}
    except Exception as e:
        print(f"[Search] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search/search-by-keyword")
def search_by_keyword(req: KeywordSearchRequest):
    """
    🔍 HYBRID SEARCH - Kết hợp Text Matching + Vector Search:
    
    1. **Vector Search (Semantic)**: Tìm món ăn có nghĩa tương tự
       - "gà chiên" → "gà rán", "gà giòn", "gà KFC"
       - "phở bò" → "phở tái", "phở nạm", "bún bò"
       - Trọng số cao (3.0) để khai thác sức mạnh AI
    
    2. **Text Matching (Lexical)**: Đảm bảo độ chính xác
       - Exact match: Khớp 100% (điểm cao)
       - Phrase match: Chuỗi từ liên tiếp
       - Word match: Từng từ riêng lẻ
       - Trọng số vừa phải (2.0)
    
    3. **Filtering**: Tags, Cuisine, Category
    
    → Kết quả: Vừa chính xác (text) vừa thông minh (vector)
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

        print(f"[Search Keyword] Query: '{keywords}' → Normalized: {keyword_list}")

        # Heuristic: action words (e.g., 'xào') should appear in result names
        # Map query action tokens to allowed synonyms in names
        action_map = {
            "xao": {"xao", "chien", "ran"},
            "xào": {"xao", "chien", "ran"},
            "chien": {"chien", "ran"},
            "rán": {"ran", "chien"},
            "ran": {"ran", "chien"}
        }
        query_actions = {tok for tok in keyword_list if tok in action_map}

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
        MIN_VECTOR_SCORE = 500  # Tăng ngưỡng: yêu cầu tương đồng ngữ nghĩa mạnh hơn
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

                # === VECTOR SEARCH - SEMANTIC SIMILARITY ===
                # Đây là phần QUAN TRỌNG NHẤT - AI hiểu nghĩa của query
                distance = results["distances"][0][i]
                # Chuyển distance → similarity score (distance càng nhỏ = càng giống)
                vector_score = 1000 / (1 + distance * 2) if distance >= 0 else 0
                
                print(f"[Vector] '{meta.get('name')}' - distance={distance:.3f}, vector_score={vector_score:.1f}")

                # === TEXT MATCHING - LEXICAL PRECISION ===
                # Đảm bảo độ chính xác bằng text matching
                name = meta.get('name', '')
                name_lower = meta.get('nameLowercase', name.lower())
                name_no_accent = meta.get('nameNoAccent', unidecode(name_lower))
                short = meta.get('short', '').lower()
                short_no_accent = unidecode(short)
                
                # 1. EXACT MATCH - Khớp 100%
                exact_match_score = 0
                if keywords_no_accent == name_no_accent:
                    exact_match_score = 1000
                    print(f"[Text] ✅ EXACT MATCH: '{name}'")
                elif keywords_lower == name_lower:
                    exact_match_score = 900
                
                # 2. PHRASE MATCH - Chuỗi từ xuất hiện liên tiếp
                phrase_match_score = 0
                if len(keyword_list) >= 2:
                    query_phrase = " ".join(keyword_list)
                    if query_phrase in name_no_accent:
                        phrase_match_score = 500
                        print(f"[Text] ✅ PHRASE MATCH in name: '{name}'")
                    elif query_phrase in short_no_accent:
                        phrase_match_score = 200
                
                # 3. WORD MATCH - Từng từ riêng lẻ
                name_words = set(name_no_accent.split())
                matched_in_name = sum(1 for kw in keyword_list if kw in name_words)
                
                word_match_score = 0
                if matched_in_name > 0:
                    match_percentage = matched_in_name / len(keyword_list)
                    word_match_score = match_percentage * 300
                    print(f"[Text] Words matched: {matched_in_name}/{len(keyword_list)} in '{name}'")
                
                # TEXT MATCHING TOTAL
                text_match_score = exact_match_score + phrase_match_score + word_match_score
                
                # === POPULARITY SCORE ===
                rate = meta.get("rate", 0.0)
                num_rates = meta.get("numberOfRate", 0)
                popularity_score = (rate / 5.0) * math.log(1 + num_rates) * 50

                # === ACTION WORD HEURISTIC ===
                # If query contains an action word (e.g., 'xao'), ensure name includes a synonym
                action_required = len(query_actions) > 0
                action_ok = True
                if action_required:
                    action_ok = False
                    for act in query_actions:
                        synonyms = action_map.get(act, set())
                        if any(syn in name_no_accent for syn in synonyms) or any(syn in short_no_accent for syn in synonyms):
                            action_ok = True
                            break

                # === TỔNG HỢP ĐIỂM (HYBRID APPROACH) ===
                # 🎯 Công thức cân bằng giữa Text và Vector
                # 
                # Vector (3.0): Tìm món tương tự về nghĩa - Cao nhất để khai thác AI
                # Text (2.0): Đảm bảo chính xác - Exact match được ưu tiên
                # Popularity (0.5): Boost nhẹ - Món ngon, nhiều đánh giá
                
                relevance_score = (
                    text_match_score * 2.0 +       # Text matching
                    vector_score * 3.0 +           # 🔥 VECTOR SEARCH - Trọng số cao nhất
                    popularity_score * 0.5         # Popularity boost
                )
                
                # === RELEVANCE FILTERS ===
                # Yêu cầu: hoặc text mạnh, hoặc vector đủ mạnh
                short_query = len(keyword_list) <= 2
                name_match_pct = (matched_in_name / len(keyword_list)) if len(keyword_list) > 0 else 0.0
                required_pct = 1.0 if short_query else 0.6
                strong_text = (
                    exact_match_score > 0 or
                    phrase_match_score > 0 or
                    name_match_pct >= required_pct
                )

                if relevance_score <= 0:
                    continue
                # Với truy vấn ngắn (≤2 từ), yêu cầu đủ từ khóa trong tên nếu không có exact/phrase
                if short_query and not (exact_match_score > 0 or phrase_match_score > 0 or name_match_pct >= 1.0):
                    continue
                if not strong_text and vector_score < MIN_VECTOR_SCORE:
                    # Too weak semantically and lexically
                    continue
                if action_required and not action_ok:
                    # Query asked for an action (e.g., 'xào') but name doesn't reflect it
                    continue
                
                print(f"[Score] '{meta.get('name')}' → Total={relevance_score:.1f} (text={text_match_score:.0f}, vector={vector_score:.1f})")

                # Build response
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
                    "vector_score": vector_score,
                    "text_score": text_match_score
                })

        # Sort theo relevance_score giảm dần và áp dụng top_k
        hits = sorted(hits, key=lambda x: x["relevance_score"], reverse=True)[:req.top_k]
        
        print(f"[Search Keyword] Found {len(hits)} results")
        if hits:
            print(f"[Search Keyword] Top result: '{hits[0]['name']}' (total={hits[0]['relevance_score']:.1f}, vector={hits[0]['vector_score']:.1f}, text={hits[0]['text_score']:.1f})")

        return {"query": keywords, "hits": hits}
    except Exception as e:
        print(f"[Search] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/reindex")
async def reindex_data():
    sync_recipes_to_chroma()
    return {"message": "Reindex completed"}