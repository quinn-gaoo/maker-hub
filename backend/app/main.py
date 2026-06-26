from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.startup import ensure_database_ready


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_database_ready()
    yield


app = FastAPI(title="MakerHub API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        payload = exc.detail
    else:
        payload = {"code": "HTTP_ERROR", "message": str(exc.detail), "field_errors": {}}
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    field_errors: dict[str, str] = {}
    for item in exc.errors():
        location = ".".join(str(part) for part in item.get("loc", []) if part != "body")
        field_errors[location or "body"] = item.get("msg", "Invalid value")
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "请求参数校验失败。",
            "field_errors": field_errors,
        },
    )

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
