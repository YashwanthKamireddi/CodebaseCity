"""
Graph Routes
Dependency graph visualization endpoint.
"""

from fastapi import APIRouter, HTTPException

from utils.logger import get_logger

from api.models import (
    CityData, GraphNode, GraphEdge, DependencyGraphResponse
)

from ._helpers import load_city_from_cache

logger = get_logger(__name__)

router = APIRouter()


@router.get("/graph/{city_id}", tags=["Graph"])
async def get_dependency_graph(city_id: str):
    """
    Get the 2D dependency graph for visualization.

    Returns nodes (files) and edges (dependencies) with layout positions.
    """
    city = load_city_from_cache(city_id)
    if city is None:
        raise HTTPException(status_code=404, detail="City not found. Analyze first.")

    # Build graph nodes from buildings
    nodes = []
    for building in city.buildings:
        nodes.append(GraphNode(
            id=building.id,
            name=building.name,
            path=building.path,
            type="file",
            language=building.language,
            loc=building.metrics.loc,
            complexity=building.metrics.complexity,
            district_id=building.district_id,
            x=building.position.get('x', 0),
            y=building.position.get('z', 0)  # Use z as y for 2D view
        ))

    # Build edges from roads
    edges = []
    for road in city.roads:
        edges.append(GraphEdge(
            source=road.source,
            target=road.target,
            weight=road.weight,
            type="import"
        ))

    return DependencyGraphResponse(
        nodes=nodes,
        edges=edges,
        stats={
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "districts": len(city.districts)
        }
    )
