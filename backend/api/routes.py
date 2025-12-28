"""
API Routes for Codebase City
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
import os

from .models import (
    AnalyzeRequest, CityData, ChatRequest, ChatResponse,
    BuildingDetailRequest, BuildingDetail
)
from parsing.analyzer import CodebaseAnalyzer
from ai.city_guide import CityGuide

router = APIRouter()

# Store analyzed cities in memory (in production, use Redis/DB)
city_cache: dict[str, CityData] = {}
analyzer = CodebaseAnalyzer()
guide = CityGuide()


@router.post("/analyze", response_model=CityData)
async def analyze_codebase(request: AnalyzeRequest):
    """
    Analyze a codebase and return city data.
    Accepts local paths or GitHub URLs (https://github.com/user/repo)
    """
    import subprocess
    import tempfile
    import shutil
    
    try:
        path = request.path.strip()
        
        # Check if it's a GitHub URL
        if path.startswith("https://github.com/") or path.startswith("github.com/"):
            if not path.startswith("https://"):
                path = "https://" + path
            
            # Extract repo name for cache key
            repo_name = path.rstrip("/").split("/")[-1].replace(".git", "")
            cache_key = f"github_{repo_name}"
            
            if cache_key in city_cache:
                return city_cache[cache_key]
            
            # Clone to temp directory
            temp_dir = os.path.join(tempfile.gettempdir(), "codebase_city", repo_name)
            
            # Clean up if exists
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            
            os.makedirs(os.path.dirname(temp_dir), exist_ok=True)
            
            # Clone the repo (shallow clone for speed)
            clone_result = subprocess.run(
                ["git", "clone", "--depth", "1", path, temp_dir],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if clone_result.returncode != 0:
                raise HTTPException(status_code=400, detail=f"Failed to clone: {clone_result.stderr}")
            
            # Analyze the cloned repo
            city_data = await analyzer.analyze(temp_dir, request.max_files)
            city_data.name = repo_name
            
            # Cache it
            city_cache[cache_key] = city_data
            
            return city_data
        
        # Local path
        cache_key = path
        if cache_key in city_cache:
            return city_cache[cache_key]
        
        # Analyze the codebase
        city_data = await analyzer.analyze(path, request.max_files)
        
        # Cache the result
        city_cache[cache_key] = city_data
        
        return city_data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Path not found")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Clone timed out - repository too large")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
