from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.logging import configure_logging, get_logger
from app.core.startup import ensure_database_ready

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("应用启动检查开始。")
    ensure_database_ready()
    logger.info("应用启动检查通过。")
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
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    logger.warning(
        "HTTP 异常：method=%s path=%s status=%s detail=%s",
        request.method,
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    if isinstance(exc.detail, dict):
        payload = exc.detail
    else:
        payload = {"code": "HTTP_ERROR", "message": str(exc.detail), "field_errors": {}}
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning(
        "请求参数校验失败：method=%s path=%s errors=%s",
        request.method,
        request.url.path,
        exc.errors(),
    )
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


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "未捕获异常：method=%s path=%s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "服务器内部异常，请稍后重试。",
            "field_errors": {},
        },
    )

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
