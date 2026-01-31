"""
Professional Middleware Module
Enterprise-grade middleware for request tracking, logging, and monitoring.
"""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .logger import get_logger, set_correlation_id

logger = get_logger("middleware")


class CorrelationMiddleware(BaseHTTPMiddleware):
    """
    Adds correlation ID to every request for distributed tracing.
    The ID is available in logs and response headers.
    """

    HEADER_NAME = "X-Correlation-ID"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get or generate correlation ID
        correlation_id = request.headers.get(self.HEADER_NAME) or str(uuid.uuid4())

        # Set in context for logging
        set_correlation_id(correlation_id)

        # Store in request state for access in routes
        request.state.correlation_id = correlation_id

        # Process request
        response = await call_next(request)

        # Add to response headers
        response.headers[self.HEADER_NAME] = correlation_id

        return response


class TimingMiddleware(BaseHTTPMiddleware):
    """
    Measures and logs request processing time.
    Adds timing header to response.
    """

    HEADER_NAME = "X-Response-Time"

    # Paths to skip detailed logging (health checks, etc.)
    SKIP_PATHS = {"/health", "/", "/metrics", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()

        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Add timing header
        response.headers[self.HEADER_NAME] = f"{duration_ms:.2f}ms"

        # Log request (skip noisy endpoints)
        if request.url.path not in self.SKIP_PATHS:
            logger.info(
                f"{request.method} {request.url.path} - {response.status_code}",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "client_ip": request.client.host if request.client else "unknown"
                }
            )

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all responses.
    Implements OWASP security best practices.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Cache control for API responses
        if request.url.path.startswith("/api"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"

        return response


def setup_middleware(app: ASGIApp) -> None:
    """
    Configure all middleware for the application.
    Order matters - first added = outermost (runs first/last).
    """
    # Security headers (outermost)
    app.add_middleware(SecurityHeadersMiddleware)

    # Request timing
    app.add_middleware(TimingMiddleware)

    # Correlation ID (innermost)
    app.add_middleware(CorrelationMiddleware)
