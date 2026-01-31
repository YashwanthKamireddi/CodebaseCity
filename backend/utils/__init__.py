"""
Codebase City Utilities Package
Enterprise-grade utilities for logging, validation, caching, and error handling.
"""

from .logger import get_logger, root_logger, set_correlation_id, get_correlation_id, log_execution_time
from .error_handler import (
    global_exception_handler,
    http_exception_handler,
    AppError,
    NotFoundError,
    ValidationFailedError,
    ExternalServiceError
)
from .validators import (
    PathValidator,
    GitHubValidator,
    QueryValidator,
    LimitValidator,
    validate_path,
    validate_file,
    parse_github,
    validate_query
)
from .responses import (
    ResponseStatus,
    ErrorCode,
    success_response,
    error_response,
    paginated_response,
    ok,
    created,
    deleted,
    not_found,
    bad_request,
    server_error
)
from .cache import city_cache, LRUCache
from .limiter import limiter
from .middleware import (
    CorrelationMiddleware,
    TimingMiddleware,
    SecurityHeadersMiddleware,
    setup_middleware
)

__all__ = [
    # Logger
    'get_logger',
    'root_logger',
    'set_correlation_id',
    'get_correlation_id',
    'log_execution_time',

    # Error Handling
    'global_exception_handler',
    'http_exception_handler',
    'AppError',
    'NotFoundError',
    'ValidationFailedError',
    'ExternalServiceError',

    # Validators
    'PathValidator',
    'GitHubValidator',
    'QueryValidator',
    'LimitValidator',
    'validate_path',
    'validate_file',
    'parse_github',
    'validate_query',

    # Responses
    'ResponseStatus',
    'ErrorCode',
    'success_response',
    'error_response',
    'paginated_response',
    'ok',
    'created',
    'deleted',
    'not_found',
    'bad_request',
    'server_error',

    # Cache
    'city_cache',
    'LRUCache',

    # Rate Limiting
    'limiter',

    # Middleware
    'CorrelationMiddleware',
    'TimingMiddleware',
    'SecurityHeadersMiddleware',
    'setup_middleware',
]
