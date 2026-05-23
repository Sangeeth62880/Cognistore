import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Feature, Model, FeatureValue, DriftAlert
from app.redis_client import redis_client

logger = logging.getLogger(__name__)


class MetricsService:
    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession) -> Dict[str, Any]:
        """
        Gathers database counts and queries Redis buffers to calculate
        average serving latency, active alerts count, and cache hit rate percentages.
        """
        try:
            # 1. Query database counts
            stmt_features = select(func.count()).select_from(Feature).where(Feature.is_active == True)
            res_feat = await db.execute(stmt_features)
            total_features = res_feat.scalar() or 0

            stmt_models = select(func.count()).select_from(Model).where(Model.is_active == True)
            res_mod = await db.execute(stmt_models)
            total_models = res_mod.scalar() or 0

            stmt_vals = select(func.count()).select_from(FeatureValue)
            res_val = await db.execute(stmt_vals)
            total_feature_values = res_val.scalar() or 0

            stmt_alerts = select(func.count()).select_from(DriftAlert).where(DriftAlert.is_resolved == False)
            res_al = await db.execute(stmt_alerts)
            active_alerts_count = res_al.scalar() or 0

            # 2. Count feature values computed in the last 24 hours
            time_24h_ago = datetime.now(timezone.utc) - timedelta(hours=24)
            stmt_24h = select(func.count()).select_from(FeatureValue).where(FeatureValue.timestamp >= time_24h_ago)
            res_24h = await db.execute(stmt_24h)
            features_computed_24h = res_24h.scalar() or 0

            # 3. Calculate average serving latency from Redis metrics list
            avg_latency = 0.0
            recent_latencies = []
            try:
                # Retrieve last 100 serving latencies for stats
                latencies = await redis_client.client.lrange("metrics:latencies", 0, -1)
                if latencies:
                    recent_latencies = [float(l) for l in latencies]
                    avg_latency = sum(recent_latencies) / len(recent_latencies)
            except Exception as redis_err:
                logger.error(f"Failed to retrieve serving latency list from Redis: {redis_err}")

            # 4. Calculate Cache Hit Rate from Redis metrics counters
            hit_rate = 100.0
            hits = 0
            misses = 0
            try:
                hits = int(await redis_client.client.get("metrics:cache_hits") or 0)
                misses = int(await redis_client.client.get("metrics:cache_misses") or 0)
                total = hits + misses
                if total > 0:
                    hit_rate = (hits / total) * 100.0
            except Exception as redis_err:
                logger.error(f"Failed to retrieve cache counter metrics from Redis: {redis_err}")

            return {
                "total_features": total_features,
                "total_models": total_models,
                "total_feature_values": total_feature_values,
                "avg_serving_latency_ms": round(avg_latency, 2),
                "active_alerts_count": active_alerts_count,
                "features_computed_last_24h": features_computed_24h,
                "cache_hit_rate": round(hit_rate, 2),
                "cache_hits": hits,
                "cache_misses": misses,
                "recent_latencies": recent_latencies[-50:] if recent_latencies else [],  # limit to last 50 for Recharts curve
            }

        except Exception as e:
            logger.error(f"Failed to aggregate dashboard metrics: {e}", exc_info=True)
            return {
                "total_features": 0,
                "total_models": 0,
                "total_feature_values": 0,
                "avg_serving_latency_ms": 0.0,
                "active_alerts_count": 0,
                "features_computed_last_24h": 0,
                "cache_hit_rate": 100.0,
                "cache_hits": 0,
                "cache_misses": 0,
                "recent_latencies": [],
            }
