"""
Enterprise Error Handler
Professional-grade exception handling with structured logging and safe responses.
"""

import traceback
import uuid
from datetime import datetime
from typing import Optional

from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from .logger import get_logger
from .responses import ErrorCode, error_response

logger = get_logger("error_handler")


class AppError(Exception):
    """Base application error with structured data."""

    def __init__(
        self,
        message: str,
        code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        http_status: int = 500,
        details: Optional[dict] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.http_status = http_status
        self.details = details or {}


class NotFoundError(AppError):
    """Resource not found error."""
    def __init__(self, resource: str, identifier: str = ""):
        msg = f"{resource} not found" if not identifier else f"{resource} '{identifier}' not found"
        super().__init__(msg, ErrorCode.NOT_FOUND, 404)


class ValidationFailedError(AppError):
    """Input validation error."""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, ErrorCode.VALIDATION_ERROR, 400, details)


class ExternalServiceError(AppError):
    """External service (GitHub, Gemini, etc.) error."""
    def __init__(self, service: str, message: str):
        super().__init__(
            f"{service} service error: {message}",
            ErrorCode.EXTERNAL_SERVICE_ERROR,
            502
        )


def _generate_error_id() -> str:
    """Generate a unique error ID for tracking."""
    return f"ERR-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Centralized Error Handling.

    Intercepts all unhandled exceptions to:
    1. Log detailed error information (internal)
    2. Return safe, structured response (external)
    3. Track errors with unique IDs
    """
    error_id = _generate_error_id()

    # Determine error category and response
    if isinstance(exc, AppError):
        # Our custom application errors
        logger.warning(
            f"AppError [{error_id}]: {exc.code.value} - {exc.message}",
            extra={"error_id": error_id, "details": exc.details}
        )
        return JSONResponse(
            status_code=exc.http_status,
            content=error_response(
                code=exc.code,
                message=exc.message,
                details={"error_id": error_id, **exc.details},
                http_status=exc.http_status
            )
        )

    elif isinstance(exc, HTTPException):
        # FastAPI HTTP exceptions (pass through)
        logger.info(f"HTTPException [{error_id}]: {exc.status_code} - {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(
                code=ErrorCode.BAD_REQUEST if exc.status_code < 500 else ErrorCode.INTERNAL_ERROR,
                message=str(exc.detail),
                details={"error_id": error_id},
                http_status=exc.status_code
            )
        )

    elif isinstance(exc, (RequestValidationError, ValidationError)):
        # Pydantic validation errors
        if hasattr(exc, 'errors'):
            validation_errors = exc.errors()
        else:
            validation_errors = [{"msg": str(exc)}]

        logger.warning(
            f"ValidationError [{error_id}]: {validation_errors}",
            extra={"error_id": error_id}
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Request validation failed",
                details={"error_id": error_id, "errors": validation_errors},
                http_status=422
            )
        )

    else:
        # Unexpected exceptions - log full stack trace internally
        stack_trace = traceback.format_exc()
        logger.error(
            f"UnhandledException [{error_id}]: {type(exc).__name__}: {str(exc)}",
            extra={
                "error_id": error_id,
                "exception_type": type(exc).__name__,
                "stack_trace": stack_trace,
                "path": str(request.url.path),
                "method": request.method
            },
            exc_info=exc
        )

        # Return safe message (never expose internal details)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response(
                code=ErrorCode.INTERNAL_ERROR,
                message="An unexpected error occurred. Please try again later.",
                details={
                    "error_id": error_id,
                    "support": "If this persists, contact support with this error ID."
                },
                http_status=500
            )
        )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTPException separately for cleaner responses."""
    error_id = _generate_error_id()

    code_map = {
        400: ErrorCode.BAD_REQUEST,
        401: ErrorCode.UNAUTHORIZED,
        403: ErrorCode.FORBIDDEN,
        404: ErrorCode.NOT_FOUND,
        408: ErrorCode.TIMEOUT,
        413: ErrorCode.PAYLOAD_TOO_LARGE,
        429: ErrorCode.RATE_LIMITED,
    }

    error_code = code_map.get(exc.status_code, ErrorCode.INTERNAL_ERROR)

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            code=error_code,
            message=str(exc.detail),
            details={"error_id": error_id},
            http_status=exc.status_code
        )
    )
