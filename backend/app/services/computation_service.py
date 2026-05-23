import ast
import logging
import time
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID

import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Feature, FeatureSnapshot, FeatureValue
from app.redis_client import redis_client

logger = logging.getLogger(__name__)


class ComputationError(Exception):
    """Custom exception representing code computation failures."""
    pass


class ComputationService:
    @staticmethod
    def validate_python_syntax(code: str) -> None:
        """Validates that a string is syntactically valid Python using AST parsing."""
        try:
            ast.parse(code)
        except SyntaxError as e:
            raise ComputationError(f"Invalid Python syntax: {e.msg} at line {e.lineno}")
        except Exception as e:
            raise ComputationError(f"Failed to parse computation code: {str(e)}")

    @staticmethod
    async def compute_and_store(
        db: AsyncSession,
        feature: Feature,
        entity_ids: List[str],
        input_data: Dict[str, List[Any]],
    ) -> float:
        """
        Executes sandboxed python computation, stores results in Postgres DB tables,
        and caches to Upstash Redis. Returns latency in milliseconds.
        """
        start_time = time.perf_counter()
        timestamp = datetime.utcnow()

        # 1. Convert input data to pandas DataFrame
        try:
            df = pd.DataFrame(input_data)
        except Exception as e:
            raise ComputationError(f"Failed to create pandas DataFrame from input data: {str(e)}")

        # 2. Execute computation code safely in sandboxed namespace
        def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name in ["pandas", "numpy"]:
                import importlib
                return importlib.import_module(name)
            raise ImportError(f"Import of module '{name}' is not allowed in this sandbox.")

        safe_builtins = {
            "abs": abs,
            "all": all,
            "any": any,
            "bool": bool,
            "dict": dict,
            "float": float,
            "int": int,
            "len": len,
            "list": list,
            "map": map,
            "max": max,
            "min": min,
            "round": round,
            "set": set,
            "str": str,
            "sum": sum,
            "zip": zip,
            "__import__": safe_import,
        }

        safe_globals = {
            "__builtins__": safe_builtins,
            "pd": pd,
            "np": np,
            "df": df,
        }
        local_vars = {}

        try:
            # Sandbox exec block
            exec(feature.computation_code, safe_globals, local_vars)
        except Exception as e:
            logger.error(f"Computation execution error for feature {feature.name}: {str(e)}", exc_info=True)
            raise ComputationError(f"Error executing computation_code: {str(e)}")

        # 3. Retrieve computed result
        if "result" not in local_vars:
            # Fallback check if they assigned column directly inside df
            if feature.name in df.columns:
                result = df[feature.name]
            elif "result" in df.columns:
                result = df["result"]
            else:
                raise ComputationError(
                    "Computation code must assign output to a variable named 'result' or modify the 'df' columns."
                )
        else:
            result = local_vars["result"]

        # Parse computed outputs to array aligned with entity_ids
        computed_values = []
        try:
            # Case 1: Result is a dictionary (e.g., from groupby to_dict())
            if isinstance(result, dict):
                computed_values = [result.get(ent_id) for ent_id in entity_ids]

            # Case 2: Result is a pandas Series
            elif isinstance(result, pd.Series):
                computed_values = []
                for ent_id in entity_ids:
                    if ent_id in result.index:
                        computed_values.append(result.loc[ent_id])
                    else:
                        computed_values.append(None)

            # Case 3: Result is a list or flat array of matching length to unique entity_ids
            elif isinstance(result, (list, np.ndarray)):
                if len(result) == len(entity_ids):
                    computed_values = list(result)
                else:
                    raise ComputationError(
                        f"Computed flat result length ({len(result)}) does not match entity_ids count ({len(entity_ids)})."
                    )

            # Case 4: Scalar value applied to all entities
            else:
                scalar_val = result
                if hasattr(scalar_val, "item"):
                    scalar_val = scalar_val.item()
                computed_values = [scalar_val] * len(entity_ids)
        except Exception as e:
            raise ComputationError(f"Failed to align computed outputs with entity list: {str(e)}")

        # 4. Store each computed value in Database & Cache concurrently
        try:
            for idx, entity_id in enumerate(entity_ids):
                # Ensure value is standard Python JSON-serializable type (e.g. no numpy scalars)
                val = computed_values[idx]
                if hasattr(val, "item"):
                    val = val.item()

                json_val = {"value": val}

                # Insert FeatureValue
                feat_val = FeatureValue(
                    feature_id=feature.id,
                    entity_id=entity_id,
                    value=json_val,
                    timestamp=timestamp,
                    version=feature.version,
                )
                db.add(feat_val)

                # Insert FeatureSnapshot
                feat_snap = FeatureSnapshot(
                    feature_id=feature.id,
                    entity_id=entity_id,
                    snapshot_time=timestamp,
                    value=json_val,
                    created_at=timestamp,
                )
                db.add(feat_snap)

                # Cache to Redis async
                # Key: feature:{feature_id}:{entity_id}
                # Value: json serialized data
                redis_key = f"feature:{str(feature.id)}:{entity_id}"
                redis_data = {
                    "feature_id": str(feature.id),
                    "entity_id": entity_id,
                    "value": val,
                    "timestamp": timestamp.isoformat(),
                }
                import json
                await redis_client.set(redis_key, json.dumps(redis_data), ttl=300)

            # Flush to database
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Database/Cache save failed during compute: {str(e)}", exc_info=True)
            raise ComputationError(f"Failed to store feature values: {str(e)}")

        latency_ms = (time.perf_counter() - start_time) * 1000.0
        return latency_ms
