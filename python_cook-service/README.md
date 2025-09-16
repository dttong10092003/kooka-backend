Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Cách vào venv (Dùng với CMD)
    venv\Scripts\activate
Thoát khỏi venv
    deactivate

uvicorn main:app --reload --port 8000

uvicorn main:app --reload

Không push folder venv


