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

router = APIRouter()

# ... globals ...

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
    import subprocess
    import tempfile
    import shutil

    # Blocklist of repos too large to analyze (GB+ in size)
    BLOCKED_REPOS = {
        "linux": "Linux kernel (5GB+, 30M+ LOC) - try a smaller project like expressjs/express",
        "chromium": "Chromium (30GB+) - try nicegram/nicegram-ios instead",
        "gecko-dev": "Firefox (2GB+) - try nicegram/nicegram-ios instead",
        "kubernetes": "Kubernetes (2GB+) - try expressjs/express instead",
        "tensorflow": "TensorFlow (2GB+) - try pytorch/vision instead",
        "llvm-project": "LLVM (4GB+) - try nicegram/nicegram-ios instead",
        "rust": "Rust compiler (2GB+) - try nicegram/nicegram-ios instead",
        "webkit": "WebKit (5GB+) - try expressjs/express instead",
    }

    try:
        path = body.path.strip()

        # Check if it's a GitHub URL or shorthand
        is_github = "github.com" in path or (len(path.split("/")) == 2 and not os.path.exists(path))

        if is_github:
            # Handle shorthand user/repo
            if not "github.com" in path:
                path = f"github.com/{path}"

            if not path.startswith("https://"):
                path = "https://" + path.replace("http://", "")

            # Extract repo name for cache key
            repo_name = path.rstrip("/").split("/")[-1].replace(".git", "")
            cache_key = f"github_{repo_name}"
        else:
            # Local path
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

                    # Validate that the repo path still exists (crucial for git history/content)
                    if city.path and not os.path.exists(city.path):
                        print(f"[API] Cache Invalid: Path {city.path} missing. Invalidating.")
                    else:
                        city_cache[cache_key] = city
                        return city
            except Exception as e:
                print(f"[API] Failed to load disk cache: {e}")

        # 3. Analyze
        if is_github:
            # Check blocklist
            if repo_name.lower() in BLOCKED_REPOS:
                raise HTTPException(status_code=413, detail=f"Repository too large: {BLOCKED_REPOS[repo_name.lower()]}")

            temp_dir = os.path.join(tempfile.gettempdir(), "codebase_city", repo_name)
            if os.path.exists(temp_dir): shutil.rmtree(temp_dir)
            os.makedirs(os.path.dirname(temp_dir), exist_ok=True)

            print(f"[API] Cloning {path}...")
            clone_result = subprocess.run(
                ["git", "clone", "--single-branch", path, temp_dir],
                capture_output=True, text=True, timeout=600
            )
            if clone_result.returncode != 0:
                raise HTTPException(status_code=400, detail=f"Failed to clone: {clone_result.stderr}")

            print(f"[API] Analyzing {repo_name}...")
            city_data = await analyzer.analyze(temp_dir, request.max_files)
            city_data.name = repo_name
            # CRITICAL: Return the local temp path so frontend can read files
            city_data.path = temp_dir

            # Index for Search
            if hasattr(analyzer, 'last_parsed_files'):
                search_engine.index_files(analyzer.last_parsed_files)


            # Index for Search
            files_list = [f for f in analyzer.last_parsed_files] if hasattr(analyzer, 'last_parsed_files') else []
            # Wait, analyzer.analyze() returns city_data, but doesn't expose parsed_files directly unless we modify Analyzer.
            # But the SearchEngine needs raw content.
            # I should modify Analyzer to return parsed_files or index inside Analyzer?
            # Better: Analyzer stores it or returns it.
            # Let's modify Analyzer.py to expose parsed_files or pass SearchEngine to Analyzer?
            # Simplest: Analyzer.analyze returns list of dicts? No, returns CityData.
            # I will modify Analyzer to set last_parsed_files on itself for now (hacky but fast) or pass search_engine.

            # Actually, let's just make Analyzer return tuple? No breaks API.
            # Let's index inside Routes for now, but I need access to file content.
            # CityData doesn't store content (too big).

            # PLAN B: Modify Analyzer.analyze to take an optional `search_engine` callback.
            # Or just update Analyzer to expose `self.parsed_files`.

        else:
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail="Path not found")
            city_data = await analyzer.analyze(path, request.max_files)
            # Ensure path is absolute for local analysis
            city_data.path = os.path.abspath(path)

            # Index for Search
            if hasattr(analyzer, 'last_parsed_files'):
                search_engine.index_files(analyzer.last_parsed_files)


        # 4. Save to Cache (Memory + Disk)
        city_cache[cache_key] = city_data
        try:
            with open(cache_file, "w") as f:
                f.write(city_data.model_dump_json())
            print(f"[API] Saved to disk: {cache_file}")
        except Exception as e:
            print(f"[API] Failed to save to disk: {e}")

        return city_data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Path not found")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Clone timed out - repository too large")
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
            # This is a heuristic; might need refinement for complex URLs
            raw_url = path.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

            async with httpx.AsyncClient() as client:
                response = await client.get(raw_url)
                if response.status_code == 200:
                   return FileContentResponse(content=response.text)
                else:
                   raise HTTPException(status_code=404, detail="Failed to fetch from GitHub")
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
