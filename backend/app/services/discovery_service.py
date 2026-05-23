import ast
import json
import logging
import uuid
import numpy as np
import pandas as pd
from sqlalchemy import select
from app.config import settings
from app.database import async_session_maker, Dataset
from app.services.nl_service import NLService

logger = logging.getLogger(__name__)


class DiscoveryService:
    @staticmethod
    async def discover_features(dataset_id: str) -> list[dict]:
        """
        Loads the dataset schema from the database, sends it to Groq Cloud LLM
        to auto-discover 8 high-value features, validates them using AST parsing,
        runs dry-runs on the actual first 100 rows of the CSV, and returns
        the safe suggestions list.
        """
        logger.info(f"Triggering automated feature discovery for dataset ID {dataset_id}")
        
        # Load dataset from DB
        async with async_session_maker() as session:
            stmt = select(Dataset).where(Dataset.id == uuid.UUID(dataset_id))
            res = await session.execute(stmt)
            db_dataset = res.scalar_one_or_none()
            
            if not db_dataset:
                raise ValueError(f"Dataset with ID {dataset_id} not found in database.")
            
            file_path = db_dataset.file_path
            schema_info = db_dataset.schema_info
            is_processed = db_dataset.is_processed

        if not is_processed or not schema_info:
            raise ValueError(f"Dataset {dataset_id} is not processed yet. Ingestion is pending.")

        # Instantiate Groq client
        client = NLService.get_groq_client()

        system_prompt = (
            "You are an expert ML feature engineer. Given a dataset schema, suggest 8 high-value ML features.\n\n"
            "For each feature:\n"
            "- Write production-grade pandas computation code (the input is a DataFrame called df).\n"
            "- The code must assign the computed values to a variable called result, which must be a dict "
            "mapping entity_id strings (e.g. 'user_1', 'user_2') to computed values.\n"
            "- The code must be safe, handle nulls, handle division by zero, and be optimized.\n"
            "- Give the feature a descriptive snake_case name (max 50 characters).\n"
            "- Explain what it represents and why it is highly valuable for predictive modeling.\n"
            "- Classify the feature type into one of these badges: ratio, aggregation, time_based, interaction, statistical, encoding.\n\n"
            "Return ONLY a JSON array of objects with these exact keys:\n"
            "- feature_name (string, snake_case)\n"
            "- description (string)\n"
            "- computation_code (string, valid Python pandas code)\n"
            "- feature_type (string, ratio/aggregation/time_based/interaction/statistical/encoding)\n"
            "- ml_value_explanation (string)\n"
            "- required_columns (list of strings)\n\n"
            "No markdown block tags, no conversational headers, no explanations outside the JSON."
        )

        user_content = (
            f"Dataset Name: {db_dataset.name}\n"
            f"Row Count: {db_dataset.row_count}\n"
            f"Schema Info Details (JSON):\n{json.dumps(schema_info, indent=2)}\n\n"
            f"Please review the available columns, missing values, relationships, and potential entity/time keys above, "
            f"and return the 8 recommended ML features in strict JSON format now."
        )

        try:
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=2500,
            )

            response_text = response.choices[0].message.content
            logger.info("Groq Cloud returned feature suggestions raw response.")
            
            # Clean markdown wrappers if any
            clean_text = response_text.strip()
            if clean_text.startswith("```"):
                first_nl = clean_text.find("\n")
                last_bt = clean_text.rfind("```")
                if first_nl != -1 and last_bt != -1:
                    clean_text = clean_text[first_nl:last_bt].strip()

            parsed = json.loads(clean_text)
            
            # Groq model might return {"suggestions": [...]} or directly a list
            if isinstance(parsed, dict):
                # Try to extract the list of features
                suggestions = parsed.get("suggestions", parsed.get("features", []))
                if not suggestions and isinstance(parsed, dict):
                    # Check if keys are actually lists
                    for k, v in parsed.items():
                        if isinstance(v, list) and len(v) > 0:
                            suggestions = v
                            break
            else:
                suggestions = parsed

            if not isinstance(suggestions, list):
                raise ValueError(f"AI response is not a valid list. Found type: {type(suggestions)}")

        except Exception as e:
            logger.error(f"Failed to generate or parse AI feature suggestions: {e}", exc_info=True)
            raise ValueError(f"AI recommender failed to produce structured suggestions: {str(e)}")

        # Validate and Dry-run suggestions against real sample rows
        logger.info(f"Loaded {len(suggestions)} suggestions. Beginning AST and real-sample dry-runs.")
        
        try:
            df_sample = pd.read_csv(file_path, nrows=100)
        except Exception as csv_err:
            logger.error(f"Failed to read dataset sample for dry-running: {csv_err}")
            raise ValueError(f"Failed to load CSV sample for dry-run checks: {csv_err}")

        validated_suggestions = []

        # Secure exec sandbox environment configuration
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

        for idx, item in enumerate(suggestions):
            try:
                name = item.get("feature_name")
                code = item.get("computation_code")
                
                if not name or not code:
                    logger.warning(f"Skipping suggestion {idx} due to missing name or code.")
                    continue

                # 1. AST check
                ast.parse(code)
                
                # 2. Dry-run execution
                safe_globals = {
                    "__builtins__": safe_builtins,
                    "pd": pd,
                    "np": np,
                    "df": df_sample,
                }
                
                # Run the code
                exec(code, safe_globals)
                result = safe_globals.get("result")
                
                if result is None:
                    raise ValueError("Code did not populate result variable")
                if not isinstance(result, dict):
                    raise ValueError(f"result must be a dict, got {type(result).__name__}")
                
                # Success!
                validated_suggestions.append(item)
                logger.info(f"Suggestion '{name}' successfully validated via real-sample dry-run.")

            except Exception as check_err:
                logger.warning(f"Skipping suggested feature '{item.get('feature_name', idx)}' due to dry-run fail: {check_err}")
                continue

        logger.info(f"Feature discovery completed. {len(validated_suggestions)} of {len(suggestions)} suggestions passed all checks.")
        return validated_suggestions
