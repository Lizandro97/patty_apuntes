# Backend image for Hugging Face Spaces (Docker SDK, free CPU).
# HF exposes the app on port 7860 and rebuilds on every git push.
FROM python:3.14-slim

WORKDIR /app

COPY apps/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/backend/ ./

EXPOSE 7860

# Fresh database (Neon): create schema, apply evolutions, then serve.
# Runtime config comes from Space secrets: DATABASE_URL, SECRET_KEY, CORS_ORIGINS.
CMD ["sh", "-c", "python -c 'from app.db.init import init_db; init_db()' && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 7860"]
