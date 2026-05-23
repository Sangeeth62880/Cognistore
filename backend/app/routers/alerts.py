import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Feature, DriftAlert, SeverityEnum, get_db
from app.routers.features import verify_api_key
from app.redis_client import redis_client
from app.services.drift_service import DriftService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["Drift Alerts & ML Monitoring"])


# --- Request/Response Models ---

class DriftCheckResponse(BaseModel):
    success: bool
    features_checked: int
    features_drifted: int
    alerts: List[Dict[str, Any]]


# --- Routes ---

@router.post("/drift/check", dependencies=[Depends(verify_api_key)])
async def trigger_global_drift_check(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers Population Stability Index (PSI) checking sweep across all active features.
    Rate-limited to max once every 5 minutes per client IP to prevent server degradation.
    """
    client_ip = request.client.host if request.client else "unknown_ip"
    rate_limit_key = f"rate_limit:drift_check:{client_ip}"

    # Rate Limiting Check
    try:
        already_checked = await redis_client.get(rate_limit_key)
        if already_checked:
            raise HTTPException(
                status_code=429,
                detail="Too Many Requests: Drift checking is limited to once every 5 minutes to prevent DB overhead.",
            )
        # Lock for 5 minutes (300 seconds)
        await redis_client.set(rate_limit_key, "1", ttl=300)
    except HTTPException:
        raise
    except Exception as redis_err:
        logger.error(f"Redis rate limiting lock check failed: {redis_err}")

    # Run check
    try:
        # Fetch total feature count for summary
        stmt_count = select(func.count()).select_from(Feature).where(Feature.is_active == True)
        count_res = await db.execute(stmt_count)
        total_active_features = count_res.scalar() or 0

        alerts_triggered = await DriftService.run_drift_check_all_features()

        return {
            "success": True,
            "features_checked": total_active_features,
            "features_drifted": len(alerts_triggered),
            "alerts": alerts_triggered,
        }
    except Exception as err:
        logger.error(f"Global drift checking runner failed: {err}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Drift checking service error: {str(err)}",
        )


@router.post("/drift/check/{feature_id}", dependencies=[Depends(verify_api_key)])
async def trigger_single_drift_check(
    feature_id: uuid.UUID,
):
    """
    Performs drift distribution analysis on a single specific feature.
    Returns the alert dict if drift exceeds threshhold, or status details if safe.
    """
    try:
        alert = await DriftService.detect_drift(str(feature_id))
        if alert:
            return {
                "status": "drift_detected",
                "alert": alert,
            }
        return {
            "status": "no_drift",
            "message": f"Feature ID {feature_id} distributions are statistically stable.",
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        logger.error(f"Single feature drift check failed: {err}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Drift runner failure: {str(err)}",
        )


@router.get("", dependencies=[Depends(verify_api_key)])
async def list_drift_alerts(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    severity: Optional[SeverityEnum] = Query(default=None),
    is_resolved: Optional[bool] = Query(default=None),
    feature_id: Optional[uuid.UUID] = Query(default=None),
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves logged drift alerts supporting paginated search, severity indicators, and resolve states.
    """
    try:
        stmt = select(DriftAlert).order_by(DriftAlert.detected_at.desc())

        # Apply Filters
        if severity:
            stmt = stmt.where(DriftAlert.severity == severity)
        if is_resolved is not None:
            stmt = stmt.where(DriftAlert.is_resolved == is_resolved)
        if feature_id:
            stmt = stmt.where(DriftAlert.feature_id == feature_id)
        if start_date:
            stmt = stmt.where(DriftAlert.detected_at >= start_date)
        if end_date:
            stmt = stmt.where(DriftAlert.detected_at <= end_date)

        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        records = result.scalars().all()

        # Join to get Feature names in output payload
        output = []
        for r in records:
            # Query feature name for details
            feat_stmt = select(Feature.name).where(Feature.id == r.feature_id)
            feat_res = await db.execute(feat_stmt)
            feat_name = feat_res.scalar() or "Unknown Feature"

            output.append({
                "id": str(r.id),
                "feature_id": str(r.feature_id),
                "feature_name": feat_name,
                "detected_at": r.detected_at,
                "severity": r.severity.value,
                "explanation": r.explanation,
                "upstream_correlation": r.upstream_correlation,
                "suggested_fix": r.suggested_fix,
                "is_resolved": r.is_resolved,
            })

        return output
    except Exception as e:
        logger.error(f"Error querying alerts list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database lookup query failed.")


@router.patch("/{id}/resolve", dependencies=[Depends(verify_api_key)])
async def resolve_drift_alert(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Marks a drift alert as resolved in database registry.
    """
    stmt = select(DriftAlert).where(DriftAlert.id == id)
    result = await db.execute(stmt)
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=404,
            detail=f"Drift alert with ID {id} not found in active directories.",
        )

    alert.is_resolved = True
    
    try:
        db.add(alert)
        await db.commit()
        await db.refresh(alert)
        
        logger.info(f"Drift alert ID {id} has been marked as resolved.")
        
        return {
            "success": True,
            "alert_id": str(alert.id),
            "is_resolved": alert.is_resolved,
            "message": "Alert status successfully updated to resolved.",
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to resolve alert: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to write update to database.")


@router.get("/summary", dependencies=[Depends(verify_api_key)])
async def get_alerts_dashboard_summary(
    db: AsyncSession = Depends(get_db),
):
    """
    Returns high-level statistics summary counts for layout grids:
    Total alert events, severity counts, resolution rates, and top drifting features.
    """
    try:
        # Total counts
        stmt_tot = select(func.count()).select_from(DriftAlert)
        tot_res = await db.execute(stmt_tot)
        total_alerts = tot_res.scalar() or 0

        # Severity distributions
        stmt_high = select(func.count()).select_from(DriftAlert).where(DriftAlert.severity == SeverityEnum.high)
        high_res = await db.execute(stmt_high)
        high_alerts = high_res.scalar() or 0

        stmt_med = select(func.count()).select_from(DriftAlert).where(DriftAlert.severity == SeverityEnum.medium)
        med_res = await db.execute(stmt_med)
        medium_alerts = med_res.scalar() or 0

        # Resolution calculations
        stmt_res = select(func.count()).select_from(DriftAlert).where(DriftAlert.is_resolved == True)
        res_res = await db.execute(stmt_res)
        resolved_alerts = res_res.scalar() or 0

        resolution_rate = float((resolved_alerts / total_alerts) * 100) if total_alerts > 0 else 100.0

        # Top drifting features
        stmt_top = (
            select(DriftAlert.feature_id, func.count(DriftAlert.id).label("count"))
            .group_by(DriftAlert.feature_id)
            .order_by(text("count DESC"))
            .limit(5)
        )
        # Import text for SQL compiling compatibility
        from sqlalchemy import text
        
        top_res = await db.execute(stmt_top)
        top_records = top_res.all()

        top_drifting = []
        for row in top_records:
            feat_stmt = select(Feature.name).where(Feature.id == row.feature_id)
            feat_res = await db.execute(feat_stmt)
            feat_name = feat_res.scalar() or "Unknown Feature"
            top_drifting.append({
                "feature_id": str(row.feature_id),
                "feature_name": feat_name,
                "alerts_count": row.count,
            })

        return {
            "total_alerts": total_alerts,
            "high_severity_count": high_alerts,
            "medium_severity_count": medium_alerts,
            "resolution_rate": round(resolution_rate, 2),
            "top_drifting_features": top_drifting,
        }
    except Exception as e:
        logger.error(f"Failed to generate drift stats summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database aggregation metrics query failed: {str(e)}")
