"""
Pytest Configuration & Fixtures
Shared test utilities for the Codebase City backend.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
import tempfile
import os
import shutil


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    from main import app
    with TestClient(app) as client:
        yield client


@pytest.fixture
def mock_city_data():
    """Sample city data for testing."""
    return {
        "name": "test-project",
        "path": "/tmp/test-project",
        "buildings": [
            {
                "id": "src/main.py",
                "name": "main.py",
                "path": "src/main.py",
                "district_id": "src",
                "language": "python",
                "position": {"x": 0, "y": 5, "z": 0},
                "dimensions": {"width": 8, "height": 10, "depth": 8},
                "metrics": {
                    "loc": 150,
                    "complexity": 5,
                    "churn": 2,
                    "dependencies_in": 3,
                    "dependencies_out": 5,
                    "size_bytes": 4500,
                    "age_days": 30
                },
                "is_hotspot": False
            },
            {
                "id": "src/utils.py",
                "name": "utils.py",
                "path": "src/utils.py",
                "district_id": "src",
                "language": "python",
                "position": {"x": 20, "y": 3, "z": 10},
                "dimensions": {"width": 6, "height": 6, "depth": 6},
                "metrics": {
                    "loc": 80,
                    "complexity": 3,
                    "churn": 1,
                    "dependencies_in": 5,
                    "dependencies_out": 2,
                    "size_bytes": 2200,
                    "age_days": 60
                },
                "is_hotspot": False
            }
        ],
        "districts": [
            {
                "id": "src",
                "name": "src",
                "center": {"x": 10, "z": 5},
                "bounds": {
                    "min": {"x": -50, "z": -50},
                    "max": {"x": 50, "z": 50}
                }
            }
        ],
        "roads": [
            {
                "source": "src/main.py",
                "target": "src/utils.py",
                "weight": 1
            }
        ],
        "stats": {
            "total_files": 2,
            "total_loc": 230,
            "total_dependencies": 1,
            "hotspots": 0,
            "languages": {"python": 2}
        }
    }


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory with sample files."""
    temp_dir = tempfile.mkdtemp(prefix="codebase_city_test_")

    # Create sample Python project structure
    src_dir = os.path.join(temp_dir, "src")
    os.makedirs(src_dir)

    # Create main.py
    with open(os.path.join(src_dir, "main.py"), "w") as f:
        f.write('''"""Main application module."""

def main():
    """Entry point."""
    print("Hello, World!")
    return 0

if __name__ == "__main__":
    main()
''')

    # Create utils.py
    with open(os.path.join(src_dir, "utils.py"), "w") as f:
        f.write('''"""Utility functions."""

def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b

def multiply(a: int, b: int) -> int:
    """Multiply two numbers."""
    return a * b
''')

    # Create a subdirectory with more files
    models_dir = os.path.join(src_dir, "models")
    os.makedirs(models_dir)

    with open(os.path.join(models_dir, "__init__.py"), "w") as f:
        f.write('"""Models package."""\n')

    with open(os.path.join(models_dir, "user.py"), "w") as f:
        f.write('''"""User model."""

class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

    def __repr__(self):
        return f"User(name={self.name!r}, email={self.email!r})"
''')

    yield temp_dir

    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def mock_gemini_response():
    """Mock response from Gemini AI."""
    return {
        "message": "Based on my analysis of the codebase, I can see that this is a well-structured Python project.",
        "suggestions": [
            "Consider adding type hints to all functions",
            "The main.py file could benefit from better error handling"
        ]
    }


@pytest.fixture
def mock_git_service():
    """Mock GitService for testing."""
    mock = MagicMock()
    mock.parse_url.return_value = ("/tmp/test-repo", False, "test-repo")
    mock.clone_repo.return_value = "/tmp/test-repo"
    mock.get_file_history.return_value = [
        {
            "sha": "abc123",
            "author": "Test User",
            "date": "2024-01-15T10:30:00Z",
            "message": "Initial commit"
        }
    ]
    return mock
