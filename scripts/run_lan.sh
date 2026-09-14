#!/usr/bin/env bash
# Foliora en LAN (Fase 4): backend accesible en la red local, nunca en Internet.
# Uso: ./scripts/run_lan.sh
# Env: HOST PORT CORS_ORIGINS DATABASE_URL SECRET_KEY
set -euo pipefail
cd "$(dirname "$0")/../apps/backend"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-8000}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"
.venv/bin/alembic upgrade head
exec .venv/bin/uvicorn app.main:app --host "$HOST" --port "$PORT"
