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
from app.routers.metrics import router as metrics_router

import time
import json
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware

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


class LatencyTrackingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        response = await call_next(request)
        
        path = request.url.path
        if "/features/" in path and "/serve" in path:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            try:
                # Push serving latency to Redis list metrics:latencies
                await redis_client.client.rpush("metrics:latencies", str(latency_ms))
                await redis_client.client.ltrim("metrics:latencies", -1000, -1)
                
                # Push event logs to Redis list metrics:events (recent serving feed)
                parts = [p for p in path.split("/") if p]
                feature_id = "unknown"
                if len(parts) >= 2:
                    feature_id = parts[1]
                
                # Try to fetch feature name to make visual timeline extremely clean
                feature_name = "Serve Request"
                try:
                    from uuid import UUID
                    from app.database import async_session_maker, Feature
                    from sqlalchemy import select
                    async with async_session_maker() as session:
                        feat_stmt = select(Feature.name).where(Feature.id == UUID(feature_id))
                        feat_res = await session.execute(feat_stmt)
                        feature_name = feat_res.scalar() or "Serve Request"
                except Exception:
                    pass

                entity_id = request.query_params.get("entity_id", "unknown")
                
                event_data = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "feature_id": feature_id,
                    "feature_name": feature_name,
                    "entity_id": entity_id,
                    "latency_ms": round(latency_ms, 2),
                    "status_code": response.status_code,
                    "source": "db" if latency_ms > 10.0 else "cache",
                }
                
                await redis_client.client.rpush("metrics:events", json.dumps(event_data))
                await redis_client.client.ltrim("metrics:events", -50, -1)
            except Exception as redis_err:
                logging.getLogger("main").error(f"Failed to record telemetry inside custom middleware: {redis_err}")
                
        return response


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
app.include_router(metrics_router)

# CORS configuration
if settings.ENVIRONMENT == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Production origins can be restricted, default to setting options
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Fallback for flexibility, customize in settings if needed
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )


app.add_middleware(LatencyTrackingMiddleware)


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
