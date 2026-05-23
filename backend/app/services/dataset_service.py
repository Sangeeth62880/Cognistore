import logging
import uuid
import pandas as pd
from sqlalchemy import select
from app.database import async_session_maker, Dataset

logger = logging.getLogger(__name__)


class DatasetService:
    @staticmethod
    async def process_uploaded_dataset(file_path: str, dataset_id: str) -> dict:
        """
        Processes an uploaded CSV dataset in a background task:
        1. Reads and computes row counts.
        2. Computes per-column data types, nulls, unique values, and sample values.
        3. Computes statistical variables (mean, std, skewness, min, max) for numeric columns.
        4. Detects Pearson correlations and columns indicating entity IDs or timestamp indices.
        5. Persists calculations in Supabase under datasets.schema_info.
        """
        logger.info(f"Starting background processing for dataset ID {dataset_id} (path: {file_path})")
        
        try:
            # Read CSV
            df = pd.read_csv(file_path)
            row_count = len(df)
            
            schema_info = {
                "columns": {},
                "correlations": {},
                "relationships": {
                    "highly_correlated_pairs": [],
                    "potential_entity_ids": [],
                    "potential_timestamps": []
                }
            }

            # Populate per-column metrics
            for col in df.columns:
                col_series = df[col]
                dtype = str(col_series.dtype)
                null_count = int(col_series.isnull().sum())
                null_percentage = float((null_count / row_count) * 100) if row_count > 0 else 0.0
                unique_count = int(col_series.nunique())
                
                # Coerce first 5 sample values to serializable types
                raw_samples = col_series.dropna().head(5).tolist()
                sample_values = []
                for val in raw_samples:
                    if pd.isnull(val):
                        continue
                    if isinstance(val, (pd.Timestamp, pd.Timedelta)):
                        sample_values.append(str(val))
                    elif hasattr(val, "item"):  # Convert numpy scalars to native python types
                        sample_values.append(val.item())
                    else:
                        sample_values.append(val)

                is_numeric = bool(pd.api.types.is_numeric_dtype(col_series))
                stats = {}

                if is_numeric and not col_series.empty:
                    try:
                        mean_val = col_series.mean()
                        std_val = col_series.std()
                        min_val = col_series.min()
                        max_val = col_series.max()
                        skew_val = col_series.skew()
                        
                        stats = {
                            "mean": float(mean_val) if pd.notnull(mean_val) else None,
                            "std": float(std_val) if pd.notnull(std_val) else None,
                            "min": float(min_val) if pd.notnull(min_val) else None,
                            "max": float(max_val) if pd.notnull(max_val) else None,
                            "skewness": float(skew_val) if pd.notnull(skew_val) else None,
                        }
                    except Exception as stats_err:
                        logger.warning(f"Could not compute stats for column {col}: {stats_err}")

                schema_info["columns"][col] = {
                    "dtype": dtype,
                    "null_count": null_count,
                    "null_percentage": round(null_percentage, 2),
                    "unique_count": unique_count,
                    "sample_values": sample_values,
                    "stats": stats,
                    "is_numeric": is_numeric
                }

            # Detect Pearson relationships & highly correlated pairs (> 0.7)
            numeric_cols = [c for c, info in schema_info["columns"].items() if info["is_numeric"]]
            if len(numeric_cols) > 1:
                try:
                    corr_matrix = df[numeric_cols].corr(method="pearson")
                    for i in range(len(numeric_cols)):
                        for j in range(i + 1, len(numeric_cols)):
                            col_a = numeric_cols[i]
                            col_b = numeric_cols[j]
                            r_val = corr_matrix.loc[col_a, col_b]
                            if pd.notnull(r_val):
                                if col_a not in schema_info["correlations"]:
                                    schema_info["correlations"][col_a] = {}
                                schema_info["correlations"][col_a][col_b] = round(float(r_val), 4)

                                if abs(r_val) > 0.7:
                                    schema_info["relationships"]["highly_correlated_pairs"].append({
                                        "column_a": col_a,
                                        "column_b": col_b,
                                        "correlation": round(float(r_val), 4)
                                    })
                except Exception as corr_err:
                    logger.warning(f"Could not calculate correlations: {corr_err}")

            # Detect potential entity ID mappings
            for col, info in schema_info["columns"].items():
                col_lower = col.lower()
                if any(kw in col_lower for kw in ["id", "user", "customer", "device", "merchant", "entity", "member", "client"]):
                    schema_info["relationships"]["potential_entity_ids"].append({
                        "column": col,
                        "reason": f"Matches keyword pattern with {info['unique_count']} unique records."
                    })

            # Detect potential timestamp column mappings
            for col, info in schema_info["columns"].items():
                col_lower = col.lower()
                if any(kw in col_lower for kw in ["date", "time", "at", "timestamp", "created", "updated", "epoch"]):
                    schema_info["relationships"]["potential_timestamps"].append({
                        "column": col,
                        "reason": "Matches timestamp naming convention."
                    })
                elif info["dtype"] in ["datetime64[ns]", "timedelta64[ns]"]:
                    schema_info["relationships"]["potential_timestamps"].append({
                        "column": col,
                        "reason": "Matches timezone datatype format."
                    })

            # Commit to Database
            async with async_session_maker() as session:
                stmt = select(Dataset).where(Dataset.id == uuid.UUID(dataset_id))
                res = await session.execute(stmt)
                db_dataset = res.scalar_one_or_none()
                if db_dataset:
                    db_dataset.schema_info = schema_info
                    db_dataset.row_count = row_count
                    db_dataset.is_processed = True
                    session.add(db_dataset)
                    await session.commit()
                    logger.info(f"Dataset ID {dataset_id} successfully processed and recorded.")
                else:
                    logger.error(f"Dataset ID {dataset_id} could not be found in DB during background ingestion.")

            return schema_info

        except Exception as e:
            logger.error(f"Background dataset parsing failure: {e}", exc_info=True)
            # Update record to processed=False but let user know of failure via error tags if needed
            raise e
