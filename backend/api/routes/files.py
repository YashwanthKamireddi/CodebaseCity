"""
Files Routes
File content retrieval, building detail, and export endpoints.
"""

from fastapi import APIRouter, HTTPException, Request
import os

from utils.cache import city_cache
from utils.logger import get_logger

from api.models import (
    BuildingDetailRequest, BuildingDetail, FileContentResponse
)

from ai.city_guide import CityGuide

logger = get_logger(__name__)

router = APIRouter()

# Singleton service
guide = CityGuide()


@router.get("/files/content", response_model=FileContentResponse, tags=["Files"])
async def get_file_content(path: str):
    """
    Get raw content of a file.
    Handles both local paths and GitHub URLs.
    """
    # Handle GitHub URLs
    if path.startswith("http") and "github.com" in path:
        import httpx
        try:
            base_raw = path.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

            async with httpx.AsyncClient() as client:
                response = await client.get(base_raw)
                if response.status_code == 200:
                    return FileContentResponse(content=response.text)

                if "/blob/" not in path:
                    parts = base_raw.split("/")
                    if len(parts) > 5:
                        base_root = "/".join(parts[:5])
                        file_path = "/".join(parts[5:])

                        for branch in ["main", "master", "HEAD"]:
                            candidate = f"{base_root}/{branch}/{file_path}"
                            resp = await client.get(candidate)
                            if resp.status_code == 200:
                                return FileContentResponse(content=resp.text)

                raise HTTPException(status_code=404, detail="Failed to fetch from GitHub (404)")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"GitHub fetch failed for {path}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"GitHub fetch failed: {str(e)}")

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Limit size to 1MB
        if os.path.getsize(path) > 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large")

        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return FileContentResponse(content=f.read())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
