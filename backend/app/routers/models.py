import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.database import Model, Feature, FeatureValue, get_db
from app.routers.features import verify_api_key
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/models", tags=["Model Recommendation & Registry"])


# --- Request/Response Models ---

class RecommendRequest(BaseModel):
    model_name: str = Field(..., min_length=2, max_length=255, description="The name of the target ML model")
    model_description: str = Field(..., min_length=5, description="A description of the predictive goal of the model")
    model_task: str = Field(..., description="ML task: classification, regression, ranking, clustering")


class RegisterRequest(BaseModel):
    model_name: str = Field(..., min_length=2, max_length=255)
    version: str = Field(..., min_length=1, max_length=50)
    feature_ids: List[str] = Field(..., min_length=1, description="List of feature UUIDs to link to the model")
    mlflow_run_id: Optional[str] = Field(default=None, description="Optional MLflow run identification token")


class RegisterWithRecommendationsRequest(BaseModel):
    model_name: str = Field(..., min_length=2, max_length=255)
    model_description: str = Field(..., min_length=5)
    model_task: str = Field(...)
    version: str = Field(..., min_length=1, max_length=50)
    selected_feature_ids: List[str] = Field(..., min_length=1)


# --- Routes ---

@router.post("/recommend", dependencies=[Depends(verify_api_key)])
async def get_feature_recommendations(
    req: RecommendRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates ML task and description, returning ranked feature recommendations.
    Does not register the model.
    """
    return await RecommendationService.recommend_features(
        db=db,
        model_name=req.model_name,
        model_description=req.model_description,
        model_task=req.model_task,
    )


@router.post("/register", dependencies=[Depends(verify_api_key)])
async def register_new_model(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a new ML model in database registry with specified feature IDs.
    """
    return await RecommendationService.register_model_with_features(
        db=db,
        model_name=req.model_name,
        version=req.version,
        feature_ids=req.feature_ids,
        mlflow_run_id=req.mlflow_run_id,
    )


@router.post("/register-with-recommendations", dependencies=[Depends(verify_api_key)])
async def register_model_with_recommendations(
    req: RegisterWithRecommendationsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Validates selection and registers the model in database registry.
    """
    return await RecommendationService.register_model_with_features(
        db=db,
        model_name=req.model_name,
        version=req.version,
        feature_ids=req.selected_feature_ids,
        mlflow_run_id=None,
    )


@router.get("", dependencies=[Depends(verify_api_key)])
async def list_models(
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all logged models alongside names of their bound features.
    """
    try:
        stmt = select(Model).order_by(Model.created_at.desc())
        result = await db.execute(stmt)
        models = result.scalars().all()

        output = []
        for m in models:
            # Query linked feature names for easy display
            features_details = []
            for fid_str in m.feature_ids:
                try:
                    fid = uuid.UUID(fid_str)
                    stmt_feat = select(Feature.name).where(Feature.id == fid)
                    res_feat = await db.execute(stmt_feat)
                    f_name = res_feat.scalar() or "Unknown Feature"
                    features_details.append({
                        "feature_id": fid_str,
                        "feature_name": f_name,
                    })
                except ValueError:
                    continue

            output.append({
                "id": str(m.id),
                "name": m.name,
                "version": m.version,
                "mlflow_run_id": m.mlflow_run_id,
                "created_at": m.created_at,
                "is_active": m.is_active,
                "features": features_details,
            })

        return output
    except Exception as e:
        logger.error(f"Failed to query models list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database models list lookup query failed.")


@router.get("/{id}", dependencies=[Depends(verify_api_key)])
async def get_model_details(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full details of registered model including linked features and their latest serving statistics.
    """
    try:
        stmt = select(Model).where(Model.id == id)
        result = await db.execute(stmt)
        m = result.scalar_one_or_none()

        if not m:
            raise HTTPException(
                status_code=404,
                detail=f"Model with ID '{id}' not found in registry.",
            )

        features_details = []
        for fid_str in m.feature_ids:
            fid = uuid.UUID(fid_str)
            stmt_feat = select(Feature).where(Feature.id == fid)
            res_feat = await db.execute(stmt_feat)
            feat = res_feat.scalar_one_or_none()

            if feat:
                # Query latest recorded serving value in feature_values as a metric sample
                val_stmt = select(FeatureValue.value, FeatureValue.timestamp).where(FeatureValue.feature_id == fid).order_by(FeatureValue.timestamp.desc()).limit(1)
                val_res = await db.execute(val_stmt)
                val_row = val_res.first()
                
                latest_value = val_row[0].get("value") if val_row else None
                latest_ts = val_row[1] if val_row else None

                features_details.append({
                    "id": str(feat.id),
                    "name": feat.name,
                    "description": feat.description,
                    "entity_type": feat.entity_type,
                    "tags": feat.tags,
                    "latest_recorded_value": latest_value,
                    "latest_recorded_at": latest_ts,
                })

        return {
            "id": str(m.id),
            "name": m.name,
            "version": m.version,
            "mlflow_run_id": m.mlflow_run_id,
            "created_at": m.created_at,
            "is_active": m.is_active,
            "features": features_details,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to query model details for ID {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database model lookup query failed.")
