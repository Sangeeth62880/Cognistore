import logging
import time
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import Feature, get_db
from app.models.feature_models import (
    BatchServeRequest,
    BatchServeResponse,
    ComputeRequest,
    ComputeResponse,
    FeatureCreate,
    FeatureResponse,
    FeatureUpdate,
    ServeResponse,
)
from app.redis_client import redis_client
from app.services.computation_service import ComputationError, ComputationService
from app.services.feature_service import FeatureService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/features", tags=["Features"])


# 1. API Key Validation Dependency
async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")) -> str:
    """Verifies all requests against SECRET_KEY."""
    if x_api_key != settings.SECRET_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid or missing API Key (X-API-Key).",
        )
    return x_api_key


# 2. Redis-Based Rate Limiting Dependency (Max 100 requests per minute)
async def check_rate_limit(request: Request) -> None:
    """Rate limits requests to serving endpoints (100req/min/IP)."""
    client_ip = request.client.host if request.client else "unknown_ip"
    endpoint = request.url.path
    redis_key = f"rate_limit:{client_ip}:{endpoint}"

    try:
        current_count = await redis_client.get(redis_key)
        if current_count is not None:
            count = int(current_count)
            if count >= 100:
                raise HTTPException(
                    status_code=429,
                    detail="Too Many Requests: Rate limit of 100 requests per minute exceeded.",
                )
            # Increment
            await redis_client.set(redis_key, str(count + 1), ttl=60)
        else:
            # Set initial key
            await redis_client.set(redis_key, "1", ttl=60)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Rate limiting service degraded: {str(e)}")
        # In production, continue gracefully if redis goes down
        pass


# 3. Log Auditor helper
def log_audit(
    endpoint: str,
    latency_ms: float,
    status_code: int,
    entity_id: str | None = None,
) -> None:
    """Audits feature serving requests in production logs."""
    timestamp = datetime.utcnow().isoformat()
    logger.info(
        f"[AUDIT_LOG] Timestamp: {timestamp} | Endpoint: {endpoint} | "
        f"Latency: {latency_ms:.2f}ms | Status Code: {status_code} | Entity ID: {entity_id or 'N/A'}"
    )


# --- CRUD Endpoints ---

@router.post("", response_model=FeatureResponse, dependencies=[Depends(verify_api_key)])
async def create_feature(
    payload: FeatureCreate,
    db: AsyncSession = Depends(get_db),
):
    """Registers a new feature definition. Validates Python computation syntax via AST."""
    # Check if a feature with that name already exists
    stmt = select(Feature).where(Feature.name == payload.name)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A feature named '{payload.name}' is already registered.",
        )

    # Validate Python Syntax
    try:
        ComputationService.validate_python_syntax(payload.computation_code)
    except ComputationError as err:
        raise HTTPException(status_code=400, detail=str(err))

    # Construct the model
    db_feature = Feature(
        name=payload.name,
        description=payload.description,
        entity_type=payload.entity_type,
        computation_code=payload.computation_code,
        tags=payload.tags,
        upstream_features=payload.upstream_features,
        version=1,
        is_active=True,
    )

    try:
        db.add(db_feature)
        await db.commit()
        await db.refresh(db_feature)
        return db_feature
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to save feature definition: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error saving feature.")


@router.get("", response_model=List[FeatureResponse], dependencies=[Depends(verify_api_key)])
async def list_features(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """Lists all active feature definitions with pagination parameters."""
    try:
        stmt = (
            select(Feature)
            .where(Feature.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        features = result.scalars().all()
        return features
    except Exception as e:
        logger.error(f"Error listing features: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database retrieval query failed.")


@router.get("/{id}", response_model=FeatureResponse, dependencies=[Depends(verify_api_key)])
async def get_feature(
    id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves details of a single active feature definition."""
    stmt = select(Feature).where(Feature.id == id).where(Feature.is_active == True)
    result = await db.execute(stmt)
    feat = result.scalar_one_or_none()
    if not feat:
        raise HTTPException(status_code=404, detail=f"Active feature with ID {id} not found.")
    return feat


@router.put("/{id}", response_model=FeatureResponse, dependencies=[Depends(verify_api_key)])
async def update_feature(
    id: UUID,
    payload: FeatureUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Updates feature specifications. Increments the version index automatically."""
    stmt = select(Feature).where(Feature.id == id).where(Feature.is_active == True)
    result = await db.execute(stmt)
    feat = result.scalar_one_or_none()
    if not feat:
        raise HTTPException(status_code=404, detail=f"Active feature with ID {id} not found.")

    # Validate syntax if computation code is changing
    if payload.computation_code is not None:
        try:
            ComputationService.validate_python_syntax(payload.computation_code)
            feat.computation_code = payload.computation_code
        except ComputationError as err:
            raise HTTPException(status_code=400, detail=str(err))

    # Apply updates
    if payload.description is not None:
        feat.description = payload.description
    if payload.entity_type is not None:
        feat.entity_type = payload.entity_type
    if payload.tags is not None:
        feat.tags = payload.tags
    if payload.upstream_features is not None:
        feat.upstream_features = payload.upstream_features
    if payload.is_active is not None:
        feat.is_active = payload.is_active

    # Auto-increment version
    feat.version += 1
    feat.updated_at = datetime.utcnow()

    try:
        await db.commit()
        await db.refresh(feat)
        return feat
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update feature: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save update configuration.")


@router.delete("/{id}", response_model=Dict[str, Any], dependencies=[Depends(verify_api_key)])
async def delete_feature(
    id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Performs a soft delete on the feature definition (never hard delete)."""
    stmt = select(Feature).where(Feature.id == id).where(Feature.is_active == True)
    result = await db.execute(stmt)
    feat = result.scalar_one_or_none()
    if not feat:
        raise HTTPException(status_code=404, detail=f"Active feature with ID {id} not found.")

    # Soft delete
    feat.is_active = False
    feat.updated_at = datetime.utcnow()

    try:
        await db.commit()
        return {"success": True, "message": f"Feature {id} successfully soft-deleted."}
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to delete feature: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database write failure.")


# --- Computation Endpoint ---

@router.post("/{id}/compute", response_model=ComputeResponse, dependencies=[Depends(verify_api_key)])
async def compute_feature(
    id: UUID,
    payload: ComputeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Executes sandboxed Python execution for the feature across provided entities."""
    stmt = select(Feature).where(Feature.id == id).where(Feature.is_active == True)
    result = await db.execute(stmt)
    feat = result.scalar_one_or_none()
    if not feat:
        raise HTTPException(status_code=404, detail=f"Active feature with ID {id} not found.")

    try:
        latency = await ComputationService.compute_and_store(
            db=db,
            feature=feat,
            entity_ids=payload.entity_ids,
            input_data=payload.data,
        )
        return {
            "feature_id": feat.id,
            "entity_ids": payload.entity_ids,
            "status": "success",
            "latency_ms": latency,
        }
    except ComputationError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Computation runtime failure: {str(err)}")


# --- Serving Endpoints ---

@router.get("/{id}/serve", response_model=ServeResponse, dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def serve_feature_value(
    id: UUID,
    entity_id: str = Query(..., min_length=1),
    as_of: datetime | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Serves a feature value with caching, point-in-time accuracy, and performance logs."""
    start_time = time.perf_counter()
    try:
        res = await FeatureService.serve_feature(
            db=db,
            feature_id=id,
            entity_id=entity_id,
            as_of=as_of,
        )
        latency = (time.perf_counter() - start_time) * 1000.0
        log_audit(
            endpoint=f"/features/{id}/serve",
            latency_ms=latency,
            status_code=200,
            entity_id=entity_id,
        )
        return res
    except HTTPException as e:
        latency = (time.perf_counter() - start_time) * 1000.0
        log_audit(
            endpoint=f"/features/{id}/serve",
            latency_ms=latency,
            status_code=e.status_code,
            entity_id=entity_id,
        )
        raise
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000.0
        log_audit(
            endpoint=f"/features/{id}/serve",
            latency_ms=latency,
            status_code=500,
            entity_id=entity_id,
        )
        raise HTTPException(status_code=500, detail=f"Feature serving failure: {str(e)}")


@router.post("/batch-serve", response_model=BatchServeResponse, dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
async def batch_serve_feature_values(
    payload: BatchServeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Executes concurrent serving lookups across pairs utilizing asyncio.gather."""
    start_time = time.perf_counter()
    try:
        pairs = [{"feature_id": p.feature_id, "entity_id": p.entity_id} for p in payload.pairs]
        results = await FeatureService.batch_serve_features(db, pairs)
        latency = (time.perf_counter() - start_time) * 1000.0
        log_audit(
            endpoint="/features/batch-serve",
            latency_ms=latency,
            status_code=200,
        )
        return {"results": results}
    except HTTPException as e:
        latency = (time.perf_counter() - start_time) * 1000.0
        log_audit(
            endpoint="/features/batch-serve",
            latency_ms=latency,
            status_code=e.status_code,
        )
        raise
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000.0
        log_audit(
            endpoint="/features/batch-serve",
            latency_ms=latency,
            status_code=500,
        )
        raise HTTPException(status_code=500, detail=f"Batch serving failure: {str(e)}")


@router.get("/{id}/lineage", response_model=Dict[str, Any], dependencies=[Depends(verify_api_key)])
async def get_feature_lineage_tree(
    id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Returns the full recursive dependency tree for a feature lineage graph."""
    res = await FeatureService.get_feature_lineage(db, id)
    return res
