from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init import init_db
from app.routers import attachments, auth, companies, records, sync
from app.routers import settings as settings_router

# Arranque no destructivo (Fase 0): crea tablas faltantes, conserva filas.
# Migraciones de esquema: Alembic desde Fase 2.
init_db()

app = FastAPI(title="Patty Apuntes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(attachments.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(sync.router, prefix="/api")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/health")
def api_health():
    return {"ok": True}
