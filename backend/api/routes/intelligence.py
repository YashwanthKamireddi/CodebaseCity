"""
Intelligence Routes
Developer tool endpoints — code health, dead code detection, impact analysis,
safe delete checks, critical paths, quality scanning, smart search,
refactoring suggestions, dependency analysis, and overview.
"""

from fastapi import APIRouter, HTTPException, Request

from utils.cache import city_cache
from utils.logger import get_logger

from parsing.intel import (
    DeadCodeDetector,
    CodeHealthAnalyzer,
    ImpactAnalyzer,
    SmartSearch,
    SearchType,
    CodeQualityScanner,
    RefactoringHelper,
    DependencyAnalyzer
)
from parsing.intel.simulator import RefactoringSimulator

from ._helpers import city_to_parsed_files, load_city_from_cache, build_nx_graph

logger = get_logger(__name__)

router = APIRouter()


def _require_city(city_id: str):
    """Load city or raise 404."""
    city = load_city_from_cache(city_id)
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")
    return city


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
    city = _require_city(city_id)

    try:
        parsed_files, _ = city_to_parsed_files(city)
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
    city = _require_city(city_id)

    try:
        graph = build_nx_graph(city)
        parsed_files, _ = city_to_parsed_files(city)

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
    city = _require_city(city_id)

    try:
        graph = build_nx_graph(city)

        parsed_files = [{
            'id': b.id,
            'path': b.path,
            'name': b.name,
            'complexity': b.metrics.complexity,
            'loc': b.metrics.loc
        } for b in city.buildings]

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
    city = _require_city(city_id)

    try:
        graph = build_nx_graph(city)

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


@router.post("/intelligence/simulate/{city_id}", tags=["Intelligence"])
async def simulate_refactoring(city_id: str, request: Request):
    """
    Simulates the impact of architectural structural drifts (Drag-and-Drop file moves).
    """
    city = _require_city(city_id)

    try:
        body = await request.json()
        drifts = body.get("drifts", [])

        graph = build_nx_graph(city)
        parsed_files = [{
            'id': b.id,
            'path': b.path,
            'name': b.name,
            'loc': b.metrics.loc
        } for b in city.buildings]

        simulator = RefactoringSimulator(graph, parsed_files)
        result = simulator.simulate_drifts(drifts)

        return {
            "status": "success",
            "city_id": city_id,
            "simulation": result
        }
    except Exception as e:
        logger.error(f"Simulation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.get("/intelligence/critical-paths/{city_id}", tags=["Intelligence"])
async def get_critical_paths(city_id: str):
    """
    Find critical files in the codebase - files that many others depend on.

    These are high-risk files that should be changed carefully.
    """
    city = _require_city(city_id)

    try:
        graph = build_nx_graph(city)

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
    city = _require_city(city_id)

    try:
        parsed_files = [{
            'id': b.id,
            'path': b.path,
            'name': b.name,
            'loc': b.metrics.loc,
            'complexity': b.metrics.complexity,
            'functions': [],
            'classes': []
        } for b in city.buildings]

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
    city = _require_city(city_id)

    try:
        body = await request.json()
        query = body.get('query', '')
        search_type = body.get('type', 'exact')
        file_filter = body.get('file_filter')
        limit = body.get('limit', 50)

        if not query:
            raise HTTPException(status_code=400, detail="Query is required")

        parsed_files, _ = city_to_parsed_files(city)

        searcher = SmartSearch(parsed_files, {})

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
    city = _require_city(city_id)

    try:
        graph = build_nx_graph(city)
        parsed_files, _ = city_to_parsed_files(city)

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
    city = _require_city(city_id)

    try:
        graph = build_nx_graph(city)
        parsed_files, _ = city_to_parsed_files(city)

        dep_analyzer = DependencyAnalyzer(graph, parsed_files)
        report = dep_analyzer.analyze()

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
    city = _require_city(city_id)

    try:
        graph = build_nx_graph(city)
        parsed_files, _ = city_to_parsed_files(city)

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
