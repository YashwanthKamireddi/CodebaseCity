from fastapi import Request, status
from fastapi.responses import JSONResponse
from .logger import get_logger

logger = get_logger("error_handler")

async def global_exception_handler(request: Request, exc: Exception):
    """
    Centralized Error Handling.
    Intercepts unhandled exceptions to prevent server crashes and info leaks.
    """

    # Log the full error with stack trace (Internal)
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=exc)

    # Return sanitized response (External)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Our team has been notified."
            # Note: We certainly DO NOT include the stack trace here in production.
        }
    )
