"""
Demo City Generator — Creates a world-class demo city for NexusForge,
a fictional full-stack SaaS platform.

Loads pre-generated data from frontend/public/demo-city.json.
Serves the same demo via the backend /api/demo endpoint.
"""

from api.models import CityData, Building, District, Road, BuildingMetrics
import json
import os


def create_demo_city() -> CityData:
    """
    Load the pre-generated demo city from demo-city.json.
    Falls back to minimal data if the JSON file is missing.
    """
    json_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "frontend", "public", "demo-city.json"
    )
    json_path = os.path.normpath(json_path)

    if not os.path.exists(json_path):
        return CityData(
            name="Demo City (fallback)",
            buildings=[],
            districts=[],
            roads=[],
            stats={},
        )

    with open(json_path) as f:
        data = json.load(f)

    buildings = []
    for b in data.get("buildings", []):
        metrics = b.get("metrics", {})
        buildings.append(Building(
            id=b["id"],
            name=b["name"],
            path=b["path"],
            district_id=b["district_id"],
            position=b["position"],
            dimensions=b["dimensions"],
            metrics=BuildingMetrics(
                loc=metrics.get("loc", 0),
                complexity=metrics.get("complexity", 1),
                churn=metrics.get("churn", 0),
                age_days=metrics.get("age_days", 0),
                dependencies_in=metrics.get("dependencies_in", 0),
                dependencies_out=metrics.get("dependencies_out", 0),
                size_bytes=metrics.get("size_bytes", 0),
                coverage=metrics.get("coverage", 80.0),
                debt=metrics.get("debt", 0.0),
            ),
            language=b.get("language", "unknown"),
            decay_level=b.get("decay_level", 0.0),
            is_hotspot=b.get("is_hotspot", False),
            author=b.get("author"),
            email=b.get("email"),
            email_hash=b.get("email_hash"),
        ))

    districts = []
    for d in data.get("districts", []):
        districts.append(District(
            id=d["id"],
            name=d["name"],
            color=d["color"],
            center=d["center"],
            boundary=d["boundary"],
            building_count=d["building_count"],
            description=d.get("description"),
        ))

    roads = []
    for r in data.get("roads", []):
        roads.append(Road(
            source=r["source"],
            target=r["target"],
            weight=r.get("weight", 1.0),
            is_cross_district=r.get("is_cross_district", False),
        ))

    return CityData(
        name=data.get("name", "NexusForge Demo"),
        buildings=buildings,
        districts=districts,
        roads=roads,
        stats=data.get("stats", {}),
    )
