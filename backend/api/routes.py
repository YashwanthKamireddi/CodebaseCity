"""
API Routes for Codebase City
Enterprise-grade API endpoints with proper error handling and validation.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional, Dict, Any
import os
import json

from utils.limiter import limiter
from utils.cache import city_cache
from utils.logger import get_logger, log_execution_time
from utils.responses import success_response
from utils.validators import validate_path, validate_query

from .models import (
    AnalyzeRequest, CityData, ChatRequest, ChatResponse,
    BuildingDetailRequest, BuildingDetail, SearchRequest,
    SearchResponse, SearchResult, FileContentResponse,
    GraphNode, GraphEdge, DependencyGraphResponse
)

# Services
from parsing.analyzer import CodebaseAnalyzer
from parsing.search import CodeSearchEngine
from ai.city_guide import CityGuide
from services.git_service import GitService

# Intelligence modules
from parsing.intelligence import (
    DeadCodeDetector,
    CodeHealthAnalyzer,
    ImpactAnalyzer,
    SmartSearch,
    SearchType,
    CodeQualityScanner,
    RefactoringHelper,
    DependencyAnalyzer
)

logger = get_logger(__name__)

router = APIRouter()

# Singleton services (consider dependency injection for testing)
analyzer = CodebaseAnalyzer()
search_engine = CodeSearchEngine()
guide = CityGuide()


def _get_cache_key(path: str, is_github: bool, repo_name: str) -> str:
    """Generate a consistent cache key."""
    if is_github:
        return f"github_{repo_name}"
    # Normalize local path to cache key
    cache_key = path.replace("/", "_").replace(":", "").replace("\\", "_")
    return cache_key.lstrip("_")


def _get_cache_dir() -> str:
    """Get or create the cache directory."""
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cities")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


@router.post("/analyze", response_model=CityData, tags=["Analysis"])
@limiter.limit("5/minute")
async def analyze_codebase(request: Request, body: AnalyzeRequest):
    """
    Analyze a codebase and return city data.

    Accepts:
    - Local filesystem paths (e.g., /home/user/project)
    - GitHub URLs (e.g., https://github.com/owner/repo)
    - GitHub shorthand (e.g., owner/repo)

    Returns a complete city representation with buildings, districts, and roads.
    """
    try:
        path, is_github, repo_name = GitService.parse_url(body.path)
        cache_key = _get_cache_key(path, is_github, repo_name)
        cache_dir = _get_cache_dir()
        cache_file = os.path.join(cache_dir, f"{cache_key}.json")

        # 1. Check Memory Cache
        if cache_key in city_cache:
            logger.info(f"Cache hit (memory): {cache_key}")
            return city_cache[cache_key]

        # 2. Check Disk Cache
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data_dict = json.load(f)
                    city = CityData(**data_dict)

                    # Validate cached path still exists
                    if city.path and os.path.exists(city.path):
                        logger.info(f"Cache hit (disk): {cache_key}")
                        city_cache[cache_key] = city
                        return city
                    else:
                        logger.info(f"Cache invalid (path missing): {cache_key}")
            except Exception as e:
                logger.warning(f"Cache read failed: {e}")

        # 3. Perform Analysis
        if is_github:
            path = GitService.clone_repo(path, repo_name)
            logger.info(f"Analyzing GitHub repo: {repo_name}")
            city_data = await analyzer.analyze(path, body.max_files)
            city_data.name = repo_name
            city_data.path = path
        else:
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail=f"Path not found: {body.path}")

            logger.info(f"Analyzing local path: {path}")
            city_data = await analyzer.analyze(path, body.max_files)
            city_data.path = os.path.abspath(path)

        # Index files for search
        if hasattr(analyzer, 'last_parsed_files'):
            search_engine.index_files(analyzer.last_parsed_files)

        # 4. Save to Cache
        city_cache[cache_key] = city_data
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                f.write(city_data.model_dump_json(indent=2))
            logger.info(f"Cached to disk: {cache_file}")
        except Exception as e:
            logger.warning(f"Failed to cache: {e}")

        return city_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/search", response_model=SearchResponse, tags=["Search"])
async def search_code(request: SearchRequest):
    """
    Semantic code search across the indexed codebase.

    Returns ranked results with match previews.
    """
    try:
        results_raw = search_engine.search(request.query)
        results = [SearchResult(**r) for r in results_raw]
        return SearchResponse(results=results, total=len(results), query=request.query)
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail="Search failed")


@router.get("/city/{city_id}", response_model=CityData, tags=["Analysis"])
async def get_city(city_id: str):
    """
    Get a previously analyzed city by ID.
    """
    if city_id not in city_cache:
        # Try to load from disk
        cache_dir = _get_cache_dir()
        cache_file = os.path.join(cache_dir, f"{city_id}.json")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    city = CityData(**json.load(f))
                    city_cache[city_id] = city
                    return city
            except Exception:
                pass

        raise HTTPException(status_code=404, detail="City not found. Analyze first.")

    return city_cache[city_id]


@router.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_with_guide(request: ChatRequest):
    """
    Chat with the AI City Guide about the codebase.

    The guide can help navigate the city, explain code, and identify issues.
    """
    try:
        response = await guide.chat(
            message=request.message,
            context=request.context,
            history=request.history
        )
        return response
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail="Chat service unavailable")


@router.post("/building/detail", response_model=BuildingDetail, tags=["Analysis"])
async def get_building_detail(request: BuildingDetailRequest):
    """
    Get detailed information about a specific building (file).

    Includes AI-generated summary, functions, classes, and improvement suggestions.
    """
    # Search all cached cities
    for city in city_cache.values():
        for building in city.buildings:
            if building.id == request.building_id:
                try:
                    detail = await guide.get_building_detail(building, city)
                    return detail
                except Exception as e:
                    logger.error(f"Detail generation failed: {e}")
                    # Return basic detail without AI
                    return BuildingDetail(
                        id=building.id,
                        name=building.name,
                        path=building.path,
                        summary=building.summary or "No summary available",
                        metrics=building.metrics,
                        functions=[],
                        classes=[],
                        imports=[],
                        issues=[],
                        suggestions=[]
                    )

    raise HTTPException(status_code=404, detail="Building not found")


@router.get("/demo", tags=["Analysis"])
async def get_demo_city():
    """
    Get a pre-built demo city for testing.

    Returns a sample city with mock data for UI development.
    """
    from graph.demo_city import create_demo_city
    return create_demo_city()


@router.delete("/cache/{city_id}")
async def clear_cache(city_id: str):
    """
    Clear a city from cache
    """
    if city_id in city_cache:
        del city_cache[city_id]
        return {"status": "cleared"}
    raise HTTPException(status_code=404, detail="City not found in cache")


@router.get("/files/content", response_model=FileContentResponse)
async def get_file_content(path: str):
    """
    Get raw content of a file.
    Handles both local paths and GitHub URLs.
    """
    # Handle GitHub URLs
    if path.startswith("http") and "github.com" in path:
        import httpx
        try:
            # Convert github.com/user/repo/blob/branch/file to raw.githubusercontent.com...
            # Handling:
            # 1. Standard: github.com/.../blob/main/file -> raw.githubusercontent.com/.../main/file
            # 2. Implicit: github.com/.../file -> raw.githubusercontent.com/.../HEAD/file (try main/master)

            base_raw = path.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

            async with httpx.AsyncClient() as client:
                # Try direct replacement first
                response = await client.get(base_raw)
                if response.status_code == 200:
                    return FileContentResponse(content=response.text)

                # If failed, and URL looks like it's missing branch (no /blob/ originally implies no branch deep link)
                if "/blob/" not in path:
                     # Inject branch suggestions
                     # base_raw might be raw.githubusercontent.com/user/repo/file
                     # We need raw.githubusercontent.com/user/repo/BRANCH/file
                     parts = base_raw.split("/")
                     # parts: [https:, , raw..., user, repo, ...files...]
                     if len(parts) > 5:
                         base_root = "/".join(parts[:5]) # .../user/repo
                         file_path = "/".join(parts[5:])

                         for branch in ["main", "master", "HEAD"]:
                             candidate = f"{base_root}/{branch}/{file_path}"
                             resp = await client.get(candidate)
                             if resp.status_code == 200:
                                 return FileContentResponse(content=resp.text)

                raise HTTPException(status_code=404, detail="Failed to fetch from GitHub (404)")
        except Exception as e:
            import traceback
            traceback.print_exc() # Log full stack trace
            print(f"[API ERROR] GitHub fetch failed for {path}: {e}")
            raise HTTPException(status_code=500, detail=f"GitHub fetch failed: {str(e)}")

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Limit size to 1MB
        if os.path.getsize(path) > 1024 * 1024:
             raise HTTPException(status_code=413, detail="File too large")

        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return FileContentResponse(content=f.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ NEW FEATURES ============

@router.post("/search/symbols", tags=["Search"])
async def search_symbols(request: Request):
    """
    Search for code symbols (functions, classes, variables).

    Returns results with line numbers and file locations.
    """
    try:
        body = await request.json()
        query = body.get('query', '')
        symbol_type = body.get('symbol_type', 'all')

        if not query or len(query) < 2:
            return {"results": [], "total": 0}

        results = search_engine.search_symbols(query, symbol_type)
        return {"results": results, "total": len(results)}
    except Exception as e:
        logger.error(f"Symbol search failed: {e}")
        raise HTTPException(status_code=500, detail="Symbol search failed")


@router.get("/graph/{city_id}", tags=["Graph"])
async def get_dependency_graph(city_id: str):
    """
    Get the 2D dependency graph for visualization.

    Returns nodes (files) and edges (dependencies) with layout positions.
    """
    from .models import GraphNode, GraphEdge, DependencyGraphResponse

    if city_id not in city_cache:
        # Try loading from disk
        cache_dir = _get_cache_dir()
        cache_file = os.path.join(cache_dir, f"{city_id}.json")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    city = CityData(**json.load(f))
                    city_cache[city_id] = city
            except Exception:
                raise HTTPException(status_code=404, detail="City not found")
        else:
            raise HTTPException(status_code=404, detail="City not found. Analyze first.")

    city = city_cache[city_id]

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


@router.post("/analyze/incremental", tags=["Analysis"])
async def analyze_incremental(request: Request):
    """
    Incremental analysis - only analyze changed files since last commit.

    Much faster for large repos with small changes.
    """
    try:
        body = await request.json()
        path = body.get('path', '')
        since_commit = body.get('since_commit', 'HEAD~1')
        max_files = body.get('max_files', 500)

        if not path or not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Path not found")

        # Get changed files from git
        import subprocess
        result = subprocess.run(
            ['git', 'diff', '--name-only', since_commit],
            capture_output=True,
            text=True,
            cwd=path
        )

        if result.returncode != 0:
            # Fallback to full analysis
            logger.warning(f"Git diff failed, falling back to full analysis")
            city_data = await analyzer.analyze(path, max_files)
            return city_data

        changed_files = [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]

        if not changed_files:
            # No changes, return cached or minimal result
            return {"message": "No changes detected", "changed_files": []}

        # For now, we'll do full analysis but return info about changes
        # Future: implement true incremental with file-level caching
        city_data = await analyzer.analyze(path, max_files)

        # Mark changed buildings
        for building in city_data.buildings:
            if any(building.path.endswith(cf) for cf in changed_files):
                building.is_hotspot = True  # Highlight changes

        return city_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Incremental analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/export", tags=["Export"])
async def export_report(request: Request):
    """
    Export analysis report in various formats.

    Supports: json, markdown, html
    """
    try:
        body = await request.json()
        city_id = body.get('city_id', '')
        format_type = body.get('format', 'json')

        if city_id not in city_cache:
            raise HTTPException(status_code=404, detail="City not found")

        city = city_cache[city_id]

        if format_type == 'json':
            return city.model_dump()

        elif format_type == 'markdown':
            # Generate markdown report
            md = f"# Code City Report: {city.name}\n\n"
            md += f"## Summary\n\n"
            md += f"- **Total Files:** {city.stats.get('total_files', 0)}\n"
            md += f"- **Total Lines of Code:** {city.stats.get('total_loc', 0)}\n"
            md += f"- **Districts:** {city.stats.get('total_districts', 0)}\n"
            md += f"- **Dependencies:** {city.stats.get('total_dependencies', 0)}\n"
            md += f"- **Hotspots:** {city.stats.get('hotspots', 0)}\n\n"

            md += f"## Districts\n\n"
            for district in city.districts:
                md += f"### {district.name}\n"
                md += f"- Buildings: {district.building_count}\n"
                if district.description:
                    md += f"- Description: {district.description}\n"
                md += "\n"

            md += f"## Top Files by Complexity\n\n"
            sorted_buildings = sorted(city.buildings, key=lambda b: b.metrics.complexity, reverse=True)[:10]
            for b in sorted_buildings:
                md += f"- `{b.path}` - Complexity: {b.metrics.complexity}, LOC: {b.metrics.loc}\n"

            return {"content": md, "format": "markdown"}

        elif format_type == 'html':
            # Generate HTML report
            html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Code City Report: {city.name}</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; background: #0f172a; color: #e2e8f0; }}
        h1 {{ color: #3b82f6; }}
        h2 {{ color: #60a5fa; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }}
        .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }}
        .stat {{ background: #1e293b; padding: 1rem; border-radius: 8px; text-align: center; }}
        .stat-value {{ font-size: 2rem; font-weight: bold; color: #3b82f6; }}
        .stat-label {{ color: #94a3b8; font-size: 0.875rem; }}
        table {{ width: 100%; border-collapse: collapse; margin: 1rem 0; }}
        th, td {{ padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }}
        th {{ background: #1e293b; }}
        code {{ background: #1e293b; padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.875rem; }}
    </style>
</head>
<body>
    <h1>🏙️ {city.name}</h1>

    <h2>Summary</h2>
    <div class="stats">
        <div class="stat"><div class="stat-value">{city.stats.get('total_files', 0)}</div><div class="stat-label">Files</div></div>
        <div class="stat"><div class="stat-value">{city.stats.get('total_loc', 0):,}</div><div class="stat-label">Lines of Code</div></div>
        <div class="stat"><div class="stat-value">{city.stats.get('total_districts', 0)}</div><div class="stat-label">Districts</div></div>
        <div class="stat"><div class="stat-value">{city.stats.get('hotspots', 0)}</div><div class="stat-label">Hotspots</div></div>
    </div>

    <h2>Districts</h2>
    <table>
        <tr><th>Name</th><th>Buildings</th><th>Color</th></tr>
        {''.join(f"<tr><td>{d.name}</td><td>{d.building_count}</td><td><span style='color:{d.color}'>{d.color}</span></td></tr>" for d in city.districts)}
    </table>

    <h2>Top Files by Complexity</h2>
    <table>
        <tr><th>File</th><th>Complexity</th><th>LOC</th><th>Language</th></tr>
        {''.join(f"<tr><td><code>{b.path}</code></td><td>{b.metrics.complexity}</td><td>{b.metrics.loc}</td><td>{b.language}</td></tr>" for b in sorted(city.buildings, key=lambda x: x.metrics.complexity, reverse=True)[:10])}
    </table>
</body>
</html>"""
            return {"content": html, "format": "html"}

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format_type}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# ============================================================================
# INTELLIGENCE ENDPOINTS - Developer Tools
# ============================================================================

@router.get("/intelligence/health/{city_id}", tags=["Intelligence"])
async def get_code_health(city_id: str):
    """
    Get comprehensive code health analysis for a city.
    
    Returns:
    - Overall health score (0-100)
    - Grade distribution (A-F)
    - Hotspots (files needing attention)
    - Actionable recommendations
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        # Convert buildings to parsed file format
        parsed_files = []
        for building in city.buildings:
            parsed_files.append({
                'id': building.id,
                'path': building.path,
                'name': building.name,
                'loc': building.metrics.loc,
                'complexity': building.metrics.complexity,
                'functions': [],  # Would need raw parse data
                'classes': [],
                'imports': building.dependencies or []
            })
        
        health_analyzer = CodeHealthAnalyzer(parsed_files)
        report = health_analyzer.analyze_codebase()
        
        return {
            "status": "success",
            "city_id": city_id,
            "health": report
        }
    except Exception as e:
        logger.error(f"Health analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Health analysis failed: {str(e)}")


@router.get("/intelligence/dead-code/{city_id}", tags=["Intelligence"])
async def find_dead_code(city_id: str):
    """
    Detect potentially dead or unused code in the codebase.
    
    Returns:
    - Orphan files (no imports)
    - Unused exports
    - One-way dependencies
    - Low usage files
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        import networkx as nx
        
        # Build dependency graph from roads
        graph = nx.DiGraph()
        for building in city.buildings:
            graph.add_node(building.id)
        
        for road in city.roads:
            graph.add_edge(road.source, road.target)
        
        # Convert buildings to parsed files format
        parsed_files = []
        for building in city.buildings:
            parsed_files.append({
                'id': building.id,
                'path': building.path,
                'name': building.name,
                'loc': building.metrics.loc,
                'imports': building.dependencies or [],
                'exports': []
            })
        
        detector = DeadCodeDetector(graph, parsed_files)
        report = detector.analyze()
        
        return {
            "status": "success",
            "city_id": city_id,
            "dead_code": report
        }
    except Exception as e:
        logger.error(f"Dead code detection failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Dead code detection failed: {str(e)}")


@router.get("/intelligence/impact/{city_id}/{file_id}", tags=["Intelligence"])
async def get_change_impact(city_id: str, file_id: str, depth: int = 3):
    """
    Calculate the impact of changing a specific file.
    
    Returns:
    - Blast radius (affected files by level)
    - Risk score
    - Recommendations for safe changes
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        import networkx as nx
        
        # Build dependency graph
        graph = nx.DiGraph()
        for building in city.buildings:
            graph.add_node(building.id)
        
        for road in city.roads:
            graph.add_edge(road.source, road.target)
        
        # Convert to parsed files
        parsed_files = []
        for building in city.buildings:
            parsed_files.append({
                'id': building.id,
                'path': building.path,
                'name': building.name,
                'complexity': building.metrics.complexity,
                'loc': building.metrics.loc
            })
        
        impact_analyzer = ImpactAnalyzer(graph, parsed_files)
        blast_radius = impact_analyzer.get_blast_radius(file_id, depth)
        
        return {
            "status": "success",
            "city_id": city_id,
            "impact": blast_radius
        }
    except Exception as e:
        logger.error(f"Impact analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Impact analysis failed: {str(e)}")


@router.get("/intelligence/safe-delete/{city_id}/{file_id}", tags=["Intelligence"])
async def check_safe_delete(city_id: str, file_id: str):
    """
    Check if a file can be safely deleted.
    
    Returns:
    - Safety status (true/false)
    - List of files that would break
    - Warnings and suggestions
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        import networkx as nx
        
        # Build dependency graph
        graph = nx.DiGraph()
        for building in city.buildings:
            graph.add_node(building.id)
        
        for road in city.roads:
            graph.add_edge(road.source, road.target)
        
        parsed_files = [{
            'id': b.id,
            'path': b.path,
            'name': b.name,
            'loc': b.metrics.loc
        } for b in city.buildings]
        
        impact_analyzer = ImpactAnalyzer(graph, parsed_files)
        result = impact_analyzer.can_safely_delete(file_id)
        
        return {
            "status": "success",
            "city_id": city_id,
            "file_id": file_id,
            "deletion_analysis": result
        }
    except Exception as e:
        logger.error(f"Safe delete check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Safe delete check failed: {str(e)}")


@router.get("/intelligence/critical-paths/{city_id}", tags=["Intelligence"])
async def get_critical_paths(city_id: str):
    """
    Find critical files in the codebase - files that many others depend on.
    
    These are high-risk files that should be changed carefully.
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        import networkx as nx
        
        graph = nx.DiGraph()
        for building in city.buildings:
            graph.add_node(building.id)
        
        for road in city.roads:
            graph.add_edge(road.source, road.target)
        
        parsed_files = [{
            'id': b.id,
            'path': b.path,
            'name': b.name,
            'complexity': b.metrics.complexity,
            'loc': b.metrics.loc
        } for b in city.buildings]
        
        impact_analyzer = ImpactAnalyzer(graph, parsed_files)
        critical_files = impact_analyzer.find_critical_paths()
        
        return {
            "status": "success",
            "city_id": city_id,
            "critical_files": critical_files,
            "total": len(critical_files)
        }
    except Exception as e:
        logger.error(f"Critical path analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Critical path analysis failed: {str(e)}")


@router.get("/intelligence/quality/{city_id}", tags=["Intelligence"])
async def scan_code_quality(city_id: str):
    """
    Scan codebase for code quality issues.
    
    Detects:
    - Long functions
    - High complexity
    - Security anti-patterns
    - Performance issues
    - Naming problems
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        # Convert to parsed files format
        parsed_files = []
        for building in city.buildings:
            parsed_files.append({
                'id': building.id,
                'path': building.path,
                'name': building.name,
                'loc': building.metrics.loc,
                'complexity': building.metrics.complexity,
                'functions': [],
                'classes': []
            })
        
        scanner = CodeQualityScanner(parsed_files, {})
        report = scanner.scan()
        
        return {
            "status": "success",
            "city_id": city_id,
            "quality": report
        }
    except Exception as e:
        logger.error(f"Quality scan failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Quality scan failed: {str(e)}")


@router.post("/intelligence/search/{city_id}", tags=["Intelligence"])
async def smart_search(city_id: str, request: Request):
    """
    Advanced code search with multiple modes.
    
    Modes:
    - exact: Exact text match
    - regex: Regular expression search
    - fuzzy: Fuzzy match with typo tolerance
    - structural: Find functions, classes, imports (e.g., "function:handleClick")
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        body = await request.json()
        query = body.get('query', '')
        search_type = body.get('type', 'exact')
        file_filter = body.get('file_filter')
        limit = body.get('limit', 50)
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Convert to parsed files
        parsed_files = []
        for building in city.buildings:
            parsed_files.append({
                'id': building.id,
                'path': building.path,
                'name': building.name,
                'functions': [],
                'classes': [],
                'imports': building.dependencies or []
            })
        
        searcher = SmartSearch(parsed_files, {})
        
        # Map string to SearchType enum
        type_map = {
            'exact': SearchType.EXACT,
            'regex': SearchType.REGEX,
            'fuzzy': SearchType.FUZZY,
            'structural': SearchType.STRUCTURAL
        }
        
        search_type_enum = type_map.get(search_type, SearchType.EXACT)
        results = searcher.search(query, search_type_enum, file_filter, limit)
        
        return {
            "status": "success",
            "city_id": city_id,
            "search_results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Smart search failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Smart search failed: {str(e)}")


@router.get("/intelligence/refactoring/{city_id}", tags=["Intelligence"])
async def get_refactoring_suggestions(city_id: str):
    """
    Get refactoring suggestions for the codebase.
    
    Returns:
    - Split file suggestions (large files)
    - Merge file suggestions (related small files)
    - Circular dependency breaks
    - Move file suggestions (misplaced files)
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        import networkx as nx
        
        # Build dependency graph
        graph = nx.DiGraph()
        for building in city.buildings:
            graph.add_node(building.id)
        
        for road in city.roads:
            graph.add_edge(road.source, road.target)
        
        # Convert to parsed files
        parsed_files = []
        for building in city.buildings:
            parsed_files.append({
                'id': building.id,
                'path': building.path,
                'name': building.name,
                'loc': building.metrics.loc,
                'complexity': building.metrics.complexity,
                'functions': [],
                'classes': [],
                'imports': building.dependencies or []
            })
        
        helper = RefactoringHelper(graph, parsed_files)
        report = helper.analyze()
        
        return {
            "status": "success",
            "city_id": city_id,
            "refactoring": report
        }
    except Exception as e:
        logger.error(f"Refactoring analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Refactoring analysis failed: {str(e)}")


@router.get("/intelligence/dependencies/{city_id}", tags=["Intelligence"])
async def analyze_dependencies(city_id: str):
    """
    Perform advanced dependency analysis.
    
    Returns:
    - Architectural layers (UI, API, Service, Data, Utils)
    - Hub detection (central files)
    - Coupling metrics
    - Layer violations
    - Actionable insights
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        import networkx as nx
        
        # Build dependency graph
        graph = nx.DiGraph()
        for building in city.buildings:
            graph.add_node(building.id)
        
        for road in city.roads:
            graph.add_edge(road.source, road.target)
        
        # Convert to parsed files
        parsed_files = []
        for building in city.buildings:
            parsed_files.append({
                'id': building.id,
                'path': building.path,
                'name': building.name,
                'loc': building.metrics.loc,
                'complexity': building.metrics.complexity,
                'functions': [],
                'imports': building.dependencies or []
            })
        
        analyzer = DependencyAnalyzer(graph, parsed_files)
        report = analyzer.analyze()
        
        return {
            "status": "success",
            "city_id": city_id,
            "dependencies": report
        }
    except Exception as e:
        logger.error(f"Dependency analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Dependency analysis failed: {str(e)}")


@router.get("/intelligence/overview/{city_id}", tags=["Intelligence"])
async def get_intelligence_overview(city_id: str):
    """
    Get a comprehensive intelligence overview for the codebase.
    
    Combines health, quality, and architecture insights into one view.
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found")
    
    city = city_cache[city_id]
    
    try:
        import networkx as nx
        
        # Build graph and parsed files
        graph = nx.DiGraph()
        for building in city.buildings:
            graph.add_node(building.id)
        
        for road in city.roads:
            graph.add_edge(road.source, road.target)
        
        parsed_files = []
        for building in city.buildings:
            parsed_files.append({
                'id': building.id,
                'path': building.path,
                'name': building.name,
                'loc': building.metrics.loc,
                'complexity': building.metrics.complexity,
                'functions': [],
                'classes': [],
                'imports': building.dependencies or []
            })
        
        # Run all analyzers
        health_analyzer = CodeHealthAnalyzer(parsed_files)
        health_report = health_analyzer.analyze_codebase()
        
        quality_scanner = CodeQualityScanner(parsed_files, {})
        quality_report = quality_scanner.scan()
        
        dep_analyzer = DependencyAnalyzer(graph, parsed_files)
        dep_report = dep_analyzer.analyze()
        
        # Compile overview
        overview = {
            'health_score': health_report.get('overall_score', 0),
            'health_grade': health_report.get('overall_grade', 'N/A'),
            'quality_score': quality_report.get('quality_score', 0),
            'total_issues': quality_report.get('total_issues', 0),
            'coupling_level': dep_report.get('coupling_metrics', {}).get('coupling_level', 'unknown'),
            'architecture_health': dep_report.get('summary', {}).get('health', 'unknown'),
            'key_metrics': {
                'total_files': len(parsed_files),
                'total_loc': sum(f.get('loc', 0) for f in parsed_files),
                'avg_complexity': sum(f.get('complexity', 0) for f in parsed_files) / len(parsed_files) if parsed_files else 0,
                'total_dependencies': len(city.roads)
            },
            'top_recommendations': (
                health_report.get('recommendations', [])[:2] +
                quality_report.get('recommendations', [])[:2] +
                dep_report.get('summary', {}).get('insights', [])[:2]
            ),
            'hotspots': health_report.get('hotspots', [])[:5],
            'top_issues': quality_report.get('top_issues', [])[:5],
            'critical_hubs': dep_report.get('hubs', [])[:5]
        }
        
        return {
            "status": "success",
            "city_id": city_id,
            "overview": overview
        }
    except Exception as e:
        logger.error(f"Intelligence overview failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Intelligence overview failed: {str(e)}")

