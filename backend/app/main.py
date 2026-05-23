import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import async_session_maker, init_db
from app.redis_client import redis_client
from app.routers.features import router as features_router
from app.routers.nl_features import router as nl_features_router
from app.routers.datasets import router as datasets_router
from app.routers.alerts import router as alerts_router
from app.routers.models import router as models_router

# Setup logging
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing services during application startup...")

    # Initialize Database Tables
    try:
        await init_db()
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.critical(f"Failed to initialize database tables: {e}", exc_info=True)

    # Test Redis Connection
    redis_ok = await redis_client.ping()
    if redis_ok:
        logger.info("Redis client connected successfully.")
    else:
        logger.error("Redis client failed to connect.")

    yield

    # Shutdown actions
    logger.info("Shutting down application services...")
    try:
        await redis_client.close()
        logger.info("Redis client disconnected successfully.")
    except Exception as e:
        logger.error(f"Error during Redis client shutdown: {e}")


app = FastAPI(
    title="Intelligent Feature Store API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

app.include_router(features_router)
app.include_router(nl_features_router)
app.include_router(datasets_router)
app.include_router(alerts_router)
app.include_router(models_router)

# CORS configuration
if settings.ENVIRONMENT == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Production origins can be restricted, default to setting options
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Fallback for flexibility, customize in settings if needed
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Custom Global Error Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    logger.warning(f"HTTP exception on {request.url.path}: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status_code": exc.status_code,
            "message": exc.detail,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "status_code": 500,
            "message": "An internal server error occurred. Please contact the administrator.",
        },
    )


# Health Check Endpoint
@app.get("/health", response_model=Dict[str, Any])
async def health_check():
    db_connected = False
    redis_connected = False

    # Check database
    try:
        async with async_session_maker() as session:
            # Run simple query to check connection
            result = await session.execute(text("SELECT 1"))
            if result.scalar() == 1:
                db_connected = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")

    # Check redis
    try:
        redis_connected = await redis_client.ping()
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")

    overall_status = "healthy"
    if not db_connected or not redis_connected:
        overall_status = "degraded"

    return {
        "status": overall_status,
        "db_connected": db_connected,
        "redis_connected": redis_connected,
        "environment": settings.ENVIRONMENT,
    }
