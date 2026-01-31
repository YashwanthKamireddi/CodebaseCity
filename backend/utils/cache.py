"""
Professional In-Memory Cache for Codebase City
Thread-safe LRU cache with TTL support and metrics.
"""

import time
from typing import Dict, Any, Optional, TypeVar, Generic
from collections import OrderedDict
from threading import Lock
from dataclasses import dataclass, field

T = TypeVar('T')


@dataclass
class CacheEntry(Generic[T]):
    """A single cache entry with metadata."""
    value: T
    created_at: float = field(default_factory=time.time)
    accessed_at: float = field(default_factory=time.time)
    access_count: int = 0


class LRUCache(Generic[T]):
    """
    Thread-safe LRU cache with optional TTL.

    Features:
    - Least Recently Used eviction
    - Optional Time-To-Live expiration
    - Thread-safe operations
    - Access metrics
    """

    def __init__(self, max_size: int = 100, ttl_seconds: Optional[float] = None):
        """
        Initialize the cache.

        Args:
            max_size: Maximum number of entries
            ttl_seconds: Optional time-to-live for entries
        """
        self._cache: OrderedDict[str, CacheEntry[T]] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._lock = Lock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[T]:
        """Get an item from cache."""
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None

            entry = self._cache[key]

            # Check TTL
            if self._ttl and (time.time() - entry.created_at) > self._ttl:
                del self._cache[key]
                self._misses += 1
                return None

            # Update access metadata
            entry.accessed_at = time.time()
            entry.access_count += 1

            # Move to end (most recently used)
            self._cache.move_to_end(key)

            self._hits += 1
            return entry.value

    def set(self, key: str, value: T) -> None:
        """Set an item in cache."""
        with self._lock:
            # Remove oldest if at capacity
            while len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)

            self._cache[key] = CacheEntry(value=value)
            self._cache.move_to_end(key)

    def delete(self, key: str) -> bool:
        """Remove an item from cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    def __contains__(self, key: str) -> bool:
        """Check if key exists in cache."""
        with self._lock:
            if key not in self._cache:
                return False

            # Check TTL
            if self._ttl:
                entry = self._cache[key]
                if (time.time() - entry.created_at) > self._ttl:
                    del self._cache[key]
                    return False

            return True

    def __getitem__(self, key: str) -> T:
        """Get item with dict-like access."""
        value = self.get(key)
        if value is None:
            raise KeyError(key)
        return value

    def __setitem__(self, key: str, value: T) -> None:
        """Set item with dict-like access."""
        self.set(key, value)

    def __delitem__(self, key: str) -> None:
        """Delete item with dict-like access."""
        if not self.delete(key):
            raise KeyError(key)

    def __len__(self) -> int:
        """Get cache size."""
        return len(self._cache)

    def keys(self):
        """Get all cache keys."""
        with self._lock:
            return list(self._cache.keys())

    def values(self):
        """Get all cache values."""
        with self._lock:
            return [entry.value for entry in self._cache.values()]

    def items(self):
        """Get all cache items."""
        with self._lock:
            return [(k, entry.value) for k, entry in self._cache.items()]

    @property
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0

        return {
            "size": len(self._cache),
            "max_size": self._max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{hit_rate:.1f}%",
            "ttl_seconds": self._ttl
        }


# Global cache instance for analyzed cities
# Key: repo_path or github_url
# Value: CityData object
city_cache: LRUCache = LRUCache(max_size=50, ttl_seconds=3600)  # 1 hour TTL
