"""
Codebase City - Backend API
AI-powered 3D codebase visualization
"""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="Codebase City API",
    description="Transform codebases into interactive 3D cities",
    version="1.0.0"
)

# Import and include routers
from api.routes import router as api_router
from api.history import router as history_router
from api.v2.router import router as v2_router
from api.websocket import websocket_vscode, websocket_frontend
from utils.error_handler import global_exception_handler
from utils.logger import root_logger

# Register Global Exception Handler
app.add_exception_handler(Exception, global_exception_handler)

# Rate Limiting (SlowAPI)
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from api.routes import router as api_router
from api.history import router as history_router
from api.v2.router import router as v2_router
from api.websocket import websocket_vscode, websocket_frontend

app.include_router(api_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(v2_router, prefix="/api/v2")


# WebSocket endpoints for VS Code integration
@app.websocket("/ws/vscode")
async def ws_vscode_endpoint(websocket: WebSocket):
    """WebSocket for VS Code extension bidirectional sync"""
    await websocket_vscode(websocket)


@app.websocket("/ws/frontend")
async def ws_frontend_endpoint(websocket: WebSocket):
    """WebSocket for frontend browser bidirectional sync"""
    await websocket_frontend(websocket)


@app.get("/")
async def root():
    return {
        "name": "Codebase City API",
        "version": "1.0.0",
        "status": "running",
        "features": ["3d-visualization", "vscode-sync", "git-timeline"]
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
