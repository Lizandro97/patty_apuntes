from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.db.session import Base, engine
from app.routers import archivos, auth, config, empresas

# ensure schema (create + migrate lightweight for dev)
Base.metadata.create_all(bind=engine)
# add new columns if missing (SQLite no IF NOT EXISTS in older versions -> try/except)
with engine.begin() as conn:
    try:
        cols = {r[1] for r in conn.execute(text("PRAGMA table_info(celdas)")).fetchall()}
        if "color" not in cols:
            conn.execute(text("ALTER TABLE celdas ADD COLUMN color VARCHAR"))
        if "style" not in cols:
            conn.execute(text("ALTER TABLE celdas ADD COLUMN style JSON"))
    except Exception:
        pass
    try:
        a_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(archivos)")).fetchall()}
        if "personal_count" not in a_cols:
            conn.execute(text("ALTER TABLE archivos ADD COLUMN personal_count INTEGER DEFAULT 2"))
    except Exception:
        pass
    # ensure archivo_filas table exists (create_all already did, but double-check)
    try:
        insp = inspect(engine)
        if "archivo_filas" not in insp.get_table_names():
            # fallback: create it
            from app.models.archivo_fila import ArchivoFila  # noqa: F401

            Base.metadata.create_all(bind=engine)
    except Exception:
        pass

app = FastAPI(title="Patty Apuntes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(empresas.router, prefix="/api")
app.include_router(archivos.router, prefix="/api")
app.include_router(config.router, prefix="/api")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/health")
def api_health():
    return {"ok": True}
