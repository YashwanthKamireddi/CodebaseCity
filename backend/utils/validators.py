"""
Professional Input Validation Module
Enterprise-grade validation for all API inputs with security hardening.
"""

import os
import re
from typing import Optional, Tuple
from fastapi import HTTPException
from pydantic import validator
from urllib.parse import urlparse


class PathValidator:
    """
    Validates and sanitizes file system paths.
    Prevents path traversal attacks and ensures safe file access.
    """

    # Allowed file extensions for reading
    ALLOWED_EXTENSIONS = {
        '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go', '.rs', '.rb',
        '.cpp', '.c', '.h', '.hpp', '.cs', '.php', '.swift', '.kt', '.scala',
        '.vue', '.svelte', '.astro', '.html', '.css', '.scss', '.sass', '.less',
        '.json', '.yaml', '.yml', '.toml', '.xml', '.md', '.txt', '.sql',
        '.sh', '.bash', '.zsh', '.fish', '.dockerfile', '.gitignore',
        '.env.example', '.prisma', '.graphql', '.proto'
    }

    # Maximum path length (prevent DoS)
    MAX_PATH_LENGTH = 4096

    # Dangerous patterns
    DANGEROUS_PATTERNS = [
        r'\.\.',           # Path traversal
        r'~/',             # Home directory access
        r'/etc/',          # System config
        r'/proc/',         # Process info
        r'/sys/',          # Kernel interface
        r'/dev/',          # Devices
        r'/var/log/',      # System logs
        r'\\\\',           # UNC paths
        r'%[0-9a-fA-F]{2}' # URL encoded traversal
    ]

    @classmethod
    def validate_path(cls, path: str, must_exist: bool = True) -> str:
        """
        Validate and normalize a file system path.

        Args:
            path: The path to validate
            must_exist: Whether the path must exist on disk

        Returns:
            Normalized absolute path

        Raises:
            HTTPException: If validation fails
        """
        if not path or not isinstance(path, str):
            raise HTTPException(status_code=400, detail="Invalid path: empty or wrong type")

        # Length check
        if len(path) > cls.MAX_PATH_LENGTH:
            raise HTTPException(status_code=400, detail="Path too long")

        # Check for dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, path):
                raise HTTPException(status_code=400, detail="Invalid path: forbidden pattern detected")

        # Normalize path
        try:
            normalized = os.path.normpath(os.path.abspath(path))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid path format")

        # Double-check no traversal after normalization
        if '..' in normalized:
            raise HTTPException(status_code=400, detail="Invalid path: traversal detected")

        # Existence check
        if must_exist and not os.path.exists(normalized):
            raise HTTPException(status_code=404, detail=f"Path not found: {path}")

        return normalized

    @classmethod
    def validate_file_for_read(cls, path: str, max_size_mb: float = 10.0) -> str:
        """
        Validate a file path for safe reading.

        Args:
            path: The file path
            max_size_mb: Maximum file size in megabytes

        Returns:
            Validated absolute path
        """
        validated = cls.validate_path(path, must_exist=True)

        # Must be a file
        if not os.path.isfile(validated):
            raise HTTPException(status_code=400, detail="Path is not a file")

        # Check extension (security - prevent reading sensitive files)
        ext = os.path.splitext(validated)[1].lower()
        if ext not in cls.ALLOWED_EXTENSIONS and ext != '':
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed: {ext}. Allowed: {', '.join(sorted(cls.ALLOWED_EXTENSIONS)[:10])}..."
            )

        # Size check
        size_bytes = os.path.getsize(validated)
        max_bytes = max_size_mb * 1024 * 1024
        if size_bytes > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {size_bytes / (1024*1024):.2f}MB. Max: {max_size_mb}MB"
            )

        return validated


class GitHubValidator:
    """Validates GitHub URLs and repository references."""

    # Regex for valid GitHub repo patterns
    GITHUB_URL_PATTERN = re.compile(
        r'^(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)/([a-zA-Z0-9_.-]+)(?:\.git)?/?$'
    )

    GITHUB_SHORTHAND_PATTERN = re.compile(
        r'^([a-zA-Z0-9_-]+)/([a-zA-Z0-9_.-]+)$'
    )

    # Blocked large repos (prevent resource exhaustion)
    BLOCKED_REPOS = {
        'linux', 'chromium', 'gecko-dev', 'kubernetes', 'tensorflow',
        'llvm-project', 'rust', 'webkit', 'android', 'swift', 'node'
    }

    @classmethod
    def parse_github_input(cls, input_str: str) -> Tuple[Optional[str], str]:
        """
        Parse GitHub input into a valid clone URL.

        Args:
            input_str: GitHub URL or owner/repo shorthand

        Returns:
            Tuple of (clone_url, repo_name) or (None, "") if not GitHub
        """
        input_str = input_str.strip()

        # Check URL pattern
        url_match = cls.GITHUB_URL_PATTERN.match(input_str)
        if url_match:
            owner, repo = url_match.groups()
            repo = repo.replace('.git', '')
            return f"https://github.com/{owner}/{repo}.git", repo

        # Check shorthand pattern (owner/repo)
        short_match = cls.GITHUB_SHORTHAND_PATTERN.match(input_str)
        if short_match:
            owner, repo = short_match.groups()
            return f"https://github.com/{owner}/{repo}.git", repo

        # Not a GitHub reference
        return None, ""

    @classmethod
    def validate_repo_allowed(cls, repo_name: str) -> None:
        """
        Check if repository is allowed (not in blocklist).

        Raises:
            HTTPException if blocked
        """
        if repo_name.lower() in cls.BLOCKED_REPOS:
            raise HTTPException(
                status_code=413,
                detail=f"Repository '{repo_name}' is blocked (too large). Try a smaller repo."
            )


class QueryValidator:
    """Validates search queries and user input."""

    MAX_QUERY_LENGTH = 500
    MIN_QUERY_LENGTH = 1

    # Characters allowed in search queries
    ALLOWED_QUERY_CHARS = re.compile(r'^[\w\s\-_./\\:@#$%^&*()+=\[\]{}|;\'",<>?`~!]+$')

    @classmethod
    def validate_search_query(cls, query: str) -> str:
        """
        Validate and sanitize a search query.

        Args:
            query: The search query string

        Returns:
            Sanitized query
        """
        if not query or not isinstance(query, str):
            raise HTTPException(status_code=400, detail="Search query is required")

        query = query.strip()

        if len(query) < cls.MIN_QUERY_LENGTH:
            raise HTTPException(status_code=400, detail="Query too short")

        if len(query) > cls.MAX_QUERY_LENGTH:
            raise HTTPException(status_code=400, detail=f"Query too long. Max: {cls.MAX_QUERY_LENGTH} chars")

        # Basic sanitization (allow most chars for code search)
        if not cls.ALLOWED_QUERY_CHARS.match(query):
            raise HTTPException(status_code=400, detail="Query contains invalid characters")

        return query


class LimitValidator:
    """Validates pagination and limit parameters."""

    @staticmethod
    def validate_limit(value: int, min_val: int = 1, max_val: int = 1000, default: int = 50) -> int:
        """Validate a limit/pagination parameter."""
        if not isinstance(value, int):
            try:
                value = int(value)
            except (TypeError, ValueError):
                return default

        return max(min_val, min(value, max_val))

    @staticmethod
    def validate_offset(value: int, min_val: int = 0, max_val: int = 100000) -> int:
        """Validate an offset parameter."""
        if not isinstance(value, int):
            try:
                value = int(value)
            except (TypeError, ValueError):
                return 0

        return max(min_val, min(value, max_val))


# Convenience functions
def validate_path(path: str, must_exist: bool = True) -> str:
    """Validate a file system path."""
    return PathValidator.validate_path(path, must_exist)


def validate_file(path: str, max_size_mb: float = 10.0) -> str:
    """Validate a file for reading."""
    return PathValidator.validate_file_for_read(path, max_size_mb)


def parse_github(input_str: str) -> Tuple[Optional[str], str]:
    """Parse GitHub URL or shorthand."""
    return GitHubValidator.parse_github_input(input_str)


def validate_query(query: str) -> str:
    """Validate a search query."""
    return QueryValidator.validate_search_query(query)
