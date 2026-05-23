import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)


class AsyncRedisClient:
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self.client = aioredis.from_url(
            self.redis_url,
            decode_responses=True,
            max_connections=50,
            ssl_cert_reqs="none",
        )

    async def ping(self) -> bool:
        """Ping the Redis server to check connection health."""
        try:
            return await self.client.ping()
        except Exception as e:
            logger.error(f"Redis ping failed: {e}")
            return False

    async def get(self, key: str) -> str | None:
        """Retrieve the value of a key."""
        try:
            return await self.client.get(key)
        except Exception as e:
            logger.error(f"Redis GET failed for key {key}: {e}")
            return None

    async def set(self, key: str, value: str, ttl: int | None = None) -> bool:
        """Set a key-value pair, optionally with a Time-To-Live (TTL) in seconds."""
        try:
            if ttl is not None:
                await self.client.set(key, value, ex=ttl)
            else:
                await self.client.set(key, value)
            return True
        except Exception as e:
            logger.error(f"Redis SET failed for key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete a key."""
        try:
            deleted_count = await self.client.delete(key)
            return deleted_count > 0
        except Exception as e:
            logger.error(f"Redis DELETE failed for key {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if a key exists."""
        try:
            exists_count = await self.client.exists(key)
            return exists_count > 0
        except Exception as e:
            logger.error(f"Redis EXISTS failed for key {key}: {e}")
            return False

    async def close(self) -> None:
        """Close connection."""
        await self.client.aclose()


# Global Redis Client singleton
redis_client = AsyncRedisClient()
