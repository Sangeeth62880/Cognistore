import json
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from groq import AsyncGroq

from app.config import settings
from app.database import Feature, Model

logger = logging.getLogger(__name__)


class RecommendationService:
    @staticmethod
    def get_groq_client() -> AsyncGroq:
        """Instantiates the AsyncGroq client utilizing settings keys."""
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured in backend settings.")
        return AsyncGroq(api_key=settings.GROQ_API_KEY)

    @classmethod
    async def recommend_features(
        cls,
        db: AsyncSession,
        model_name: str,
        model_description: str,
        model_task: str,
    ) -> Dict[str, Any]:
        """
        Queries all active features and uses LLM semantic similarity to score
        and rank them based on target model description and machine learning task.
        """
        try:
            # 1. Fetch all active features
            stmt = select(Feature).where(Feature.is_active == True)
            result = await db.execute(stmt)
            features = result.scalars().all()

            if len(features) < 3:
                return {
                    "status": "insufficient_features",
                    "message": "At least 3 active features must be registered in the feature store to trigger semantic suggestions.",
                    "recommendations": [],
                }

            # 2. Package features JSON context
            features_data = []
            for feat in features:
                # Get tag keys or details
                tag_list = list(feat.tags.keys()) if feat.tags else []
                features_data.append({
                    "feature_id": str(feat.id),
                    "feature_name": feat.name,
                    "description": feat.description or "No description provided.",
                    "entity_type": feat.entity_type,
                    "tags": tag_list,
                })

            features_json = json.dumps(features_data, indent=2)

            # 3. Instantiate Groq client
            client = cls.get_groq_client()

            system_prompt = (
                "You are an expert ML feature selection expert. A new machine learning model is being registered:\n"
                f"Name: {model_name}\n"
                f"Task Type: {model_task}\n"
                f"Description: {model_description}\n\n"
                "Here are all the available features in the feature store:\n"
                f"{features_json}\n\n"
                "Rank these features by their expected predictive value for this model.\n"
                "For each feature, write a one-sentence explanation in relevance_explanation describing why it is useful or why it has low relevance.\n"
                "Return ONLY a JSON object with a single key 'recommendations' containing the array of ranked objects. Each object MUST have these exact keys:\n"
                "- feature_id (string, UUID)\n"
                "- feature_name (string)\n"
                "- relevance_score (float, 0.0 to 1.0)\n"
                "- relevance_explanation (string, one sentence)\n"
                "- recommended (boolean, true if score > 0.6, else false)\n\n"
                "Ensure you include ALL available features in the recommendations array response, not just the recommended ones. Do not add markdown wrapping, explanations, or any text outside of the JSON object."
            )

            user_content = (
                f"Please analyze the {len(features_data)} features and return the ranked JSON list in 'recommendations'."
            )

            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=1500,
            )

            raw_res = response.choices[0].message.content
            parsed = json.loads(raw_res)
            recommendations = parsed.get("recommendations", [])

            # Secondary safety check: ensure the LLM returned list is sorted by relevance_score descending
            try:
                recommendations.sort(key=lambda x: float(x.get("relevance_score", 0.0)), reverse=True)
            except Exception as sort_err:
                logger.warning(f"Re-sorting recommendations failed: {sort_err}")

            return {
                "status": "success",
                "message": "Semantic feature recommendations computed successfully.",
                "recommendations": recommendations,
            }

        except Exception as e:
            logger.error(f"Failed to generate semantic feature recommendations: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Feature recommendations generation failed: {str(e)}",
            )

    @classmethod
    async def register_model_with_features(
        cls,
        db: AsyncSession,
        model_name: str,
        version: str,
        feature_ids: List[str],
        mlflow_run_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Validates the existence of feature IDs and registers a new ML Model record in the database.
        """
        try:
            # 1. Validate all features are real and active
            validated_ids = []
            for fid_str in feature_ids:
                try:
                    fid = UUID(fid_str)
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid feature ID UUID format: '{fid_str}'",
                    )
                
                stmt = select(Feature).where(Feature.id == fid).where(Feature.is_active == True)
                res = await db.execute(stmt)
                feat = res.scalar_one_or_none()

                if not feat:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Active Feature ID '{fid_str}' not found in registry.",
                    )
                
                validated_ids.append(str(feat.id))

            # 2. Create the model
            new_model = Model(
                name=model_name,
                version=version,
                feature_ids=validated_ids,
                mlflow_run_id=mlflow_run_id,
                is_active=True,
            )

            db.add(new_model)
            await db.commit()
            await db.refresh(new_model)

            # Return model details with linked feature details
            features_details = []
            for fid_str in validated_ids:
                stmt_feat = select(Feature.name).where(Feature.id == UUID(fid_str))
                res_feat = await db.execute(stmt_feat)
                f_name = res_feat.scalar() or "Unknown Feature"
                features_details.append({
                    "feature_id": fid_str,
                    "feature_name": f_name,
                })

            return {
                "id": str(new_model.id),
                "name": new_model.name,
                "version": new_model.version,
                "mlflow_run_id": new_model.mlflow_run_id,
                "created_at": new_model.created_at,
                "is_active": new_model.is_active,
                "features": features_details,
            }

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to register model in database: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Model registry db write failed: {str(e)}",
            )
