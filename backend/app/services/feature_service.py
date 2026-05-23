import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Feature, FeatureSnapshot, FeatureValue
from app.redis_client import redis_client

logger = logging.getLogger(__name__)


class FeatureService:
    @staticmethod
    async def serve_feature(
        db: AsyncSession,
        feature_id: UUID,
        entity_id: str,
        as_of: datetime | None = None,
    ) -> Dict[str, Any]:
        """
        Serves a single feature value for an entity ID.
        Checks cache for standard serve, or point-in-time logs when as_of is set.
        """
        start_time = time.perf_counter()

        if as_of is None:
            # 1. Try Redis cache hit
            redis_key = f"feature:{str(feature_id)}:{entity_id}"
            try:
                cached_data = await redis_client.get(redis_key)
                if cached_data:
                    parsed = json.loads(cached_data)
                    latency_ms = (time.perf_counter() - start_time) * 1000.0
                    return {
                        "feature_id": feature_id,
                        "entity_id": entity_id,
                        "value": parsed["value"],
                        "timestamp": datetime.fromisoformat(parsed["timestamp"]),
                        "source": "cache",
                        "latency_ms": latency_ms,
                    }
            except Exception as e:
                logger.error(f"Redis cache serving error: {str(e)}")

            # 2. Cache miss -> Query DB feature_values
            try:
                stmt = (
                    select(FeatureValue)
                    .where(FeatureValue.feature_id == feature_id)
                    .where(FeatureValue.entity_id == entity_id)
                    .order_by(FeatureValue.timestamp.desc())
                    .limit(1)
                )
                result = await db.execute(stmt)
                db_val = result.scalar_one_or_none()

                if not db_val:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Feature value not found for feature {feature_id} and entity {entity_id}.",
                    )

                val = db_val.value.get("value")

                # Cache back to Redis async
                try:
                    redis_data = {
                        "feature_id": str(feature_id),
                        "entity_id": entity_id,
                        "value": val,
                        "timestamp": db_val.timestamp.isoformat(),
                    }
                    await redis_client.set(redis_key, json.dumps(redis_data), ttl=300)
                except Exception as cache_err:
                    logger.error(f"Failed to cache feature value: {str(cache_err)}")

                latency_ms = (time.perf_counter() - start_time) * 1000.0
                return {
                    "feature_id": feature_id,
                    "entity_id": entity_id,
                    "value": val,
                    "timestamp": db_val.timestamp,
                    "source": "db",
                    "latency_ms": latency_ms,
                }
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Database serving error: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Database serving query failed: {str(e)}")

        else:
            # 3. Point-in-time correctness -> Query feature_snapshots table (NEVER check cache)
            try:
                stmt = (
                    select(FeatureSnapshot)
                    .where(FeatureSnapshot.feature_id == feature_id)
                    .where(FeatureSnapshot.entity_id == entity_id)
                    .where(FeatureSnapshot.snapshot_time <= as_of)
                    .order_by(FeatureSnapshot.snapshot_time.desc())
                    .limit(1)
                )
                result = await db.execute(stmt)
                db_snap = result.scalar_one_or_none()

                if not db_snap:
                    raise HTTPException(
                        status_code=404,
                        detail=f"No feature snapshot found for feature {feature_id} and entity {entity_id} as of {as_of.isoformat()}.",
                    )

                val = db_snap.value.get("value")
                latency_ms = (time.perf_counter() - start_time) * 1000.0
                return {
                    "feature_id": feature_id,
                    "entity_id": entity_id,
                    "value": val,
                    "timestamp": db_snap.snapshot_time,
                    "source": "point_in_time",
                    "latency_ms": latency_ms,
                }
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Database point-in-time query error: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Database serving query failed: {str(e)}")

    @classmethod
    async def batch_serve_features(
        cls,
        db: AsyncSession,
        pairs: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Executes concurrent serve_feature operations using asyncio.gather.
        """
        tasks = []
        for pair in pairs:
            f_id = pair["feature_id"]
            ent_id = pair["entity_id"]
            tasks.append(cls.serve_feature(db, f_id, ent_id))

        results = await asyncio_gather_with_error_handling(tasks)
        return results

    @classmethod
    async def get_feature_lineage(cls, db: AsyncSession, feature_id: UUID) -> Dict[str, Any]:
        """
        Recursively queries the DB features table dependency links to assemble a lineage tree.
        """
        try:
            # Query the target feature
            stmt = select(Feature).where(Feature.id == feature_id).where(Feature.is_active == True)
            result = await db.execute(stmt)
            feat = result.scalar_one_or_none()

            if not feat:
                raise HTTPException(
                    status_code=404,
                    detail=f"Active Feature definition with ID {feature_id} not found.",
                )

            lineage = {
                "feature_id": str(feat.id),
                "name": feat.name,
                "upstream": [],
            }

            # Check dependencies
            if feat.upstream_features:
                dependencies_tasks = []
                for upstream_id_str in feat.upstream_features:
                    try:
                        upstream_id = UUID(upstream_id_str)
                        dependencies_tasks.append(cls.get_feature_lineage(db, upstream_id))
                    except ValueError:
                        logger.error(f"Invalid upstream feature ID string '{upstream_id_str}' in feature {feat.name}")
                        continue

                if dependencies_tasks:
                    import asyncio
                    dependencies_results = await asyncio.gather(*dependencies_tasks, return_exceptions=True)
                    for res in dependencies_results:
                        if isinstance(res, Exception):
                            # Log and skip broken branch lineages gracefully
                            logger.error(f"Failed to load lineage dependency branch: {res}")
                        else:
                            lineage["upstream"].append(res)

            return lineage

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error compiling feature lineage for {feature_id}: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Lineage retrieval failed: {str(e)}")


async def asyncio_gather_with_error_handling(tasks) -> List[Any]:
    """
    Utility wrapper to run list of tasks concurrently using asyncio.gather
    while logging exceptions and propagating results.
    """
    import asyncio
    results = await asyncio.gather(*tasks, return_exceptions=True)
    clean_results = []
    for res in results:
        if isinstance(res, Exception):
            # If sub-query failed (e.g. 404 not found), we can propagate it or skip it.
            # To be strict, let's propagate it or map it to a failed ServeResponse structure
            # to prevent batch servings from crashing completely if a single feature is missing!
            # Let's raise the HTTP Exception if critical, or map it.
            if isinstance(res, HTTPException):
                raise res
            raise HTTPException(status_code=500, detail=f"Concurrent task execution failed: {str(res)}")
        clean_results.append(res)
    return clean_results
