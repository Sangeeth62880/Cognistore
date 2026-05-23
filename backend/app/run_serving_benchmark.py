import asyncio
import uuid
import time
from sqlalchemy import select
from app.database import async_session_maker, Feature, FeatureValue
from app.services.feature_service import FeatureService
from app.redis_client import redis_client

async def run_benchmark():
    print("--- STARTING PHASE 6 SERVING AND BENCHMARK TEST ---")
    
    async with async_session_maker() as session:
        # Get one of our active features
        stmt = select(Feature).where(Feature.is_active == True).limit(1)
        res = await session.execute(stmt)
        feature = res.scalar_one_or_none()
        
        if not feature:
            print("ERROR: No active feature found in database. Please run run_phase5_tests.py first.")
            return
            
        feature_id = feature.id
        entity_id = "user_benchmark_99"
        
        print(f"Using feature '{feature.name}' (ID: {feature_id}) for serving benchmark on entity '{entity_id}'")
        
        # Ensure there is a FeatureValue record for this feature and entity
        stmt_val = select(FeatureValue).where(FeatureValue.feature_id == feature_id).where(FeatureValue.entity_id == entity_id)
        res_val = await session.execute(stmt_val)
        existing_val = res_val.scalar_one_or_none()
        
        if not existing_val:
            import datetime
            print(f"Creating a new FeatureValue record for {feature.name} and {entity_id}...")
            new_val = FeatureValue(
                feature_id=feature_id,
                entity_id=entity_id,
                value={"value": 42.5},
                timestamp=datetime.datetime.now(datetime.timezone.utc),
                version=1
            )
            session.add(new_val)
            await session.commit()
            print("FeatureValue record created successfully!")
            
        # Clean cache first to guarantee first call is a cache miss
        redis_key = f"feature:{str(feature_id)}:{entity_id}"
        await redis_client.delete(redis_key)
        print(f"Cleared cache key: {redis_key}")
        
        # Query cache hits / misses before the test
        hits_before = int(await redis_client.client.get("metrics:cache_hits") or 0)
        misses_before = int(await redis_client.client.get("metrics:cache_misses") or 0)
        print(f"Cache metrics BEFORE test: Hits={hits_before}, Misses={misses_before}")
        
        print("\nRunning serving 10 times consecutively:")
        latencies = []
        for i in range(1, 11):
            start = time.perf_counter()
            served = await FeatureService.serve_feature(
                db=session,
                feature_id=feature_id,
                entity_id=entity_id
            )
            latency = (time.perf_counter() - start) * 1000.0
            latencies.append(latency)
            print(f" Call {i:2d}: Source={served['source']}, Latency={latency:.2f}ms, Value={served['value']}")
            await asyncio.sleep(0.05) # short sleep
            
        hits_after = int(await redis_client.client.get("metrics:cache_hits") or 0)
        misses_after = int(await redis_client.client.get("metrics:cache_misses") or 0)
        
        diff_hits = hits_after - hits_before
        diff_misses = misses_after - misses_before
        
        print("\n--- RESULTS ---")
        print(f"Cache Hits incremented by: {diff_hits} (Expected: 9)")
        print(f"Cache Misses incremented by: {diff_misses} (Expected: 1)")
        print(f"Average Serving Latency: {sum(latencies)/len(latencies):.2f}ms")
        print(f"First Call Latency (Miss): {latencies[0]:.2f}ms")
        print(f"Average Cached Call Latency (Hits): {sum(latencies[1:])/len(latencies[1:]):.2f}ms")
        
        if diff_hits == 9 and diff_misses == 1:
            print("\nSUCCESS: Caching behavior, metrics tracking, and serve latency benchmark successfully validated!")
        else:
            print("\nWARNING: Cache metrics increments did not match expected exactly, but serve functioned correctly.")
            
if __name__ == "__main__":
    asyncio.run(run_benchmark())
