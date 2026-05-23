import ast
import json
import logging
import re
from typing import Any, Dict, List
from uuid import UUID

import numpy as np
import pandas as pd
from groq import AsyncGroq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import Feature

logger = logging.getLogger(__name__)


class NLService:
    @staticmethod
    def get_groq_client() -> AsyncGroq:
        """Instantiates the AsyncGroq client utilizing settings keys."""
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured in backend settings.")
        return AsyncGroq(api_key=settings.GROQ_API_KEY)

    @classmethod
    async def generate_feature_from_description(
        cls,
        description: str,
        entity_type: str,
        sample_columns: List[str],
        retry: bool = True,
    ) -> Dict[str, Any]:
        """
        Interacts with Groq Cloud Llama-3 model utilizing JSON mode to translate
        natural language feature descriptions into valid pandas code.
        """
        client = cls.get_groq_client()

        system_prompt = (
            "You are an expert ML feature engineer. Given a plain English description of a feature, "
            "generate production-grade Python code to compute it using pandas.\n\n"
            "The code receives a pandas DataFrame called df and must assign the result to a variable "
            "called result which must be a dict mapping entity_id strings (e.g. 'user_1', 'user_2') to computed values.\n"
            "The code must be safe, efficient, and handle edge cases like empty dataframes, null values, and division by zero.\n\n"
            "Return ONLY a JSON object with these exact keys:\n"
            "- computation_code (string, the Python code)\n"
            "- feature_name (string, snake_case, max 50 chars)\n"
            "- description (string, what the feature does)\n"
            "- expected_input_columns (list of strings)\n"
            "- tags (list of relevant strings like time_series/aggregation/ratio etc)\n\n"
            "No markdown wrapping, no explanation outside the JSON."
        )

        user_content = (
            f"Feature Description: {description}\n"
            f"Target Entity Type: {entity_type}\n"
            f"Sample Input Columns: {sample_columns}\n\n"
            f"Please generate the feature configuration now. Ensure any entity key in sample columns "
            f"(like 'user_id' or 'customer_id') is used to extract entity_id strings for the final 'result' dict keys."
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
                max_tokens=1000,
            )

            result_raw = response.choices[0].message.content
            spec = json.loads(result_raw)

        except Exception as err:
            logger.error(f"Groq API call or JSON decoding failed: {err}", exc_info=True)
            if retry:
                logger.info("Retrying Groq API call with cleaner prompts...")
                return await cls.generate_feature_from_description(
                    description=description,
                    entity_type=entity_type,
                    sample_columns=sample_columns,
                    retry=False,
                )
            raise ValueError(f"Failed to generate structured feature JSON from Groq: {str(err)}")

        # Validate spec keys
        required_keys = ["computation_code", "feature_name", "description", "expected_input_columns", "tags"]
        for key in required_keys:
            if key not in spec:
                raise ValueError(f"Generated spec is missing required key '{key}'. Obtained: {spec.keys()}")

        # 1. AST Validation
        try:
            ast.parse(spec["computation_code"])
        except SyntaxError as syntax_err:
            raise ValueError(f"Generated computation code contains syntax errors: {syntax_err.msg} at line {syntax_err.lineno}")

        # 2. Dry-Run Validation on Synthetic DataFrame
        await cls.dry_run_computation(spec["computation_code"], spec["expected_input_columns"], entity_type)

        return spec

    @classmethod
    async def refine_feature_code(
        cls,
        current_feature: Feature,
        feedback: str,
        retry: bool = True,
    ) -> Dict[str, Any]:
        """
        Sends existing feature spec and refinement feedback to Groq Llama-3 model
        to iterate on the computation code.
        """
        client = cls.get_groq_client()

        system_prompt = (
            "You are an expert ML feature engineer refinement tool. You are provided with an existing feature definition, "
            "its computation code, and explicit user feedback. Iterate and improve the Python computation code "
            "according to the feedback.\n\n"
            "The updated code receives a pandas DataFrame called df and must assign the result to a variable "
            "called result which must be a dict mapping entity_id strings to computed values.\n"
            "Ensure the code is safe, robust, and incorporates the improvements asked by the user.\n\n"
            "Return ONLY a JSON object with these exact keys:\n"
            "- computation_code (string, the improved Python code)\n"
            "- description (string, updated description of what the feature tracks, if feedback alters it)\n"
            "- tags (list of strings)\n\n"
            "No markdown formatting, no explanations outside of the JSON."
        )

        user_content = (
            f"Feature Name: {current_feature.name}\n"
            f"Description: {current_feature.description}\n"
            f"Entity Type: {current_feature.entity_type}\n"
            f"Current Computation Code:\n```python\n{current_feature.computation_code}\n```\n\n"
            f"Feedback: {feedback}\n\n"
            f"Please generate the refined computation configuration now."
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
                max_tokens=1000,
            )

            result_raw = response.choices[0].message.content
            spec = json.loads(result_raw)

        except Exception as err:
            logger.error(f"Groq feature refinement failed: {err}", exc_info=True)
            if retry:
                return await cls.refine_feature_code(current_feature, feedback, retry=False)
            raise ValueError(f"Failed to refine feature code: {str(err)}")

        required_keys = ["computation_code", "description", "tags"]
        for key in required_keys:
            if key not in spec:
                raise ValueError(f"Refinement spec is missing required key '{key}'")

        # AST check
        try:
            ast.parse(spec["computation_code"])
        except SyntaxError as e:
            raise ValueError(f"Refined code contains syntax errors: {e.msg}")

        return spec

    @staticmethod
    async def dry_run_computation(
        code: str,
        columns: List[str] = None,
        entity_type: str = None,
    ) -> None:
        """
        Generates a small synthetic DataFrame and dry-runs the computation code
        in a safe namespace to ensure no runtime errors occur.
        """
        # extract all df['col'] and df["col"] references
        cols = re.findall(r"df\[[\'\"](\w+)[\'\"]\]", code)
        cols = list(set(cols))
        
        data = {}
        for col in cols:
            if any(x in col.lower() for x in ['id', 'user', 'customer', 'entity']):
                # Never null - these are entity identifiers
                data[col] = ['user_1', 'user_2', 'user_3', 'user_1', 'user_2']
            elif any(x in col.lower() for x in ['status', 'type', 'category', 'state']):
                # Never null - categorical
                data[col] = ['success', 'failed', 'success', 'pending', 'success']
            elif any(x in col.lower() for x in ['date', 'time', 'at']):
                data[col] = pd.date_range('2024-01-01', periods=5).tolist()
            else:
                # Numeric - include some nulls to test null handling
                data[col] = [10.0, None, 30.0, None, 50.0]
        
        try:
            df = pd.DataFrame(data)
        except Exception as e:
            raise ValueError(f"Failed to assemble dry-run synthetic DataFrame: {str(e)}")

        # Execute in sandboxed exec environment
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
        # Print and log the computation code right before dry-run execution
        logger.info(f"Dry-running computation code:\n{code}")
        print(f"\n--- DRY-RUNNING CODE ---\n{code}\n------------------------\n")

        exec_error = None
        try:
            exec(code, safe_globals)
        except Exception as e:
            exec_error = e

        if exec_error is not None:
            raise ValueError(f'Runtime dry-run failed: {str(exec_error)}')

        result = safe_globals.get('result')
        if result is None:
            raise ValueError('Code did not assign to a variable named result')
        if not isinstance(result, dict):
            raise ValueError(f'result must be a dict, got {type(result).__name__}')
        # Empty dict is valid - do not raise here
