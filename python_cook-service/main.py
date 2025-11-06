# main.py
from fastapi import FastAPI
from routes.api import router
from data.indexing import sync_recipes_to_chroma
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

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

# Ping endpoint for UptimeRobot
@app.get("/ping")
async def ping():
    return "Service is alive!"

# Lần đầu chạy
sync_recipes_to_chroma()

# Tự động reindex mỗi 1 giờ
scheduler = BackgroundScheduler()
scheduler.add_job(sync_recipes_to_chroma, 'interval', hours=1)
scheduler.start()

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)