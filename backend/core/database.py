"""
Database/Cache Service
Redis integration for caching and session management.
"""

import json
import hashlib
from typing import Optional, Any, Dict
from datetime import datetime, timedelta
from functools import wraps
import asyncio

# In-memory fallback cache
_memory_cache: Dict[str, Dict[str, Any]] = {}


class CacheService:
    """
    Caching service with Redis support and in-memory fallback.

    Features:
    - Automatic serialization/deserialization
    - TTL support
    - Key prefixing
    - Graceful fallback to memory cache
    """

    def __init__(self, prefix: str = "codebase_city"):
        self.prefix = prefix
        self.redis = None
        self._init_redis()

    def _init_redis(self):
        """Initialize Redis connection if available."""
        try:
            import redis
            self.redis = redis.Redis(
                host='localhost',
                port=6379,
                db=0,
                decode_responses=True,
                socket_timeout=2,
                socket_connect_timeout=2
            )
            # Test connection
            self.redis.ping()
        except Exception:
            self.redis = None

    def _make_key(self, key: str) -> str:
        """Create prefixed key."""
        return f"{self.prefix}:{key}"

    def _serialize(self, value: Any) -> str:
        """Serialize value to JSON."""
        return json.dumps(value, default=str)

    def _deserialize(self, value: str) -> Any:
        """Deserialize JSON value."""
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        full_key = self._make_key(key)

        if self.redis:
            try:
                value = await asyncio.to_thread(self.redis.get, full_key)
                return self._deserialize(value) if value else None
            except Exception:
                pass

        # Fallback to memory cache
        entry = _memory_cache.get(full_key)
        if entry:
            if entry['expires'] and datetime.now() > entry['expires']:
                del _memory_cache[full_key]
                return None
            return entry['value']

        return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL."""
        full_key = self._make_key(key)
        serialized = self._serialize(value)

        if self.redis:
            try:
                await asyncio.to_thread(self.redis.setex, full_key, ttl, serialized)
                return True
            except Exception:
                pass

        # Fallback to memory cache
        _memory_cache[full_key] = {
            'value': value,
            'expires': datetime.now() + timedelta(seconds=ttl)
        }
        return True

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        full_key = self._make_key(key)

        if self.redis:
            try:
                await asyncio.to_thread(self.redis.delete, full_key)
            except Exception:
                pass

        if full_key in _memory_cache:
            del _memory_cache[full_key]

        return True

    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        full_key = self._make_key(key)

        if self.redis:
            try:
                return bool(await asyncio.to_thread(self.redis.exists, full_key))
            except Exception:
                pass

        entry = _memory_cache.get(full_key)
        if entry:
            if entry['expires'] and datetime.now() > entry['expires']:
                del _memory_cache[full_key]
                return False
            return True

        return False

    def clear_memory_cache(self):
        """Clear in-memory cache."""
        _memory_cache.clear()

    @property
    def is_redis_connected(self) -> bool:
        """Check if Redis is connected."""
        if not self.redis:
            return False
        try:
            self.redis.ping()
            return True
        except Exception:
            return False


# Global cache instance
cache = CacheService()


def cached(ttl: int = 3600, key_prefix: str = ""):
    """
    Decorator for caching function results.

    Usage:
        @cached(ttl=600, key_prefix="analysis")
        async def analyze_repo(path: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            key_parts = [key_prefix or func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))

            cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()

            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result
            await cache.set(cache_key, result, ttl)

            return result

        return wrapper
    return decorator
