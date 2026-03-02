"""
Search Routes
Code search and symbol lookup endpoints.
"""

from fastapi import APIRouter, HTTPException, Request

from utils.logger import get_logger

from api.models import SearchRequest, SearchResponse, SearchResult

from parsing.search import CodeSearchEngine

logger = get_logger(__name__)

router = APIRouter()

# Shared search engine instance
search_engine = CodeSearchEngine()


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
