from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db import Base, engine
import models  # noqa: F401 — registers models on Base before create_all
from routers import requests as requests_router
from routers import admin as admin_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SENTINEL — Smart Maintenance Request & Escalation System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    first = exc.errors()[0]
    field = first["loc"][-1]
    msg = first["msg"]
    return JSONResponse(status_code=422, content={"error": f"{field}: {msg}"})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


app.include_router(requests_router.router)
app.include_router(admin_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "SENTINEL"}
