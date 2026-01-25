from fastapi import APIRouter
from .graph import router as graph_router

router = APIRouter()

# Register V2 Sub-routers
router.include_router(graph_router, prefix="/graph", tags=["Graph Intelligence"])
