# Patty Apuntes — SPA contable

Replica de la imagen de referencia adaptada a SPA configurable.

## Stack
- **Frontend:** Vite + React 19 + TS + React Router + Zustand + TanStack Query + Tailwind 3.4 + Bun
- **Backend:** FastAPI + SQLAlchemy 2.0 + Alembic + SQLite (migrable a Postgres) + JWT (localStorage) + uv + Python 3.14 + Ruff

## Estructura
```
frontend/  -> Vite SPA (bun run dev en :5173)
backend/   -> FastAPI (uv run uvicorn app.main:app --port 8000) — .venv Python 3.14 gestionado por uv
  app/models: User, Empresa, Archivo, Celda (normalizada: archivo_id/empresa_id/anio/mes/revisado), Configuracion
  DATABASE_URL = sqlite:///./patty.db (cambiar a postgresql+psycopg2://... para migrar)
```

## Backend — uv + Ruff
```bash
cd backend
uv venv --python 3.14        # ya creado en backend/.venv
uv sync --group dev          # instala deps + ruff
uv run ruff check app/       # linter
uv run ruff format app/      # formatter
uv run ruff check app/ --fix # auto-fix
uv run uvicorn app.main:app --port 8000 --reload
```

## Frontend
```bash
cd frontend
bun install
bun run dev      # :5173 proxy /api -> :8000
bun run build
```

## API (aislado por user_id, sin roles)
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/empresas` (CRUD inline)
- `GET/POST/GET/:id/PUT/:id/DELETE/:id /api/archivos` + `POST /:id/duplicate`
- `GET /api/archivos/:id/celdas` (auto-crea 12*años por empresa), `PUT /api/archivos/celdas/:id` (toggle revisado), `GET /:id/stats`
- `GET/PUT /api/config` (primary_color, font, density, grid_columns 2-6, visible_fields)
- `GET /api/archivos/:id/export?format=pdf|excel` (ReportLab / openpyxl, backend streaming)

## Frontend rutas
`/login` `/register` (centrado) | Header+Sidebar layout: `/` Inicio (actividad reciente + % avance), `/empresas` tabla inline, `/archivos` grid tarjetas configurable, `/editor` `/editor/:id` matriz Año/Meses + panel Personalización vivo, `/configuracion` defaults globales (CSS vars --primary, --font-family, etc.)

## Notas migración DB
SQLAlchemy `create_engine(settings.DATABASE_URL)` sin SQL raw; `alembic` desde día 1; `JSON` type mapea a TEXT en SQLite y JSONB en Postgres.

## Ideas extra propuestas (a evaluar)
Duplicar como plantilla, Import/Export Excel, filtros + ordenar, comentarios por celda, historial auditoría, atajos teclado, PWA offline.
