"""
Configuration Management
Centralized configuration with validation and type safety.
"""

import os
from typing import Optional, List
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings with environment variable support.
    Uses Pydantic for validation and type coercion.
    """

    # ═══════════════════════════════════════════════════════════════════════════
    # APPLICATION
    # ═══════════════════════════════════════════════════════════════════════════

    app_name: str = Field(default="Codebase City", description="Application name")
    app_version: str = Field(default="2.0.0", description="Application version")
    environment: str = Field(default="development", description="Environment (development/staging/production)")
    debug: bool = Field(default=False, description="Debug mode")

    # ═══════════════════════════════════════════════════════════════════════════
    # SERVER
    # ═══════════════════════════════════════════════════════════════════════════

    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    workers: int = Field(default=1, description="Number of worker processes")

    # ═══════════════════════════════════════════════════════════════════════════
    # CORS
    # ═══════════════════════════════════════════════════════════════════════════

    cors_origins: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins"
    )

    # ═══════════════════════════════════════════════════════════════════════════
    # AI SERVICES
    # ═══════════════════════════════════════════════════════════════════════════

    gemini_api_key: Optional[str] = Field(default=None, description="Google Gemini API key")
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key (optional)")
    ai_model: str = Field(default="gemini-2.0-flash-exp", description="Default AI model")
    ai_temperature: float = Field(default=0.7, ge=0, le=2, description="AI temperature")
    ai_max_tokens: int = Field(default=8192, description="Max tokens for AI responses")

    # ═══════════════════════════════════════════════════════════════════════════
    # CACHING
    # ═══════════════════════════════════════════════════════════════════════════

    cache_enabled: bool = Field(default=True, description="Enable caching")
    cache_ttl: int = Field(default=3600, description="Cache TTL in seconds")
    cache_max_size: int = Field(default=100, description="Max cache entries")
    cache_directory: str = Field(default="data/cities", description="Cache directory")

    # ═══════════════════════════════════════════════════════════════════════════
    # RATE LIMITING
    # ═══════════════════════════════════════════════════════════════════════════

    rate_limit_enabled: bool = Field(default=True, description="Enable rate limiting")
    rate_limit_per_minute: int = Field(default=60, description="Requests per minute")
    rate_limit_burst: int = Field(default=10, description="Burst limit")

    # ═══════════════════════════════════════════════════════════════════════════
    # ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════════

    max_files: int = Field(default=5000, description="Maximum files to analyze")
    max_file_size: int = Field(default=5 * 1024 * 1024, description="Max file size in bytes")
    analysis_timeout: int = Field(default=300, description="Analysis timeout in seconds")

    # ═══════════════════════════════════════════════════════════════════════════
    # LOGGING
    # ═══════════════════════════════════════════════════════════════════════════

    log_level: str = Field(default="INFO", description="Log level")
    log_format: str = Field(default="json", description="Log format (json/text)")
    log_file: Optional[str] = Field(default=None, description="Log file path")

    # ═══════════════════════════════════════════════════════════════════════════
    # SECURITY
    # ═══════════════════════════════════════════════════════════════════════════

    api_key_enabled: bool = Field(default=False, description="Require API key")
    api_key_header: str = Field(default="X-API-Key", description="API key header name")
    trusted_hosts: List[str] = Field(default=["*"], description="Trusted hosts")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"


@lru_cache()
def get_settings() -> Settings:
    """
    Get application settings (cached).

    Usage:
        settings = get_settings()
        print(settings.app_name)
    """
    return Settings()


# Convenience export
settings = get_settings()
