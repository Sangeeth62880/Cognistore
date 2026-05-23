import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import numpy as np
from sqlalchemy import select
from app.database import async_session_maker, Feature, FeatureValue, DriftAlert, SeverityEnum
from app.services.nl_service import NLService

logger = logging.getLogger(__name__)


def calculate_psi(baseline: List[float], current: List[float], num_buckets: int = 10) -> float:
    """
    Computes the Population Stability Index (PSI) between baseline and current values.
    Uses equal-frequency binning on the baseline dataset and Laplace smoothing to prevent divisions by zero.
    """
    if not baseline or not current:
        return 0.0
        
    baseline_arr = np.array(baseline, dtype=float)
    current_arr = np.array(current, dtype=float)
    
    # Filter out NaNs
    baseline_arr = baseline_arr[~np.isnan(baseline_arr)]
    current_arr = current_arr[~np.isnan(current_arr)]
    
    if len(baseline_arr) == 0 or len(current_arr) == 0:
        return 0.0
        
    try:
        # Equal-frequency binning boundaries based on percentiles of baseline
        percentiles = np.linspace(0, 100, num_buckets + 1)
        buckets = np.percentile(baseline_arr, percentiles)
        
        # Extend outer boundaries to cover all values in both distributions
        min_all = min(float(np.min(baseline_arr)), float(np.min(current_arr)))
        max_all = max(float(np.max(baseline_arr)), float(np.max(current_arr)))
        buckets[0] = min_all - 1e-5
        buckets[-1] = max_all + 1e-5
        
        # Histogram counts
        baseline_counts, _ = np.histogram(baseline_arr, bins=buckets)
        current_counts, _ = np.histogram(current_arr, bins=buckets)
        
        # Convert to proportions
        baseline_props = baseline_counts / len(baseline_arr)
        current_props = current_counts / len(current_arr)
        
        # Apply Laplace smoothing (small constant) for empty bins
        baseline_props = np.where(baseline_props == 0, 1e-4, baseline_props)
        current_props = np.where(current_props == 0, 1e-4, current_props)
        
        # Re-normalize proportions
        baseline_props /= np.sum(baseline_props)
        current_props /= np.sum(current_props)
        
        # Compute PSI: (Actual - Expected) * ln(Actual / Expected)
        psi_value = np.sum((current_props - baseline_props) * np.log(current_props / baseline_props))
        return float(psi_value)
    except Exception as e:
        logger.warning(f"Error calculating PSI: {e}")
        return 0.0


def calculate_kl_divergence(baseline: List[float], current: List[float], num_buckets: int = 10) -> float:
    """
    Computes the Kullback-Leibler (KL) Divergence: KL(Current || Baseline).
    Measures asymmetric entropy difference between actual vs baseline distributions.
    """
    if not baseline or not current:
        return 0.0
        
    baseline_arr = np.array(baseline, dtype=float)
    current_arr = np.array(current, dtype=float)
    
    baseline_arr = baseline_arr[~np.isnan(baseline_arr)]
    current_arr = current_arr[~np.isnan(current_arr)]
    
    if len(baseline_arr) == 0 or len(current_arr) == 0:
        return 0.0
        
    try:
        percentiles = np.linspace(0, 100, num_buckets + 1)
        buckets = np.percentile(baseline_arr, percentiles)
        
        # Extend outer boundaries to cover all values in both distributions
        min_all = min(float(np.min(baseline_arr)), float(np.min(current_arr)))
        max_all = max(float(np.max(baseline_arr)), float(np.max(current_arr)))
        buckets[0] = min_all - 1e-5
        buckets[-1] = max_all + 1e-5
        
        baseline_counts, _ = np.histogram(baseline_arr, bins=buckets)
        current_counts, _ = np.histogram(current_arr, bins=buckets)
        
        baseline_props = baseline_counts / len(baseline_arr)
        current_props = current_counts / len(current_arr)
        
        baseline_props = np.where(baseline_props == 0, 1e-4, baseline_props)
        current_props = np.where(current_props == 0, 1e-4, current_props)
        
        baseline_props /= np.sum(baseline_props)
        current_props /= np.sum(current_props)
        
        # KL(P || Q) = sum P(x) * log(P(x) / Q(x)) where P is current, Q is baseline
        kl_value = np.sum(current_props * np.log(current_props / baseline_props))
        return float(kl_value)
    except Exception as e:
        logger.warning(f"Error calculating KL divergence: {e}")
        return 0.0


class DriftService:
    @staticmethod
    async def compute_feature_statistics(
        feature_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> dict:
        """
        Queries feature value registry records over a timeframe, computing
        basic statistical variables: mean, std, median, p25/p75/p95, null rate, and unique counts.
        """
        async with async_session_maker() as session:
            stmt = (
                select(FeatureValue)
                .where(FeatureValue.feature_id == uuid.UUID(feature_id))
                .where(FeatureValue.timestamp >= start_time)
                .where(FeatureValue.timestamp <= end_time)
            )
            result = await session.execute(stmt)
            records = result.scalars().all()

        total_records = len(records)
        vals = []
        null_count = 0
        
        for r in records:
            val = r.value.get("value")
            if val is None:
                null_count += 1
            else:
                try:
                    vals.append(float(val))
                except (ValueError, TypeError):
                    null_count += 1

        null_rate = float(null_count / total_records) if total_records > 0 else 0.0
        unique_count = len(set(vals))
        count = len(vals)

        if count == 0:
            return {
                "count": 0,
                "mean": 0.0,
                "std": 0.0,
                "median": 0.0,
                "p25": 0.0,
                "p75": 0.0,
                "p95": 0.0,
                "null_rate": null_rate,
                "unique_count": 0,
                "raw_values": []
            }

        # Calculate statistics
        mean_val = float(np.mean(vals))
        std_val = float(np.std(vals))
        median_val = float(np.percentile(vals, 50))
        p25_val = float(np.percentile(vals, 25))
        p75_val = float(np.percentile(vals, 75))
        p95_val = float(np.percentile(vals, 95))

        return {
            "count": count,
            "mean": mean_val,
            "std": std_val,
            "median": median_val,
            "p25": p25_val,
            "p75": p75_val,
            "p95": p95_val,
            "null_rate": null_rate,
            "unique_count": unique_count,
            "raw_values": vals
        }

    @classmethod
    async def detect_drift(cls, feature_id: str) -> Optional[dict]:
        """
        Executes drift checking over a feature:
        1. Compares current values (last 24h) against baseline values (7 days ago, 24h duration).
        2. Bypasses if total values in either window is < 10.
        3. Computes PSI and KL Divergence.
        4. If PSI exceeds 0.2, triggers Groq Cloud AI to synthesize alert explanation and saves alert.
        """
        current_end = datetime.utcnow().replace(tzinfo=timezone.utc)
        current_start = current_end - timedelta(hours=24)

        baseline_end = current_end - timedelta(days=6)
        baseline_start = current_end - timedelta(days=8)

        current_stats = await cls.compute_feature_statistics(feature_id, current_start, current_end)
        baseline_stats = await cls.compute_feature_statistics(feature_id, baseline_start, baseline_end)

        current_count = current_stats["count"]
        baseline_count = baseline_stats["count"]

        # Ensure statistical relevance
        if current_count < 10 or baseline_count < 10:
            logger.info(f"Skipping drift check for feature ID {feature_id}: insufficient data (Baseline: {baseline_count}, Current: {current_count})")
            return None

        baseline_vals = baseline_stats["raw_values"]
        current_vals = current_stats["raw_values"]

        psi = calculate_psi(baseline_vals, current_vals)
        kl_div = calculate_kl_divergence(baseline_vals, current_vals)

        logger.info(f"Feature ID {feature_id} drift check results: PSI={psi:.4f}, KL={kl_div:.4f}")

        # Check threshold
        if psi > 0.2:
            # Shift detected, create smart explanations
            current_clean = {k: v for k, v in current_stats.items() if k != "raw_values"}
            baseline_clean = {k: v for k, v in baseline_stats.items() if k != "raw_values"}
            
            explanation_data = await cls.explain_drift(
                feature_id, current_clean, baseline_clean, psi
            )

            severity = SeverityEnum.high if psi > 0.4 else SeverityEnum.medium

            async with async_session_maker() as session:
                alert = DriftAlert(
                    feature_id=uuid.UUID(feature_id),
                    severity=severity,
                    explanation=explanation_data.get("explanation"),
                    upstream_correlation={
                        "psi": round(psi, 4),
                        "kl_divergence": round(kl_div, 4),
                        "baseline_stats": baseline_clean,
                        "current_stats": current_clean,
                        "drift_type": explanation_data.get("drift_type"),
                        "likely_cause": explanation_data.get("likely_cause"),
                    },
                    suggested_fix=explanation_data.get("suggested_fix"),
                    is_resolved=False,
                )
                session.add(alert)
                await session.commit()
                await session.refresh(alert)
                
                logger.warning(f"Drift alert created for feature ID {feature_id} with severity {severity}.")
                
                return {
                    "alert_id": str(alert.id),
                    "feature_id": str(alert.feature_id),
                    "severity": alert.severity.value,
                    "explanation": alert.explanation,
                    "suggested_fix": alert.suggested_fix,
                    "psi": round(psi, 4),
                    "kl_divergence": round(kl_div, 4),
                }

        return None

    @staticmethod
    async def explain_drift(
        feature_id: str,
        current_stats: dict,
        baseline_stats: dict,
        psi: float,
    ) -> dict:
        """
        Asks Groq Cloud Llama-3 model in strict JSON mode to outline ML monitoring explanations
        detailing the drift type, likely root causes, and recommended actionable corrections.
        """
        async with async_session_maker() as session:
            stmt = select(Feature).where(Feature.id == uuid.UUID(feature_id))
            res = await session.execute(stmt)
            feat = res.scalar_one_or_none()
            
            if not feat:
                return {
                    "explanation": "Feature has drifted significantly. Baseline vs Current distributions are distinct.",
                    "drift_type": "Covariate Drift",
                    "likely_cause": "Ingested dataset data characteristics shifted over time.",
                    "suggested_fix": "Retrain models using recent feature snapshots."
                }
            
            name = feat.name
            description = feat.description or "No description provided."

        client = NLService.get_groq_client()

        system_prompt = (
            "You are an expert ML monitoring and model reliability engineer.\n\n"
            "An online feature store metric has drifted significantly beyond safety thresholds.\n"
            "Generate a highly professional, context-rich drift alert explanation.\n\n"
            "Return ONLY a JSON object with these exact keys:\n"
            "- explanation (string, 2-3 sentences explaining what drift occurred based on the statistics change)\n"
            "- drift_type (string, select from: Covariate Drift / Label Drift / Concept Drift / Data Quality Issue)\n"
            "- likely_cause (string, one sentence explanation of the most probable cause)\n"
            "- suggested_fix (string, one sentence actionable recommendation to remediate the shift)\n\n"
            "No markdown wraps, no explanations outside the JSON."
        )

        user_content = (
            f"Feature Name: {name}\n"
            f"Feature Description: {description}\n"
            f"Population Stability Index (PSI): {psi:.4f}\n"
            f"Baseline Stats (7 days ago): {json.dumps(baseline_stats)}\n"
            f"Current Stats (Last 24 hours): {json.dumps(current_stats)}\n\n"
            f"Please write the structured ML explanation now."
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
                max_tokens=800,
            )

            response_text = response.choices[0].message.content
            
            clean_text = response_text.strip()
            if clean_text.startswith("```"):
                first_nl = clean_text.find("\n")
                last_bt = clean_text.rfind("```")
                if first_nl != -1 and last_bt != -1:
                    clean_text = clean_text[first_nl:last_bt].strip()

            parsed = json.loads(clean_text)
            return parsed
        except Exception as e:
            logger.error(f"Groq drift describer failed: {e}", exc_info=True)
            return {
                "explanation": f"Feature '{name}' has drifted significantly with PSI score of {psi:.4f}. Current statistics deviate from baseline bounds.",
                "drift_type": "Covariate Drift",
                "likely_cause": "Calculated value distribution characteristics shifted over time.",
                "suggested_fix": "Review upstream pipelines or trigger immediate model retraining."
            }

    @classmethod
    async def run_drift_check_all_features(cls) -> List[dict]:
        """
        Runs drift evaluations concurrently across all active features.
        Utilizes bounded asyncio semaphores (limit of 5 concurrent checks) to ensure DB sanity.
        """
        logger.info("Initializing global drift checking sweep across all active features...")
        
        async with async_session_maker() as session:
            stmt = select(Feature).where(Feature.is_active == True)
            res = await session.execute(stmt)
            features = res.scalars().all()

        if not features:
            logger.info("No active features found to check for drift.")
            return []

        semaphore = asyncio.Semaphore(5)

        async def sem_check(feat_id: str):
            async with semaphore:
                try:
                    # Apply a strict 30-second timeout per check
                    return await asyncio.wait_for(cls.detect_drift(feat_id), timeout=30.0)
                except asyncio.TimeoutError:
                    logger.error(f"Drift checking for feature {feat_id} timed out after 30 seconds.")
                    return None
                except Exception as check_err:
                    logger.error(f"Drift check failed on feature {feat_id}: {check_err}", exc_info=True)
                    return None

        tasks = [sem_check(str(f.id)) for f in features]
        results = await asyncio.gather(*tasks)

        # Filter out None values (features without drift or skipped)
        alerts_triggered = [r for r in results if r is not None]
        logger.info(f"Global drift checks complete. Inspected {len(features)} features. Triggered {len(alerts_triggered)} alerts.")
        return alerts_triggered
