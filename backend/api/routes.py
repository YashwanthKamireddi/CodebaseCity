"""
API Routes for Codebase City
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from typing import Optional
import os
from utils.limiter import limiter
from utils.cache import city_cache

from .models import (
    AnalyzeRequest, CityData, ChatRequest, ChatResponse,
    BuildingDetailRequest, BuildingDetail, SearchRequest, SearchResponse, SearchResult, FileContentResponse

)
# ... imports ...

# Global instances (should be singletons or dependency injected)
from parsing.analyzer import CodebaseAnalyzer
from parsing.search import CodeSearchEngine
from ai.city_guide import CityGuide

router = APIRouter()

analyzer = CodebaseAnalyzer()
search_engine = CodeSearchEngine()
guide = CityGuide()

@router.post("/analyze", response_model=CityData)
@limiter.limit("5/minute")
async def analyze_codebase(request: Request, body: AnalyzeRequest):
    """
    Analyze a codebase and return city data.
    Accepts local paths or GitHub URLs (https://github.com/user/repo)
    """
    # ... implementation ...
    """
    Analyze a codebase and return city data.
    Accepts local paths or GitHub URLs (https://github.com/user/repo)
    """
    from services.git_service import GitService

    try:
        path, is_github, repo_name = GitService.parse_url(body.path)

        # Determine cache key
        if is_github:
            cache_key = f"github_{repo_name}"
        else:
            cache_key = path.replace("/", "_").replace(":", "").replace("\\", "_")
            if cache_key.startswith("_"): cache_key = cache_key[1:]

        # 1. Check Memory Cache
        if cache_key in city_cache:
            print(f"[API] Cache Hit (Memory): {cache_key}")
            return city_cache[cache_key]

        # 2. Check Disk Cache
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cities")
        os.makedirs(data_dir, exist_ok=True)
        cache_file = os.path.join(data_dir, f"{cache_key}.json")

        if os.path.exists(cache_file):
            print(f"[API] Cache Hit (Disk): {cache_file}")
            try:
                import json
                with open(cache_file, "r") as f:
                    data_dict = json.load(f)
                    city = CityData(**data_dict)
                    if not city.path or not os.path.exists(city.path):
                         # If path is missing or invalid, treating as cache miss
                         # For GitHub repos, we might check if we can re-hydrate,
                         # but easiest is to let it fall through to re-analysis.
                         print(f"[API] Cache Invalid: Data exists but files missing at {city.path}")
                         # Continue to fall through (don't return city)
                    else:
                        city_cache[cache_key] = city
                        return city
            except Exception:
                pass # Fall through to analyze

        # 3. Analyze
        if is_github:
            # Clone via Service
            path = GitService.clone_repo(path, repo_name)

            print(f"[API] Analyzing {repo_name}...")
            city_data = await analyzer.analyze(path, body.max_files)
            city_data.name = repo_name
            city_data.path = path # Temp path for file reading

        else:
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail="Path not found")

            print(f"[API] Analyzing Local {path}...")
            city_data = await analyzer.analyze(path, body.max_files)
            city_data.path = os.path.abspath(path)

        # Index Strategy
        if hasattr(analyzer, 'last_parsed_files'):
             search_engine.index_files(analyzer.last_parsed_files)

        # 4. Save to Cache
        city_cache[cache_key] = city_data
        try:
            with open(cache_file, "w") as f:
                f.write(city_data.model_dump_json())
            print(f"[API] Saved to disk: {cache_file}")
        except Exception as e:
            print(f"[API] Failed to save disk cache: {e}")

        return city_data

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=SearchResponse)
async def search_code(request: SearchRequest):
    """
    Semantic Code Search
    """
    results_raw = search_engine.search(request.query)
    # Convert raw dicts to Pydantic models
    results = [SearchResult(**r) for r in results_raw]
    return SearchResponse(results=results)


@router.get("/city/{city_id}", response_model=CityData)
async def get_city(city_id: str):
    """
    Get a previously analyzed city
    """
    if city_id not in city_cache:
        raise HTTPException(status_code=404, detail="City not found. Analyze first.")
    return city_cache[city_id]


@router.post("/chat", response_model=ChatResponse)
async def chat_with_guide(request: ChatRequest):
    """
    Chat with the AI City Guide about the codebase
    """
    try:
        response = await guide.chat(
            message=request.message,
            context=request.context,
            history=request.history
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/building/detail", response_model=BuildingDetail)
async def get_building_detail(request: BuildingDetailRequest):
    """
    Get detailed information about a specific building
    """
    # Find the building in any cached city
    for city in city_cache.values():
        for building in city.buildings:
            if building.id == request.building_id:
                # Get AI-generated details
                detail = await guide.get_building_detail(building, city)
                return detail

    raise HTTPException(status_code=404, detail="Building not found")


@router.get("/demo")
async def get_demo_city():
    """
    Get a pre-built demo city for testing
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
