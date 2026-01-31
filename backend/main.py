"""
Codebase City - Backend API
AI-powered 3D codebase visualization

Enterprise-grade FastAPI application with:
- Structured logging
- Request correlation
- Global error handling
- Rate limiting
- Security headers
"""

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv
import os

load_dotenv()

# Import utilities first
from utils.logger import root_logger, get_logger
from utils.error_handler import global_exception_handler, http_exception_handler
from utils.middleware import setup_middleware
from utils.responses import success_response

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    logger.info("🏙️  Codebase City API starting up...")
    logger.info(f"   Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"   Log Level: {os.getenv('LOG_LEVEL', 'INFO')}")
    yield
    # Shutdown
    logger.info("🏙️  Codebase City API shutting down...")


app = FastAPI(
    title="Codebase City API",
    description="Transform codebases into interactive 3D cities with AI-powered analysis",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Analysis", "description": "Codebase analysis and city generation"},
        {"name": "Chat", "description": "AI-powered city guide conversations"},
        {"name": "Files", "description": "File content and search operations"},
        {"name": "History", "description": "Git history and time travel"},
        {"name": "Graph Intelligence", "description": "Dependency graph analysis"},
    ],
    lifespan=lifespan
)

# Import and include routers
from api.routes import router as api_router
from api.history import router as history_router
from api.v2.router import router as v2_router
from api.websocket import websocket_vscode, websocket_frontend

# Register Exception Handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, global_exception_handler)

# Rate Limiting (SlowAPI)
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# Add production origins from environment
if os.getenv("FRONTEND_URL"):
    ALLOWED_ORIGINS.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID", "X-Response-Time"],
)

# Setup custom middleware (correlation ID, timing, security headers)
setup_middleware(app)

# Include API routers
app.include_router(api_router, prefix="/api", tags=["Analysis"])
app.include_router(history_router, prefix="/api", tags=["History"])
app.include_router(v2_router, prefix="/api/v2")


# WebSocket endpoints for VS Code integration
@app.websocket("/ws/vscode")
async def ws_vscode_endpoint(websocket: WebSocket):
    """WebSocket for VS Code extension bidirectional sync."""
    await websocket_vscode(websocket)


@app.websocket("/ws/frontend")
async def ws_frontend_endpoint(websocket: WebSocket):
    """WebSocket for frontend browser bidirectional sync."""
    await websocket_frontend(websocket)


@app.get("/", tags=["Health"])
async def root() -> Dict[str, Any]:
    """
    API root endpoint.
    Returns service information and available features.
    """
    return success_response(
        data={
            "name": "Codebase City API",
            "version": "2.0.0",
            "status": "running",
            "features": [
                "3d-visualization",
                "ai-analysis",
                "vscode-sync",
                "git-timeline",
                "dependency-graph"
            ],
            "documentation": "/docs"
        },
        message="Welcome to Codebase City!"
    )


@app.get("/health", tags=["Health"])
async def health() -> Dict[str, Any]:
    """
    Health check endpoint.
    Used by load balancers and monitoring systems.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "2.0.0"
    }
