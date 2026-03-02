"""
Shared helpers for route modules.
Cache key generation, data conversion, and common utilities.
"""

import os
import json
from typing import Dict, List, Tuple, Any

from utils.cache import city_cache
from utils.logger import get_logger

logger = get_logger(__name__)


def get_cache_key(path: str, is_github: bool, repo_name: str) -> str:
    """Generate a consistent cache key."""
    if is_github:
        return f"github_{repo_name}"
    # Normalize local path to cache key
    cache_key = path.replace("/", "_").replace(":", "").replace("\\", "_")
    return cache_key.lstrip("_")


def get_cache_dir() -> str:
    """Get or create the cache directory."""
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "cities")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def city_to_parsed_files(city) -> Tuple[List[Dict[str, Any]], Dict[str, List[str]]]:
    """Convert CityData to parsed files format for intelligence modules."""
    # Build dependency map from roads
    dependency_map: Dict[str, List[str]] = {}
    for road in city.roads:
        if road.source not in dependency_map:
            dependency_map[road.source] = []
        dependency_map[road.source].append(road.target)

    parsed_files = []
    for building in city.buildings:
        parsed_files.append({
            'id': building.id,
            'path': building.path,
            'name': building.name,
            'loc': building.metrics.loc,
            'complexity': building.metrics.complexity,
            'churn': building.metrics.churn,
            'age_days': building.metrics.age_days,
            'functions': [],
            'classes': [],
            'imports': dependency_map.get(building.id, []),
            'exports': []
        })
    return parsed_files, dependency_map


def load_city_from_cache(city_id: str):
    """
    Load a city from memory cache or disk.
    Returns the city object or None.
    """
    from api.models import CityData

    if city_id in city_cache:
        return city_cache[city_id]

    # Try loading from disk
    cache_dir = get_cache_dir()
    cache_file = os.path.join(cache_dir, f"{city_id}.json")

    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                city = CityData(**json.load(f))
                city_cache[city_id] = city
                return city
        except Exception as e:
            logger.warning(f"Failed to load city from disk cache: {e}")

    return None


def build_nx_graph(city):
    """Build a NetworkX DiGraph from a city's buildings and roads."""
    import networkx as nx

    graph = nx.DiGraph()
    for building in city.buildings:
        graph.add_node(building.id)
    for road in city.roads:
        graph.add_edge(road.source, road.target)
    return graph
