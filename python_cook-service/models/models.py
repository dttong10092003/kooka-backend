from pydantic import BaseModel
from typing import List, Optional

class SearchRequest(BaseModel):
    ingredients: List[str] = []
    tags: List[str] = []
    cuisine: Optional[str] = None
    category: Optional[str] = None
    top_k: int = 20

class KeywordSearchRequest(BaseModel):
    keywords: str = ""  # Chuỗi từ khóa (ví dụ: "phở bò" hoặc "thịt bò")
    tags: List[str] = []  # Danh sách tags để filter
    cuisine: Optional[str] = None  # Thêm cuisine (tuỳ chọn)
    category: Optional[str] = None  # Thêm category (tuỳ chọn)
    top_k: int = 20  # Số kết quả tối đa