"""
Standardized API Response Module
Enterprise-grade response formatting for consistent API output.
"""

from typing import Any, Dict, List, Optional, TypeVar, Generic
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ResponseStatus(str, Enum):
    """Standard response status codes."""
    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


class ErrorCode(str, Enum):
    """Standardized error codes for API responses."""
    # Client Errors (4xx)
    BAD_REQUEST = "BAD_REQUEST"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    RATE_LIMITED = "RATE_LIMITED"
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"

    # Server Errors (5xx)
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    TIMEOUT = "TIMEOUT"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"


class PaginationMeta(BaseModel):
    """Pagination metadata for list responses."""
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=50, ge=1, le=1000)
    total: int = Field(default=0, ge=0)
    total_pages: int = Field(default=0, ge=0)
    has_next: bool = False
    has_prev: bool = False


class PerformanceMeta(BaseModel):
    """Performance metrics for responses."""
    processing_time_ms: float = Field(default=0, description="Server processing time in ms")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


T = TypeVar('T')


class APIResponse(BaseModel, Generic[T]):
    """
    Standard API response wrapper.
    All API endpoints should return this format.
    """
    status: ResponseStatus = ResponseStatus.SUCCESS
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "data": {"id": "abc123"},
                "message": "Operation completed successfully",
                "meta": {"processing_time_ms": 45.2}
            }
        }


def success_response(
    data: Any = None,
    message: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a standardized success response.

    Args:
        data: The response payload
        message: Optional success message
        meta: Optional metadata (pagination, timing, etc.)

    Returns:
        Formatted response dictionary
    """
    response = {
        "status": ResponseStatus.SUCCESS.value,
        "data": data,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

    if message:
        response["message"] = message

    if meta:
        response["meta"] = meta

    return response


def error_response(
    code: ErrorCode,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    http_status: int = 500
) -> Dict[str, Any]:
    """
    Create a standardized error response.

    Args:
        code: Error code enum value
        message: Human-readable error message
        details: Additional error details
        http_status: HTTP status code

    Returns:
        Formatted error response dictionary
    """
    error_info = {
        "code": code.value,
        "message": message,
        "http_status": http_status
    }

    if details:
        error_info["details"] = details

    return {
        "status": ResponseStatus.ERROR.value,
        "data": None,
        "error": error_info,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


def paginated_response(
    items: List[Any],
    total: int,
    page: int = 1,
    per_page: int = 50
) -> Dict[str, Any]:
    """
    Create a paginated response.

    Args:
        items: List of items for current page
        total: Total number of items
        page: Current page number (1-indexed)
        per_page: Items per page

    Returns:
        Formatted paginated response
    """
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0

    pagination = {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }

    return success_response(
        data=items,
        meta={"pagination": pagination}
    )


# Convenience aliases
def ok(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    """Quick success response."""
    return success_response(data=data, message=message)


def created(data: Any, message: str = "Created successfully") -> Dict[str, Any]:
    """Response for resource creation."""
    return success_response(data=data, message=message)


def deleted(message: str = "Deleted successfully") -> Dict[str, Any]:
    """Response for resource deletion."""
    return success_response(data=None, message=message)


def not_found(resource: str = "Resource") -> Dict[str, Any]:
    """Quick not found response."""
    return error_response(
        code=ErrorCode.NOT_FOUND,
        message=f"{resource} not found",
        http_status=404
    )


def bad_request(message: str = "Invalid request") -> Dict[str, Any]:
    """Quick bad request response."""
    return error_response(
        code=ErrorCode.BAD_REQUEST,
        message=message,
        http_status=400
    )


def server_error(message: str = "Internal server error") -> Dict[str, Any]:
    """Quick server error response."""
    return error_response(
        code=ErrorCode.INTERNAL_ERROR,
        message=message,
        http_status=500
    )
