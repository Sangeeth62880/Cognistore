import logging
import re
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import Feature, get_db
from app.routers.features import verify_api_key
from app.services.nl_service import NLService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nl-features", tags=["Natural Language Features"])


# --- Request/Response Models ---

class GenerateFeatureRequest(BaseModel):
    description: str = Field(..., min_length=5, max_length=500, description="Plain English description of the feature")
    entity_type: str = Field(..., min_length=2, max_length=100, description="The target entity type (e.g. user)")
    sample_columns: List[str] = Field(default_factory=list, description="Sample columns present in raw data")

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, value: str) -> str:
        # Strip HTML tags
        clean = re.sub(r"<[^>]*>", "", value)
        
        # Blacklist code injection words
        blacklisted = ["import", "exec", "eval", "os.", "sys.", "__import__", "subprocess", "open("]
        for word in blacklisted:
            if word in clean.lower():
                raise ValueError(f"Security Alert: Disallowed word pattern '{word}' detected.")
        return clean.strip()


class RefineFeatureRequest(BaseModel):
    feature_id: UUID = Field(..., description="The ID of the feature to refine")
    feedback: str = Field(..., min_length=5, max_length=500, description="Feedback describing improvements")

    @field_validator("feedback")
    @classmethod
    def sanitize_feedback(cls, value: str) -> str:
        clean = re.sub(r"<[^>]*>", "", value)
        blacklisted = ["import", "exec", "eval", "os.", "sys.", "__import__", "subprocess", "open("]
        for word in blacklisted:
            if word in clean.lower():
                raise ValueError(f"Security Alert: Disallowed word pattern '{word}' detected.")
        return clean.strip()


class GeneratedFeatureResponse(BaseModel):
    feature_name: str
    description: str
    computation_code: str
    expected_input_columns: List[str]
    tags: List[str]


# --- API Routes ---

@router.post("/generate", response_model=GeneratedFeatureResponse, dependencies=[Depends(verify_api_key)])
async def generate_feature_preview(
    payload: GenerateFeatureRequest,
):
    """
    Translates plain text description into an optimized feature definition spec
    without storing it. Sanitizes inputs and runs ast syntax + dry-run checks.
    """
    try:
        spec = await NLService.generate_feature_from_description(
            description=payload.description,
            entity_type=payload.entity_type,
            sample_columns=payload.sample_columns,
        )
        return spec
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        logger.error(f"Failed to generate feature preview: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LLM generator runtime error: {str(err)}")


@router.post("/generate-and-register", response_model=Dict[str, Any], dependencies=[Depends(verify_api_key)])
async def generate_and_register_feature(
    payload: GenerateFeatureRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Translates plain text and registers it directly into the features DB table
    if all validation tests pass.
    """
    try:
        # Generate and validate
        spec = await NLService.generate_feature_from_description(
            description=payload.description,
            entity_type=payload.entity_type,
            sample_columns=payload.sample_columns,
        )

        # Check if already exists
        stmt = select(Feature).where(Feature.name == spec["feature_name"])
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            # Append random index to name to make unique
            import random
            spec["feature_name"] = f"{spec['feature_name']}_{random.randint(100, 999)}"

        # Save to DB
        db_feature = Feature(
            name=spec["feature_name"],
            description=spec["description"],
            entity_type=payload.entity_type,
            computation_code=spec["computation_code"],
            tags={t: True for t in spec["tags"]},
            upstream_features=[],
            version=1,
            is_active=True,
        )

        db.add(db_feature)
        await db.commit()
        await db.refresh(db_feature)

        return {
            "success": True,
            "feature_id": str(db_feature.id),
            "name": db_feature.name,
            "description": db_feature.description,
            "version": db_feature.version,
            "computation_code": db_feature.computation_code,
        }

    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        await db.rollback()
        logger.error(f"Failed to generate and register feature: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Feature registration failure: {str(err)}")


@router.post("/refine", response_model=Dict[str, Any], dependencies=[Depends(verify_api_key)])
async def refine_feature_code(
    payload: RefineFeatureRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Loads an existing feature and incorporates iterative natural language feedback
    to regenerate computation code. Auto-increments feature version.
    """
    # Load existing feature
    stmt = select(Feature).where(Feature.id == payload.feature_id).where(Feature.is_active == True)
    result = await db.execute(stmt)
    feat = result.scalar_one_or_none()

    if not feat:
        raise HTTPException(
            status_code=404,
            detail=f"Active feature with ID {payload.feature_id} not found.",
        )

    try:
        # Refine utilizing Groq LLM
        spec = await NLService.refine_feature_code(
            current_feature=feat,
            feedback=payload.feedback,
        )


        # Apply updates
        feat.computation_code = spec["computation_code"]
        if spec.get("description"):
            feat.description = spec["description"]
        if spec.get("tags"):
            feat.tags = {t: True for t in spec["tags"]}

        feat.version += 1
        feat.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(feat)

        return {
            "success": True,
            "feature_id": str(feat.id),
            "name": feat.name,
            "description": feat.description,
            "version": feat.version,
            "computation_code": feat.computation_code,
        }

    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        await db.rollback()
        logger.error(f"Failed to refine feature {payload.feature_id}: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Refinement query failure: {str(err)}")
