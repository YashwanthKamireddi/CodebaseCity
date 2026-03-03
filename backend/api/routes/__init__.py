"""
API Routes Package
Domain-specific route modules for Codebase City API.
"""

from fastapi import APIRouter

from .analysis import router as analysis_router
from .search import router as search_router
from .intelligence import router as intelligence_router
from .files import router as files_router
from .graph import router as graph_router
from .chat import router as chat_router
from .mcp import router as mcp_router
from .auth import router as auth_router

# Aggregate router that includes all domain routers
router = APIRouter()

router.include_router(analysis_router)
router.include_router(search_router)
router.include_router(intelligence_router)
router.include_router(files_router)
router.include_router(graph_router)
router.include_router(chat_router)
router.include_router(mcp_router)
router.include_router(auth_router, prefix="/auth")
