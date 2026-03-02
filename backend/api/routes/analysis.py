"""
Analysis Routes
Codebase analysis, city generation, and cache management endpoints.
"""

from fastapi import APIRouter, HTTPException, Request
import os
import json

from utils.limiter import limiter
from utils.cache import city_cache
from utils.logger import get_logger

from api.models import AnalyzeRequest, CityData

from parsing.analyzer import CodebaseAnalyzer
from parsing.search import CodeSearchEngine
from services.git_service import GitService

from ._helpers import get_cache_key, get_cache_dir

logger = get_logger(__name__)

router = APIRouter()

# Singleton services
analyzer = CodebaseAnalyzer()
search_engine = CodeSearchEngine()


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
        cache_key = get_cache_key(path, is_github, repo_name)
        cache_dir = get_cache_dir()
        cache_file = os.path.join(cache_dir, f"{cache_key}.json")

        # 1. Check Memory Cache
        if cache_key in city_cache:
            logger.info(f"Cache hit (memory): {cache_key}")
            cached_city = city_cache[cache_key]
            if not cached_city.city_id:
                cached_city.city_id = cache_key
            return cached_city

        # 2. Check Disk Cache
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data_dict = json.load(f)
                    city = CityData(**data_dict)

                    # Validate cached path still exists
                    if city.path and os.path.exists(city.path):
                        logger.info(f"Cache hit (disk): {cache_key}")
                        city.city_id = cache_key
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
        city_data.city_id = cache_key
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


@router.get("/city/{city_id}", response_model=CityData, tags=["Analysis"])
async def get_city(city_id: str):
    """
    Get a previously analyzed city by ID.
    """
    if city_id not in city_cache:
        # Try to load from disk
        cache_dir = get_cache_dir()
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


@router.get("/demo", tags=["Analysis"])
async def get_demo_city():
    """
    Get a pre-built demo city for testing.

    Returns a sample city with mock data for UI development.
    """
    from graph.demo_city import create_demo_city
    demo = create_demo_city()
    demo.city_id = "demo_city"
    city_cache["demo_city"] = demo
    return demo


@router.delete("/cache/{city_id}")
async def clear_cache(city_id: str):
    """
    Clear a city from cache.
    """
    if city_id in city_cache:
        del city_cache[city_id]
        return {"status": "cleared"}
    raise HTTPException(status_code=404, detail="City not found in cache")


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
            logger.warning("Git diff failed, falling back to full analysis")
            city_data = await analyzer.analyze(path, max_files)
            return city_data

        changed_files = [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]

        if not changed_files:
            return {"message": "No changes detected", "changed_files": []}

        city_data = await analyzer.analyze(path, max_files)

        # Mark changed buildings
        for building in city_data.buildings:
            if any(building.path.endswith(cf) for cf in changed_files):
                building.is_hotspot = True

        return city_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Incremental analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
