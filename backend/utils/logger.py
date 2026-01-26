import logging
import json
import sys
from datetime import datetime

class JsonFormatter(logging.Formatter):
    """
    Format logs as JSON lines for ingestion (Datadog/Splunk).
    Adds timestamp, log level, and custom fields.
    """
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }

        # Add exception info if present
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Add extra fields (Correlation ID, etc)
        if hasattr(record, "correlation_id"):
            log_obj["correlation_id"] = record.correlation_id

        return json.dumps(log_obj)

def get_logger(name: str):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Check if handler already exists to avoid duplicate logs
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)

    return logger

# Root logger
root_logger = get_logger("codebase_city")
