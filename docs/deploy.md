# Despliegue: Pages + Render + Neon (rama `chore/postgres-neon`)

Arquitectura: **Cloudflare Pages (React)** → **Render (FastAPI)** → **Neon (PostgreSQL)**.

## 1. Neon (base limpia)
1. Crear proyecto Postgres en Neon (plan free).
2. Copiar dos URLs: **pooled** (runtime) y **direct** (migraciones).
3. Sin importar `patty.db`: la base arranca vacía. El arranque crea el esquema con `init_db()` (create_all) y luego aplica `alembic upgrade head` — en ese orden, porque el baseline es no-op por diseño y las revisiones Fase 2+ asumen tablas existentes.

## 2. Render (backend)
- Servicio web Python con `render.yaml` (raíz): instala `apps/backend/requirements.txt` y arranca con `init_db()` + `alembic upgrade head` + `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Health check: `/health`.
- Variables de entorno (todas `sync: false`, se ponen en el dashboard):
  - `DATABASE_URL`: URL **pooled** de Neon (tal cual la da Neon; la app normaliza el esquema y exige `sslmode=require`, ver `app/core/config.py`).
  - `SECRET_KEY`: secreto largo generado (nunca el default efímero de dev).
  - `CORS_ORIGINS`: `https://<tu-app>.pages.dev` (la SPA). Sin esto el navegador bloquea `/api`.
- Pooling: `pool_size=5, max_overflow=5, pool_pre_ping=True` (`app/db/session.py`) por los límites de Neon free.
- Nota LAN: `scripts/run_lan.sh` sigue siendo solo desarrollo local; no se usa en Render.

## 3. Cloudflare Pages (frontend)
- Build: `bun install && bun run build` en `apps/web`.
- Variable de build: `VITE_API_URL=https://<tu-backend>.onrender.com/api`.
- `public/_redirects` (`/* /index.html 200`) resuelve el routing SPA.
- Tras cambiar `VITE_API_URL`, re-desplegar (queda compilada en el bundle).

## 4. Limitaciones conocidas
- **Adjuntos efímeros**: en Render free `ATTACH_DIR` es disco local y se pierde en cada redeploy; la metadata vive en Neon pero los bytes no. Para persistencia real, migrar a R2/S3.
- **Render free duerme**: primera petición tras inactividad es lenta.
- **Neon free**: conexiones y almacenamiento limitados; no subir el pool sin revisar.

## 5. Desarrollo local sin cambios
- Default sigue SQLite (`sqlite:///./patty.db`); tests usan SQLite temporal (`tests/conftest.py`). Contra Postgres local: `init_db()` primero y luego `alembic upgrade head` (ver §1), después `pytest`.
