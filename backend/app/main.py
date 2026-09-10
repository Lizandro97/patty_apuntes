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
    try:
        f_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(archivo_filas)")).fetchall()}
        if "responsable" not in f_cols:
            conn.execute(text("ALTER TABLE archivo_filas ADD COLUMN responsable VARCHAR"))
        if "observacion" not in f_cols:
            conn.execute(text("ALTER TABLE archivo_filas ADD COLUMN observacion VARCHAR"))
    except Exception:
        pass
    # migrate celdas: key months by fila_id so rows work without empresa.
    # Shared-empresa cells are duplicated per fila (same state), nobody loses checks.
    try:
        import uuid as _uuid

        c_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(celdas)")).fetchall()}
        if "fila_id" not in c_cols:
            conn.execute(
                text(
                    """
                CREATE TABLE celdas_new (
                    id VARCHAR PRIMARY KEY,
                    archivo_id VARCHAR NOT NULL,
                    fila_id VARCHAR NOT NULL,
                    empresa_id VARCHAR,
                    anio INTEGER NOT NULL,
                    mes INTEGER NOT NULL,
                    revisado BOOLEAN DEFAULT 0,
                    responsable VARCHAR,
                    fecha_revision DATE,
                    observacion VARCHAR,
                    color VARCHAR,
                    style JSON,
                    CONSTRAINT uq_celda_fila UNIQUE (archivo_id, fila_id, anio, mes)
                )
                """
                )
            )
            old_rows = conn.execute(
                text(
                    "SELECT archivo_id, empresa_id, anio, mes, revisado, responsable,"
                    " fecha_revision, observacion, color, style FROM celdas"
                )
            ).fetchall()
            filas_by_key: dict = {}
            for fr in conn.execute(
                text("SELECT id, archivo_id, empresa_id FROM archivo_filas")
            ).fetchall():
                filas_by_key.setdefault((fr[1], fr[2]), []).append(fr[0])
            for cr in old_rows:
                for fid in filas_by_key.get((cr[0], cr[1]), []):
                    conn.execute(
                        text(
                            "INSERT INTO celdas_new (id, archivo_id, fila_id, empresa_id,"
                            " anio, mes, revisado, responsable, fecha_revision,"
                            " observacion, color, style)"
                            " VALUES (:id, :aid, :fid, :eid, :y, :m, :rev, :resp,"
                            " :fecha, :obs, :color, :style)"
                        ),
                        {
                            "id": str(_uuid.uuid4()),
                            "aid": cr[0],
                            "fid": fid,
                            "eid": cr[1],
                            "y": cr[2],
                            "m": cr[3],
                            "rev": cr[4],
                            "resp": cr[5],
                            "fecha": cr[6],
                            "obs": cr[7],
                            "color": cr[8],
                            "style": cr[9],
                        },
                    )
            conn.execute(text("DROP TABLE celdas"))
            conn.execute(text("ALTER TABLE celdas_new RENAME TO celdas"))
            conn.execute(text("CREATE INDEX ix_celdas_archivo_id ON celdas (archivo_id)"))
            conn.execute(text("CREATE INDEX ix_celdas_fila_id ON celdas (fila_id)"))
            conn.execute(text("CREATE INDEX ix_celdas_empresa_id ON celdas (empresa_id)"))
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
