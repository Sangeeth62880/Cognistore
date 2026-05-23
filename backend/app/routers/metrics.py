import asyncio
import json
import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_maker
from app.routers.features import verify_api_key
from app.redis_client import redis_client
from app.services.metrics_service import MetricsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/metrics", tags=["System Metrics & WebSocket Telemetry"])


@router.get("/dashboard", dependencies=[Depends(verify_api_key)])
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
):
    """
    Returns high-level counts and cache metrics for monitoring grids.
    """
    return await MetricsService.get_dashboard_metrics(db)


@router.websocket("/ws")
async def websocket_telemetry_stream(
    websocket: WebSocket,
):
    """
    WebSocket endpoint that streams microservice telemetry updates
    and serving event logs to clients real-time.
    """
    await websocket.accept()
    logger.info("New telemetry WebSocket connection accepted.")

    try:
        while True:
            # 1. Fetch live database aggregated metrics
            # Since websocket routes do not support Depends(get_db) dependencies in the same way,
            # we open an explicit async session to fetch database statistics safely.
            async with async_session_maker() as session:
                metrics = await MetricsService.get_dashboard_metrics(session)

            # 2. Retrieve recent serving event logs from Redis metrics:events list
            events = []
            try:
                events_raw = await redis_client.client.lrange("metrics:events", 0, -1)
                if events_raw:
                    events = [json.loads(evt) for evt in events_raw]
                    # Sort reverse chronologically so newest show at top of timeline
                    events.reverse()
            except Exception as redis_err:
                logger.error(f"Failed to query recent events from Redis: {redis_err}")

            # 3. Stream compiled payload
            payload = {
                "metrics": metrics,
                "events": events[:20],  # Stream top 20 latest events
            }
            await websocket.send_json(payload)

            # 4. Telemetry interval rate (sleep for 10 seconds before next broadcast)
            await asyncio.sleep(10)

    except WebSocketDisconnect:
        logger.info("Telemetry WebSocket connection closed by client.")
    except Exception as err:
        logger.error(f"Error inside telemetry WebSocket connection loop: {err}", exc_info=True)
    finally:
        # Final cleanups are handled automatically by connection closing
        pass
