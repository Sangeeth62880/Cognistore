import logging
import os
import random
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Feature, Dataset, get_db
from app.routers.features import verify_api_key
from app.services.dataset_service import DatasetService
from app.services.discovery_service import DiscoveryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/datasets", tags=["Datasets Ingestion & Discovery"])

UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "tmp", "uploads")
)

# Enforce uploads directory existence
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 Megabytes


# --- Request Models ---

class RegisterSuggestionRequest(BaseModel):
    feature_name: str = Field(..., description="The unique name of the feature")
    description: str = Field(..., description="Short explanation of what the feature measures")
    computation_code: str = Field(..., description="Valid Python pandas code to compute the feature")
    feature_type: str = Field(..., description="Classification category (aggregation, ratio, etc.)")
    required_columns: List[str] = Field(default_factory=list, description="Columns necessary for this feature")


# --- Routes ---

@router.post("/upload", dependencies=[Depends(verify_api_key)])
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts multipart file uploads of raw CSV training datasets.
    Sanitizes filenames, executes size/mime validations, scans structure,
    stores files inside /tmp/uploads, and registers background parsing tasks.
    """
    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="Uploaded file is missing a filename.")

    # 1. Path traversal security check
    if "../" in filename or "..\\" in filename:
        raise HTTPException(
            status_code=400,
            detail="Security Alert: Invalid path traversal characters detected in filename.",
        )

    # 2. Filename sanitization
    sanitized_filename = re.sub(r"[^\w\.\-]", "_", filename)

    # 3. CSV Extension check
    if not sanitized_filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported File Type. Only plain text CSV (.csv) files are accepted.",
        )

    # 4. Read first 100 bytes to scan for valid CSV structure and text formats
    try:
        first_bytes = await file.read(100)
        await file.seek(0)  # Reset stream position

        # Check for non-printable binary control characters
        text_preview = first_bytes.decode("utf-8", errors="ignore")
        control_chars = [c for c in text_preview if ord(c) < 32 and c not in ["\n", "\r", "\t"]]
        if len(control_chars) > 5:  # High probability of binary file formats (e.g. gzip, zip, exe)
            raise ValueError("Binary format detected.")

        # Ensure delimiter exists
        if not any(delim in text_preview for delim in [",", ";", "\t", "|"]):
            raise ValueError("CSV delimiter not found.")

    except Exception as scan_err:
        logger.warning(f"File structural scan failed: {scan_err}")
        raise HTTPException(
            status_code=400,
            detail="Invalid CSV format. Ensure the file contains printable, comma-separated text characters.",
        )

    # 5. Stream and copy file to storage while tracking file size constraints
    unique_id = uuid.uuid4()
    save_filename = f"{unique_id}_{sanitized_filename}"
    save_path = os.path.join(UPLOAD_DIR, save_filename)

    total_bytes = 0
    try:
        with open(save_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunk reads
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE:
                    # Clean up file
                    buffer.close()
                    if os.path.exists(save_path):
                        os.remove(save_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB.",
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as write_err:
        logger.error(f"Failed to write file to local disk: {write_err}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Disk I/O failure: {str(write_err)}")

    # 6. Create database record
    db_dataset = Dataset(
        id=unique_id,
        name=sanitized_filename,
        file_path=save_path,
        is_processed=False,
        uploaded_at=datetime.utcnow(),
    )
    
    db.add(db_dataset)
    await db.commit()
    await db.refresh(db_dataset)

    # 7. Register background task
    background_tasks.add_task(
        DatasetService.process_uploaded_dataset,
        save_path,
        str(db_dataset.id),
    )

    return {
        "success": True,
        "dataset_id": str(db_dataset.id),
        "filename": db_dataset.name,
        "message": "Dataset successfully uploaded. Schema and statistics analysis triggered in the background.",
    }


@router.get("/{id}/status", dependencies=[Depends(verify_api_key)])
async def get_dataset_status(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Retrieves the background status, row counts, and schema metrics for an uploaded CSV dataset.
    """
    stmt = select(Dataset).where(Dataset.id == id)
    result = await db.execute(stmt)
    db_dataset = result.scalar_one_or_none()

    if not db_dataset:
        raise HTTPException(
            status_code=404,
            detail=f"Uploaded dataset with ID {id} not found in historical directory.",
        )

    return {
        "dataset_id": str(db_dataset.id),
        "name": db_dataset.name,
        "is_processed": db_dataset.is_processed,
        "row_count": db_dataset.row_count,
        "uploaded_at": db_dataset.uploaded_at,
        "schema_info": db_dataset.schema_info,
    }


@router.post("/{id}/discover", dependencies=[Depends(verify_api_key)])
async def discover_dataset_features(id: uuid.UUID):
    """
    Triggers the AI Automatic Feature Discovery workflow.
    Analyzes column relationships and skewness indices to propose 8 custom code suggestion cards.
    """
    try:
        suggestions = await DiscoveryService.discover_features(str(id))
        return {
            "success": True,
            "dataset_id": str(id),
            "suggestions": suggestions,
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        logger.error(f"Discovery pipeline failed: {err}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Recommender failed: {str(err)}",
        )


@router.post("/{id}/register-suggestion", dependencies=[Depends(verify_api_key)])
async def register_suggested_feature(
    id: uuid.UUID,
    payload: RegisterSuggestionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Registers an AI-suggested feature directly into the active features database.
    """
    # 1. Clean feature name check
    stmt = select(Feature).where(Feature.name == payload.feature_name)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    feature_name = payload.feature_name
    if existing:
        # Append safe random index suffix
        feature_name = f"{feature_name}_{random.randint(100, 999)}"

    # 2. Register into DB
    try:
        db_feature = Feature(
            name=feature_name,
            description=payload.description,
            entity_type="user",  # Default entity class
            computation_code=payload.computation_code,
            tags={payload.feature_type: True, "discovered": True},
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

    except Exception as reg_err:
        await db.rollback()
        logger.error(f"Failed to register suggestion: {reg_err}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register suggestion: {str(reg_err)}",
        )


@router.get("", dependencies=[Depends(verify_api_key)])
async def list_datasets(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """
    Lists historical uploaded datasets directories.
    """
    stmt = select(Dataset).order_by(Dataset.uploaded_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    records = result.scalars().all()

    return [
        {
            "dataset_id": str(r.id),
            "name": r.name,
            "file_path": r.file_path,
            "is_processed": r.is_processed,
            "row_count": r.row_count,
            "uploaded_at": r.uploaded_at,
        }
        for r in records
    ]
