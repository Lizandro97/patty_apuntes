from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.session import Base, engine
from app.routers import auth, companies, records, settings

# ensure schema (English-only): wipe legacy Spanish tables and all old rows,
# then create the fresh schema. Old databases start clean by design.
with engine.begin() as conn:
    for _old in (
        "archivos",
        "archivo_filas",
        "celdas",
        "empresas",
        "archivo_diseno",
        "configuraciones",
    ):
        try:
            conn.execute(text(f'DROP TABLE IF EXISTS "{_old}"'))
        except Exception:
            pass
    try:
        conn.execute(text("DELETE FROM users"))
    except Exception:
        pass

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Patty Apuntes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/health")
def api_health():
    return {"ok": True}
