"""
Analysis Routes
Codebase analysis, city generation, and cache management endpoints.
"""

from fastapi import APIRouter, HTTPException, Request, Depends, Header
from fastapi.responses import ORJSONResponse, StreamingResponse
import os
import json
import orjson
from typing import Optional
import jwt

from utils.limiter import limiter
from utils.cache import city_cache
from utils.logger import get_logger
from core.config import settings

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


@router.post("/analyze", response_class=ORJSONResponse, tags=["Analysis"])
@limiter.limit("5/minute")
async def analyze_codebase(
    request: Request,
    body: AnalyzeRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Analyze a codebase and return city data.

    Accepts:
    - Local filesystem paths (e.g., /home/user/project)
    - GitHub URLs (e.g., https://github.com/owner/repo)
    - GitHub shorthand (e.g., owner/repo)

    If the Authorization header contains a valid JWT, passes the embedded github_token to access private repos.
    Returns a complete city representation with buildings, districts, and roads.
    """
    github_token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            github_token = payload.get("github_token")
        except Exception as e:
            logger.warning(f"Invalid or expired JWT provided during analysis: {e}")

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
            # Use model_dump() directly — avoids wasteful JSON roundtrip
            return ORJSONResponse(content=cached_city.model_dump())

        # 2. Check Disk Cache
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    # Load lightning fast via orjson
                    data_dict = orjson.loads(f.read())
                    city = CityData(**data_dict)

                    # Validate cached path still exists
                    if city.path and os.path.exists(city.path):
                        logger.info(f"Cache hit (disk): {cache_key}")
                        city.city_id = cache_key
                        city_cache[cache_key] = city
                        return ORJSONResponse(content=data_dict)
                    else:
                        logger.info(f"Cache invalid (path missing): {cache_key}")
            except Exception as e:
                logger.warning(f"Cache read failed: {e}")

        # 3. Perform Analysis
        if is_github:
            path = GitService.clone_repo(path, repo_name, github_token=github_token)
            logger.info(f"Analyzing GitHub repo: {repo_name} (Authenticated: {bool(github_token)})")
            city_data = await analyzer.analyze(path, body.max_files)
            city_data.name = repo_name
            city_data.path = path

            # Ephemeral Garbage Collection for Enterprise Security Phase 2
            # Immediately delete the source code from the container after extracting the geometry context
            try:
                import shutil
                shutil.rmtree(path)
                logger.info(f"Ephemeral Parsing Complete: Purged source code for {repo_name}")
            except Exception as e:
                logger.error(f"Failed to purge ephemeral source code for {repo_name}: {e}")

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

        # Fast JSON serialization to disk using orjson
        city_dict = city_data.model_dump()
        try:
            with open(cache_file, "wb") as f:
                f.write(orjson.dumps(city_dict, option=orjson.OPT_INDENT_2))
            logger.info(f"Cached to disk: {cache_file}")
        except Exception as e:
            logger.warning(f"Failed to cache: {e}")

        # Stream large payloads to prevent memory spikes on massive repos
        building_count = len(city_data.buildings) if city_data.buildings else 0
        if building_count > 1000:
            logger.info(f"Streaming large response: {building_count} buildings")
            payload_bytes = orjson.dumps(city_dict)
            def stream_chunks():
                CHUNK_SIZE = 64 * 1024  # 64KB chunks
                for i in range(0, len(payload_bytes), CHUNK_SIZE):
                    yield payload_bytes[i:i + CHUNK_SIZE]
            return StreamingResponse(
                stream_chunks(),
                media_type="application/json",
                headers={"X-Building-Count": str(building_count)}
            )

        return ORJSONResponse(content=city_dict)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/city/{city_id}", response_class=ORJSONResponse, tags=["Analysis"])
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
                with open(cache_file, "rb") as f:
                    data_dict = orjson.loads(f.read())
                    city = CityData(**data_dict)
                    city_cache[city_id] = city
                    return ORJSONResponse(content=data_dict)
            except Exception:
                pass

        raise HTTPException(status_code=404, detail="City not found. Analyze first.")

    return ORJSONResponse(content=orjson.loads(city_cache[city_id].model_dump_json()))


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
    return ORJSONResponse(content=orjson.loads(demo.model_dump_json()))


@router.delete("/cache/{city_id}")
async def clear_cache(city_id: str):
    """
    Clear a city from memory and disk cache.
    """
    cache_cleared = False

    # Clear Memory
    if city_id in city_cache:
        del city_cache[city_id]
        cache_cleared = True

    # Clear Disk
    cache_dir = get_cache_dir()
    cache_file = os.path.join(cache_dir, f"{city_id}.json")
    if os.path.exists(cache_file):
        try:
            os.remove(cache_file)
            cache_cleared = True
            logger.info(f"Deleted cache file: {cache_file}")
        except Exception as e:
            logger.warning(f"Failed to delete cache file {cache_file}: {e}")

    if cache_cleared:
        return {"status": "cleared", "city_id": city_id}

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
