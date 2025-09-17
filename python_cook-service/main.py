# main.py
from fastapi import FastAPI
from routes.api import router
from data.indexing import load_and_index
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Recipe Search Service")

# Thêm CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ["http://localhost:5173"] nếu muốn hạn chế
    allow_credentials=True,
    allow_methods=["*"],  # cho phép tất cả method: GET, POST, OPTIONS,...
    allow_headers=["*"],  # cho phép tất cả headers
)

# Include router
app.include_router(router, prefix="/api", tags=["recipe"])

# Khởi động: Index nếu rỗng
load_and_index()

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)