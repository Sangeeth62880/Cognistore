import re
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class FeatureCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="The name of the feature")
    description: str | None = Field(default=None, description="Optional description of what the feature tracks")
    entity_type: str = Field(..., min_length=2, max_length=100, description="The entity type (e.g. user, merchant)")
    computation_code: str = Field(..., min_length=5, description="Python syntax computation code")
    tags: Dict[str, Any] = Field(default_factory=dict, description="Key-value tags metadata")
    upstream_features: List[str] = Field(default_factory=list, description="List of upstream feature IDs it depends on")

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_]+$", value):
            raise ValueError("Feature name must contain only alphanumeric characters and underscores.")
        return value


class FeatureUpdate(BaseModel):
    description: str | None = Field(default=None, description="Optional updated description")
    entity_type: str | None = Field(default=None, min_length=2, max_length=100, description="Updated entity type")
    computation_code: str | None = Field(default=None, min_length=5, description="Updated Python computation code")
    tags: Dict[str, Any] | None = Field(default=None, description="Updated tags metadata")
    upstream_features: List[str] | None = Field(default=None, description="Updated list of upstream feature dependencies")
    is_active: bool | None = Field(default=None, description="Set whether feature is active or not")


class FeatureResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    entity_type: str
    computation_code: str | None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    tags: Dict[str, Any] | None
    version: int
    upstream_features: List[str] | None = []

    model_config = {
        "from_attributes": True,
    }


class ComputeRequest(BaseModel):
    entity_ids: List[str] = Field(..., min_length=1, description="List of entity IDs to calculate features for")
    data: Dict[str, List[Any]] = Field(..., description="Dictionary representing inputs (like columns in pandas)")

    @field_validator("data")
    @classmethod
    def validate_data_not_empty(cls, value: Dict[str, List[Any]]) -> Dict[str, List[Any]]:
        if not value:
            raise ValueError("Data dictionary cannot be empty.")
        # Check that all lists have the exact same length
        lengths = [len(v) for v in value.values()]
        if len(set(lengths)) > 1:
            raise ValueError("All arrays in the data dictionary must have the same length.")
        return value


class ComputeResponse(BaseModel):
    feature_id: UUID
    entity_ids: List[str]
    status: str
    latency_ms: float


class ServeResponse(BaseModel):
    feature_id: UUID
    entity_id: str
    value: Any
    timestamp: datetime
    source: str
    latency_ms: float


class BatchServeRequest(BaseModel):
    class Pair(BaseModel):
        feature_id: UUID
        entity_id: str

    pairs: List[Pair] = Field(..., min_length=1, description="List of feature_id and entity_id pairs to serve")


class BatchServeResponse(BaseModel):
    results: List[ServeResponse]
