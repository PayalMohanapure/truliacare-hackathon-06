# backend/main.py — OWNER: Dev 4. FROZEN AT MINUTE 15. Nobody edits this after that.
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from db import Base, engine
import models  # noqa: F401 — registers tables on Base
from routers import requests as requests_router
from routers import admin as admin_router

# Postgres: no-op (tables already created by 001_init.sql).
# SQLite fallback: builds the whole schema. This one line IS the fallback mechanism.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SENTINEL — Hospital Maintenance & Escalation", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # hackathon. X-User-Id is a custom header —
    allow_credentials=False,   # allow_headers=["*"] is what makes the preflight pass.
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    e = exc.errors()[0]
    field = ".".join(str(p) for p in e["loc"] if p not in ("body", "query"))
    return JSONResponse(status_code=422, content={"error": f"{field}: {e['msg']}"})


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    print(f"[UNHANDLED] {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


app.include_router(requests_router.router, prefix="/api", tags=["requests"])
app.include_router(admin_router.router, prefix="/api", tags=["admin"])


@app.get("/")
def root():
    return {"status": "ok", "service": "SENTINEL"}


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}

