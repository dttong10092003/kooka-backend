FROM python:3.12-slim

WORKDIR /app

# --- Cài công cụ hệ thống cần thiết ---
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# --- Copy requirements trước để Docker cache pip layer ---
COPY requirements.txt .

# --- Nâng cấp pip và cài dependencies ---
# ✅ Tải torch từ index CPU chính thức của PyTorch
RUN pip install --upgrade pip && \
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r requirements.txt

# --- Copy code sau (để không làm mất cache của pip install) ---
COPY . .

# --- Thiết lập môi trường ---
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# --- Chạy ứng dụng FastAPI ---
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
