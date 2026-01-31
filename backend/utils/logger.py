"""
Professional Logging Module
Enterprise-grade structured logging for production observability.
Supports JSON output for log aggregation (Datadog, Splunk, ELK).
"""

import logging
import json
import sys
import os
from datetime import datetime
from typing import Optional, Dict, Any
from contextvars import ContextVar
from functools import wraps
import time

# Context variable for request correlation
correlation_id_var: ContextVar[str] = ContextVar('correlation_id', default='')


class JsonFormatter(logging.Formatter):
    """
    Format logs as JSON lines for ingestion by log aggregators.
    Includes structured fields for filtering and analysis.
    """

    def __init__(self, service_name: str = "codebase-city"):
        super().__init__()
        self.service_name = service_name
        self.hostname = os.uname().nodename if hasattr(os, 'uname') else 'unknown'

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            # Core fields
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),

            # Source location
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,

            # Service metadata
            "service": self.service_name,
            "host": self.hostname,
            "pid": os.getpid(),
        }

        # Add correlation ID for request tracing
        correlation_id = correlation_id_var.get()
        if correlation_id:
            log_obj["correlation_id"] = correlation_id

        # Add exception info if present
        if record.exc_info:
            log_obj["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else "Unknown",
                "message": str(record.exc_info[1]) if record.exc_info[1] else "",
                "traceback": self.formatException(record.exc_info)
            }

        # Add extra fields passed via logger.info("msg", extra={...})
        standard_keys = {
            'name', 'msg', 'args', 'created', 'filename', 'funcName',
            'levelname', 'levelno', 'lineno', 'module', 'msecs',
            'pathname', 'process', 'processName', 'relativeCreated',
            'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
            'message', 'taskName'
        }

        for key, value in record.__dict__.items():
            if key not in standard_keys and not key.startswith('_'):
                log_obj[key] = value

        return json.dumps(log_obj, default=str)


class ColorFormatter(logging.Formatter):
    """
    Colored console output for local development.
    Human-readable format with ANSI colors.
    """

    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'
    BOLD = '\033[1m'

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)

        # Format timestamp
        timestamp = datetime.utcnow().strftime("%H:%M:%S")

        # Build message
        msg = f"{color}{self.BOLD}[{timestamp}] {record.levelname:8}{self.RESET} "
        msg += f"{record.name}: {record.getMessage()}"

        # Add correlation ID if present
        correlation_id = correlation_id_var.get()
        if correlation_id:
            msg += f" {color}[{correlation_id[:8]}]{self.RESET}"

        # Add exception if present
        if record.exc_info:
            msg += f"\n{color}{self.formatException(record.exc_info)}{self.RESET}"

        return msg


def get_logger(name: str, level: Optional[int] = None) -> logging.Logger:
    """
    Get a configured logger instance.

    Args:
        name: Logger name (usually __name__ or module name)
        level: Optional log level override

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    # Set level from environment or default
    if level is None:
        env_level = os.getenv("LOG_LEVEL", "INFO").upper()
        level = getattr(logging, env_level, logging.INFO)

    logger.setLevel(level)

    # Avoid duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)

        # Use JSON in production, colored in development
        if os.getenv("ENVIRONMENT", "development").lower() == "production":
            handler.setFormatter(JsonFormatter())
        else:
            handler.setFormatter(ColorFormatter())

        logger.addHandler(handler)

    # Prevent propagation to root logger
    logger.propagate = False

    return logger


def set_correlation_id(correlation_id: str) -> None:
    """Set the correlation ID for the current context."""
    correlation_id_var.set(correlation_id)


def get_correlation_id() -> str:
    """Get the current correlation ID."""
    return correlation_id_var.get()


def log_execution_time(logger: Optional[logging.Logger] = None):
    """
    Decorator to log function execution time.

    Usage:
        @log_execution_time()
        async def my_function():
            ...
    """
    def decorator(func):
        _logger = logger or get_logger(func.__module__)

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                elapsed = (time.perf_counter() - start) * 1000
                _logger.info(
                    f"{func.__name__} completed",
                    extra={"duration_ms": round(elapsed, 2)}
                )
                return result
            except Exception as e:
                elapsed = (time.perf_counter() - start) * 1000
                _logger.error(
                    f"{func.__name__} failed: {str(e)}",
                    extra={"duration_ms": round(elapsed, 2)}
                )
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                elapsed = (time.perf_counter() - start) * 1000
                _logger.info(
                    f"{func.__name__} completed",
                    extra={"duration_ms": round(elapsed, 2)}
                )
                return result
            except Exception as e:
                elapsed = (time.perf_counter() - start) * 1000
                _logger.error(
                    f"{func.__name__} failed: {str(e)}",
                    extra={"duration_ms": round(elapsed, 2)}
                )
                raise

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


# Pre-configured root logger for the application
root_logger = get_logger("codebase_city")
