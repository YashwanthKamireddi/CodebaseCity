from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from graph.engine.graph_service import GraphService
from api.routes import city_cache # Reuse existing cache for Phase 1 compatibility

router = APIRouter()
graph_service = GraphService()

class TraceRequest(BaseModel):
    city_id: str
    source: str
    target: str

class ClusterResponse(BaseModel):
    communities: Dict[str, int] # node_id -> cluster_id

@router.post("/trace")
async def trace_dependency(req: TraceRequest):
    """
    Enterprise Trace: Finds shortest semantic path between components.
    """
    if req.city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not initialized")

    result = graph_service.trace_shortest_path(req.city_id, req.source, req.target)
    return result

@router.get("/{city_id}/communities", response_model=ClusterResponse)
async def get_communities(city_id: str):
    """
    Enterprise Clustering: Uses Louvain algorithm to discover modules.
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not initialized")

    # Initialize graph if needed
    city_data = city_cache[city_id]

    # Adapt Pydantic models to Dicts for GraphBuilder
    # Assuming city_data.buildings is list of models
    files = [b.model_dump() for b in city_data.buildings]
    roads = [r.model_dump() for r in city_data.roads]

    # Ensure graph exists
    graph_service.get_graph(city_id, files, roads)

    communities = graph_service.compute_communities(city_id)
    return {"communities": communities}
