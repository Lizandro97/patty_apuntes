import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.init import init_db
from app.routers import attachments, auth, companies, records, sync
from app.routers import settings as settings_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Non-destructive startup: creates missing tables, keeps rows.
    # Schema migrations: Alembic (+ light ALTERs in init_db).
    init_db()
    yield


app = FastAPI(title="Patty Apuntes API", version="1.0.0", lifespan=lifespan)

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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "message": "Invalid data", "errors": exc.errors()},
    )


@app.exception_handler(SQLAlchemyError)
async def db_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("Database error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"code": "DB_ERROR", "message": "Internal error"})


@app.get("/health", include_in_schema=False)
@app.get("/api/health")
def health():
    return {"ok": True}
