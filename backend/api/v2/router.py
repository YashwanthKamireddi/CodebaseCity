from fastapi import APIRouter
from .graph import router as graph_router
from .intelligence import router as intelligence_router

router = APIRouter()

# Register V2 Sub-routers
router.include_router(graph_router, prefix="/graph", tags=["Graph Intelligence"])
router.include_router(intelligence_router, prefix="/intelligence", tags=["Code Intelligence"])
