from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from api.routes import city_cache # Reuse cache
from parsing.intelligence import IntelligenceEngine
from ai.analyst import RepositoryAnalyst
from ai.advisor import ArchitectureAdvisor
import networkx as nx

router = APIRouter()

class FlowchartRequest(BaseModel):
    city_id: str
    file_path: str

class RepoAnalysisRequest(BaseModel):
    city_id: str

class AdvisorRequest(BaseModel):
    city_id: str
    query: Optional[str] = None

@router.post("/flowchart")
async def get_flowchart(req: FlowchartRequest):
    """
    Generates a Mermaid Flowchart for the specific file.
    """
    if req.city_id not in city_cache:
         raise HTTPException(status_code=404, detail="City not loaded")

    # [Same logic as before...]
    import os
    full_path = req.file_path
    if ".." in full_path:
         raise HTTPException(status_code=400, detail="Invalid path")

    try:
        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            chart = IntelligenceEngine.generate_flowchart(content, full_path)
            return {"chart": chart}
        return {"chart": "graph TD\n Error[File Not Found]"}
    except Exception as e:
        return {"chart": f"graph TD\n Error[{str(e)}]"}

@router.post("/analyze/repo")
async def analyze_repo_intelligence(req: RepoAnalysisRequest):
    """
    Run Deep Analysis on the loaded repository.
    """
    if req.city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not loaded")

    city = city_cache[req.city_id]

    # Reconstruct Graph for Analyst
    graph = nx.DiGraph()
    for b in city.buildings:
        graph.add_node(b.id)
        # Assuming imports are list of target IDs or paths
        # We might need to map paths to IDs if imports are raw paths
        # But let's assume 'imports' list contains resolved dependencies for now
        # If imports is just list of strings, we use them as targets
        if hasattr(b, 'imports') and b.imports:
             for imp in b.imports:
                 graph.add_edge(b.id, imp)

    analyst = RepositoryAnalyst(graph)

    god_objects = analyst.detect_god_objects()
    cycles = analyst.analyze_circular_dependencies()

    return {
        "god_objects": god_objects[:5], # Top 5
        "cycles": cycles[:5],
        "metric_summary": {
            "node_count": graph.number_of_nodes(),
            "edge_count": graph.number_of_edges(),
            "density": nx.density(graph)
        }
    }

@router.post("/advise/arch")
async def advise_architecture(req: AdvisorRequest):
    """
    Get AI-driven architectural advice.
    """
    if req.city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not loaded")

    city = city_cache[req.city_id]
    advisor = ArchitectureAdvisor()

    # Construct Context
    context = f"Repository: {city.name}\n"
    context += f"Files: {len(city.buildings)}\n"
    if city.metadata:
        context += f"Health Grade: {city.metadata.get('health', {}).get('grade', 'Unknown')}\n"
        context += f"Violations: {len(city.metadata.get('layer_violations', []))} found.\n"

    if req.query:
        context += f"User Query: {req.query}\n"

    advice = await advisor.get_migration_advice(context)
    return {"advice": advice}
