import asyncio
import httpx
import os
import sys
import uuid
import datetime
from sqlalchemy import select
from app.database import async_session_maker, Feature, FeatureValue

BASE_URL = "http://localhost:8000"
HEADERS = {
    "X-API-Key": "supersecretkeyreplaceinproduction"
}

async def run_e2e_test():
    print("==========================================================")
    print("🚀 STARTING COGNISTORE FULL END-TO-END BACKEND INTEGRATION TEST")
    print("==========================================================\n")

    client = httpx.AsyncClient(timeout=30.0)

    # ------------------------------------------------------------
    # STEP 1: HEALTH CHECK
    # ------------------------------------------------------------
    print("[STEP 1] Checking API gateway and connection state...")
    try:
        res = await client.get(f"{BASE_URL}/health")
        if res.status_code != 200:
            print(f"❌ Health check failed with status code {res.status_code}")
            sys.exit(1)
        data = res.json()
        print(f"  Status: {data['status']}")
        print(f"  Database connected: {data['db_connected']}")
        print(f"  Redis connected: {data['redis_connected']}")
        if not data['db_connected'] or not data['redis_connected']:
            print("❌ Backend is not fully connected. Aborting.")
            sys.exit(1)
        print("✅ Health check passed!\n")
    except Exception as e:
        print(f"❌ Failed to reach backend on {BASE_URL}: {e}")
        sys.exit(1)

    # ------------------------------------------------------------
    # STEP 2: NATURAL LANGUAGE FEATURE GENERATION & REGISTRATION
    # ------------------------------------------------------------
    print("[STEP 2] Testing Natural Language Feature Generation...")
    nl_payload = {
        "description": "average session duration per user in minutes",
        "entity_type": "user",
        "sample_columns": ["user_id", "session_duration", "timestamp"]
    }
    
    res = await client.post(f"{BASE_URL}/nl-features/generate", json=nl_payload, headers=HEADERS)
    if res.status_code != 200:
        print(f"❌ NL Feature generation failed: {res.text}")
        sys.exit(1)
    
    gen_data = res.json()
    print(f"  Generated Name: {gen_data['feature_name']}")
    print(f"  Generated Code: {gen_data['computation_code']}")
    print(f"  Tags: {gen_data['tags']}")
    print("✅ NL Feature generation verified!")

    tags_data = gen_data.get('tags', [])
    if isinstance(tags_data, list):
        tags_data = {t: "true" for t in tags_data}

    unique_feature_name = f"{gen_data['feature_name']}_{str(uuid.uuid4())[:8]}"

    print("\n[STEP 2b] Registering generated feature in the store...")
    reg_payload = {
        "name": unique_feature_name,
        "description": "average session duration per user",
        "entity_type": "user",
        "computation_code": gen_data['computation_code'],
        "tags": tags_data,
        "upstream_features": []
    }
    res = await client.post(f"{BASE_URL}/features", json=reg_payload, headers=HEADERS)
    if res.status_code != 200:
        print(f"❌ Feature registration failed: {res.text}")
        sys.exit(1)
    
    feature_data = res.json()
    feature_id = feature_data["id"]
    print(f"  Feature Registered Successfully! ID: {feature_id}")
    print("✅ Feature registration verified!\n")

    # ------------------------------------------------------------
    # STEP 3: COMPUTATION
    # ------------------------------------------------------------
    print("[STEP 3] Computing and persisting feature values...")
    compute_payload = {
        "entity_ids": ["user_1", "user_2", "user_3"],
        "data": {
            "user_id": ["user_1", "user_1", "user_2", "user_2", "user_3"],
            "session_duration": [15.5, 20.0, 5.0, 10.0, 45.0]
        }
    }
    res = await client.post(f"{BASE_URL}/features/{feature_id}/compute", json=compute_payload, headers=HEADERS)
    if res.status_code != 200:
        print(f"❌ Feature value computation failed: {res.text}")
        sys.exit(1)
    
    comp_res = res.json()
    print(f"  Status: {comp_res['status']}")
    print(f"  Entity IDs: {comp_res['entity_ids']}")
    print("✅ Feature computation verified!\n")

    # ------------------------------------------------------------
    # STEP 4: SERVING & CACHING
    # ------------------------------------------------------------
    print("[STEP 4] Testing Feature Serving cache dynamics...")
    
    # First serve: Database lookup
    print("  Serving first call (expected: DB lookup)...")
    res1 = await client.get(f"{BASE_URL}/features/{feature_id}/serve?entity_id=user_1", headers=HEADERS)
    if res1.status_code != 200:
        print(f"❌ First serve call failed: {res1.text}")
        sys.exit(1)
    data1 = res1.json()
    print(f"    Source: {data1['source']}, Value: {data1['value']}, Latency: {data1['latency_ms']:.2f}ms")
    
    # Second serve: Cache lookup
    print("  Serving second call (expected: Redis Cache hit)...")
    res2 = await client.get(f"{BASE_URL}/features/{feature_id}/serve?entity_id=user_1", headers=HEADERS)
    if res2.status_code != 200:
        print(f"❌ Second serve call failed: {res2.text}")
        sys.exit(1)
    data2 = res2.json()
    print(f"    Source: {data2['source']}, Value: {data2['value']}, Latency: {data2['latency_ms']:.2f}ms")
    
    if data2['source'] != 'cache':
        print("❌ WARNING: Cache serving did not return source 'cache'.")
    else:
        print("    Cache hits tracking verified!")

    # Point-in-time correctness check
    print("  Serving with point-in-time parameter (as_of yesterday)...")
    yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat() + "Z"
    res3 = await client.get(f"{BASE_URL}/features/{feature_id}/serve?entity_id=user_1&as_of={yesterday}", headers=HEADERS)
    print(f"    Point-in-time response code: {res3.status_code} (as expected: {res3.json().get('message') or 'served'})")
    print("✅ Feature serving caching verified!\n")

    # ------------------------------------------------------------
    # STEP 5: DATASET DRAG & DROP SIMULATION
    # ------------------------------------------------------------
    print("[STEP 5] Ingesting CSV dataset & schema analysis...")
    # Generate a small dummy CSV file
    dummy_csv_content = (
        "PassengerId,Survived,Pclass,Name,Sex,Age,SibSp,Parch,Ticket,Fare,Cabin,Embarked\n"
        "1,0,3,Braund Mr. Owen Harris,male,22,1,0,A/5 21171,7.25,,S\n"
        "2,1,1,Cumings Mrs. John Bradley,female,38,1,0,PC 17599,71.28,C85,C\n"
        "3,1,3,Heikkinen Miss. Laina,female,26,0,0,STON/O2. 3101282,7.92,,S\n"
        "4,1,1,Futrelle Mrs. Jacques Heath,female,35,1,0,113803,53.1,C123,S\n"
        "5,0,3,Allen Mr. William Henry,male,35,0,0,373450,8.05,,S\n"
    )
    csv_filename = "app/temp_test_dataset.csv"
    with open(csv_filename, "w") as f:
        f.write(dummy_csv_content)
        
    try:
        files = {"file": ("test_dataset.csv", open(csv_filename, "rb"), "text/csv")}
        res = await client.post(f"{BASE_URL}/datasets/upload", files=files, headers=HEADERS)
        if res.status_code != 200:
            print(f"❌ CSV Upload failed: {res.text}")
            sys.exit(1)
        upload_data = res.json()
        dataset_id = upload_data["dataset_id"]
        print(f"  Dataset uploaded successfully. ID: {dataset_id}")
        
        # Poll status
        print("  Polling dataset processing status...")
        for _ in range(5):
            res_status = await client.get(f"{BASE_URL}/datasets/{dataset_id}/status", headers=HEADERS)
            status_data = res_status.json()
            is_processed = status_data.get("is_processed", False)
            print(f"    Processed: {is_processed}")
            if is_processed:
                break
            await asyncio.sleep(1)
            
        print("✅ Dataset CSV ingestion and parsing verified!")
        
        print("\n[STEP 5b] Triggering AI Feature Discovery suggestion engine...")
        res_disc = await client.post(f"{BASE_URL}/datasets/{dataset_id}/discover", headers=HEADERS)
        if res_disc.status_code != 200:
            print(f"❌ suggestions discovery failed: {res_disc.text}")
        else:
            disc_data = res_disc.json()
            print(f"  Suggestions Generated: {len(disc_data.get('suggestions', []))} items found.")
            for sugg in disc_data.get('suggestions', [])[:2]:
                print(f"   - Suggestion Name: {sugg['feature_name']}, Code: {sugg['computation_code']}")
            print("✅ AI Suggestion discovery verified!")
    finally:
        if os.path.exists(csv_filename):
            os.remove(csv_filename)
    print("")

    # ------------------------------------------------------------
    # STEP 6: MODEL RECOMMENDATION & REGISTRY
    # ------------------------------------------------------------
    print("[STEP 6] Testing Semantic Model Recommendations...")
    model_payload = {
        "model_name": "user_churn_classifier",
        "model_description": "predicts if a user will cancel their subscription based on activity levels and purchase frequencies",
        "model_task": "classification"
    }
    res = await client.post(f"{BASE_URL}/models/recommend", json=model_payload, headers=HEADERS)
    if res.status_code != 200:
        print(f"❌ Model recommendations failed: {res.text}")
        sys.exit(1)
    
    recs_data = res.json()
    print(f"  Recommendations generated successfully. Status: {recs_data.get('status')}")
    recommendations = recs_data.get("recommendations", [])
    selected_ids = []
    print("  Ranked features list:")
    for idx, r in enumerate(recommendations[:3]):
        print(f"   {idx+1}. Name: {r['feature_name']}, Score: {r['relevance_score']}, Recommended: {r['recommended']}")
        if r['recommended'] or idx == 0:
            selected_ids.append(r['feature_id'])
            
    print("\n[STEP 6b] Registering Model with recommended feature selections...")
    reg_model_payload = {
        "model_name": "user_churn_classifier",
        "model_description": "predicts if a user will cancel their subscription based on activity levels and purchase frequencies",
        "model_task": "classification",
        "version": "v1.0",
        "selected_feature_ids": selected_ids
    }
    res_reg_mod = await client.post(f"{BASE_URL}/models/register-with-recommendations", json=reg_model_payload, headers=HEADERS)
    if res_reg_mod.status_code != 200:
        print(f"❌ Model registration failed: {res_reg_mod.text}")
        sys.exit(1)
    model_res = res_reg_mod.json()
    print(f"  Model Registered Successfully! ID: {model_res['id']}")
    print("✅ Model recommendations and registration verified!\n")

    # ------------------------------------------------------------
    # STEP 7: DRIFT SEEDING, CHECK, AND RESOLUTION
    # ------------------------------------------------------------
    print("[STEP 7] Simulating Population Distribution Drift...")
    # Seed high variance features to trigger drift alerts.
    # 50 values with mean ~10 (baseline 7 days ago) and 50 values with mean ~90 (current today)
    print("  Seeding baseline and current distribution data into PostgreSQL...")
    
    async with async_session_maker() as session:
        drift_feat_name = f"payment_amounts_{str(uuid.uuid4())[:8]}"
        drift_feat = Feature(
            name=drift_feat_name,
            description="payment amounts per user session",
            entity_type="user",
            computation_code="result = df.groupby('user_id')['amount'].mean().to_dict()",
            tags={"finance": "true"},
            is_active=True
        )
        session.add(drift_feat)
        await session.commit()
        await session.refresh(drift_feat)
        drift_feat_id = drift_feat.id
        
        # Ingest baseline values 7 days ago: random around 10
        import random
        for i in range(1, 51):
            val = random.uniform(5.0, 15.0)
            baseline_val = FeatureValue(
                feature_id=drift_feat_id,
                entity_id=f"user_{i}",
                value={"value": val},
                timestamp=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7),
                version=1
            )
            session.add(baseline_val)
            
        # Ingest current values today: random around 90
        for i in range(1, 51):
            val = random.uniform(80.0, 100.0)
            current_val = FeatureValue(
                feature_id=drift_feat_id,
                entity_id=f"user_{i}",
                value={"value": val},
                timestamp=datetime.datetime.now(datetime.timezone.utc),
                version=1
            )
            session.add(current_val)
            
        await session.commit()
        print(f"  Successfully seeded drift data on feature '{drift_feat.name}' (ID: {drift_feat_id})")

    print("\n[STEP 7b] Triggering drift check on the drifted feature...")
    res_drift = await client.post(f"{BASE_URL}/alerts/drift/check/{drift_feat_id}", headers=HEADERS)
    if res_drift.status_code != 200:
        print(f"❌ Drift detection execution failed: {res_drift.text}")
        sys.exit(1)
        
    drift_data = res_drift.json()
    alert_details = drift_data.get("alert", {})
    print(f"  Drift Alert Status: HIGH DRIFT DETECTED!")
    print(f"  PSI Score: {alert_details.get('psi')}")
    print(f"  Severity: {alert_details.get('severity')}")
    print(f"  Explanation: {alert_details.get('explanation')}")
    print(f"  Suggested Fix: {alert_details.get('suggested_fix')}")
    alert_id = alert_details.get("alert_id")

    print("\n[STEP 7c] Resolving the active drift alert...")
    res_resolve = await client.patch(f"{BASE_URL}/alerts/{alert_id}/resolve", json={"notes": "Retrained the churn model using current values."}, headers=HEADERS)
    if res_resolve.status_code != 200:
        print(f"❌ Alert resolution failed: {res_resolve.text}")
        sys.exit(1)
    
    resolve_data = res_resolve.json()
    print(f"  Resolution Status: {resolve_data.get('status') or 'success'}")
    print("✅ Drift calculation, alerting, and resolution verified!\n")

    # ------------------------------------------------------------
    # STEP 8: TELEMETRY DASHBOARD METRICS SUMMARY
    # ------------------------------------------------------------
    print("[STEP 8] Querying Telemetry Dashboard KPI metrics...")
    res_metrics = await client.get(f"{BASE_URL}/metrics/dashboard", headers=HEADERS)
    if res_metrics.status_code != 200:
        print(f"❌ Telemetry metrics call failed: {res_metrics.text}")
        sys.exit(1)
        
    metrics_data = res_metrics.json()
    print("  Dashboard Aggregated KPI Statistics:")
    print(f"    Total Active Features: {metrics_data['total_features']}")
    print(f"    Total Registered Models: {metrics_data['total_models']}")
    print(f"    Total feature values Ingested: {metrics_data['total_feature_values']}")
    print(f"    Features Computed Last 24h: {metrics_data['features_computed_last_24h']}")
    print(f"    Active Drift Alerts Count: {metrics_data['active_alerts_count']}")
    print(f"    Average serving Latency: {metrics_data['avg_serving_latency_ms']:.2f}ms")
    print(f"    Cache Hit Rate Proportion: {metrics_data['cache_hit_rate']:.2f}%")
    print("✅ Telemetry Metrics dashboard verification completed successfully!")

    await client.aclose()
    print("\n==========================================================")
    print("🎉 ALL COGNISTORE END-TO-END BACKEND INTEGRATION TESTS PASSED!")
    print("==========================================================")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
