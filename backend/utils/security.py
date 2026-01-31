"""
Security Utilities
Enterprise-grade security for Codebase City API.
"""

import os
import re
import hashlib
import secrets
from typing import Optional, List, Set
from functools import lru_cache

# Dangerous path patterns
BLOCKED_PATTERNS = [
    r'\.\./',           # Path traversal
    r'\.\.\\',          # Windows path traversal
    r'^/etc/',          # Linux system files
    r'^/proc/',         # Linux proc filesystem
    r'^/sys/',          # Linux sys filesystem
    r'^/dev/',          # Linux devices
    r'^/root/',         # Root home
    r'~/',              # Home directory expansion
    r'^C:\\Windows',    # Windows system (case insensitive handled)
    r'^C:\\System',     # Windows system
    r'\.env',           # Environment files
    r'\.git/config',    # Git credentials
    r'id_rsa',          # SSH keys
    r'\.pem$',          # Certificates
    r'\.key$',          # Private keys
    r'password',        # Password files
    r'secret',          # Secret files
    r'credential',      # Credential files
]

# Allowed file extensions for analysis
ALLOWED_EXTENSIONS: Set[str] = {
    # Programming languages
    '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rs', '.rb',
    '.php', '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt', '.scala',
    '.lua', '.r', '.m', '.mm', '.pl', '.pm', '.sh', '.bash', '.zsh',
    '.ps1', '.psm1', '.vue', '.svelte', '.elm',

    # Web
    '.html', '.htm', '.css', '.scss', '.sass', '.less',

    # Data/Config
    '.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.cfg',
    '.md', '.markdown', '.rst', '.txt',

    # Build/DevOps
    '.dockerfile', '.makefile', '.cmake', '.gradle', '.maven',
}

# Max file size (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024

# Max path length
MAX_PATH_LENGTH = 4096


def sanitize_path(path: str) -> str:
    """
    Sanitize a file path to prevent security issues.

    - Removes null bytes
    - Normalizes path separators
    - Blocks dangerous patterns
    - Validates length
    """
    if not path:
        raise ValueError("Path cannot be empty")

    # Remove null bytes
    path = path.replace('\x00', '')

    # Normalize separators
    path = path.replace('\\', '/')

    # Check length
    if len(path) > MAX_PATH_LENGTH:
        raise ValueError(f"Path too long (max {MAX_PATH_LENGTH} chars)")

    # Check blocked patterns
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, path, re.IGNORECASE):
            raise ValueError(f"Path contains blocked pattern: {pattern}")

    return path


def validate_file_extension(path: str) -> bool:
    """Check if file extension is allowed for analysis."""
    ext = os.path.splitext(path)[1].lower()
    return ext in ALLOWED_EXTENSIONS or ext == ''


def is_safe_file(path: str) -> bool:
    """
    Check if a file is safe to read/analyze.

    - Must exist
    - Must be a regular file (not symlink)
    - Must not exceed size limit
    - Must have allowed extension
    """
    try:
        # Resolve to absolute path
        abs_path = os.path.abspath(path)

        # Check if file exists
        if not os.path.exists(abs_path):
            return False

        # Check if it's a regular file (not symlink)
        if os.path.islink(abs_path):
            return False

        if not os.path.isfile(abs_path):
            return False

        # Check file size
        if os.path.getsize(abs_path) > MAX_FILE_SIZE:
            return False

        # Check extension
        if not validate_file_extension(abs_path):
            return False

        return True
    except (OSError, IOError):
        return False


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(length)


def hash_content(content: str) -> str:
    """Create a secure hash of content for caching."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def sanitize_log_message(message: str) -> str:
    """
    Sanitize a message before logging to prevent log injection.
    Removes newlines and control characters.
    """
    # Remove control characters
    message = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', message)

    # Escape newlines
    message = message.replace('\n', '\\n').replace('\r', '\\r')

    # Truncate very long messages
    max_length = 2000
    if len(message) > max_length:
        message = message[:max_length] + '... (truncated)'

    return message


def mask_sensitive_data(data: str) -> str:
    """
    Mask sensitive data in strings (API keys, tokens, passwords).
    """
    patterns = [
        # API keys
        (r'(api[_-]?key["\s:=]+)["\']?([a-zA-Z0-9_-]{20,})["\']?', r'\1***MASKED***'),
        # Bearer tokens
        (r'(Bearer\s+)([a-zA-Z0-9._-]+)', r'\1***MASKED***'),
        # Passwords
        (r'(password["\s:=]+)["\']?([^"\'\s]+)["\']?', r'\1***MASKED***'),
        # Private keys
        (r'(-----BEGIN[A-Z\s]+PRIVATE KEY-----).+(-----END[A-Z\s]+PRIVATE KEY-----)',
         r'\1***MASKED***\2'),
    ]

    for pattern, replacement in patterns:
        data = re.sub(pattern, replacement, data, flags=re.IGNORECASE | re.DOTALL)

    return data


@lru_cache(maxsize=1000)
def is_internal_path(path: str) -> bool:
    """
    Check if a path is internal to the analyzed project.
    Used to prevent leaking absolute paths in responses.
    """
    # Normalize path
    path = os.path.normpath(path)

    # Check if it's a relative path
    if not os.path.isabs(path):
        return True

    # Check if it starts with temp directory
    temp_dirs = ['/tmp', '/var/tmp', os.path.expanduser('~/.cache')]
    for temp_dir in temp_dirs:
        if path.startswith(temp_dir):
            return True

    return False


def validate_github_url(url: str) -> bool:
    """Validate a GitHub URL format."""
    github_patterns = [
        r'^https?://github\.com/[\w-]+/[\w.-]+/?$',
        r'^[\w-]+/[\w.-]+$',  # Shorthand format
    ]

    return any(re.match(pattern, url) for pattern in github_patterns)


class RateLimitError(Exception):
    """Raised when rate limit is exceeded."""
    pass


class SecurityViolationError(Exception):
    """Raised when a security violation is detected."""
    pass
