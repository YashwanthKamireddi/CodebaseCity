"""
Pydantic Models Unit Tests
Tests for API request/response models.
"""

import pytest
from pydantic import ValidationError
from api.models import (
    AnalyzeRequest,
    SearchRequest,
    BuildingMetrics,
    Building,
    LanguageType
)


class TestAnalyzeRequest:
    """Test AnalyzeRequest model validation."""

    def test_valid_local_path(self):
        """Test valid local path."""
        req = AnalyzeRequest(path="/home/user/project")
        assert req.path == "/home/user/project"

    def test_valid_github_url(self):
        """Test valid GitHub URL."""
        req = AnalyzeRequest(path="https://github.com/owner/repo")
        assert "github.com" in req.path

    def test_valid_github_shorthand(self):
        """Test valid GitHub shorthand."""
        req = AnalyzeRequest(path="owner/repo")
        assert req.path == "owner/repo"

    def test_empty_path_rejected(self):
        """Test empty path is rejected."""
        with pytest.raises(ValidationError):
            AnalyzeRequest(path="")

    def test_whitespace_path_rejected(self):
        """Test whitespace-only path is rejected."""
        with pytest.raises(ValidationError):
            AnalyzeRequest(path="   ")

    def test_path_traversal_rejected(self):
        """Test path traversal is rejected."""
        with pytest.raises(ValidationError):
            AnalyzeRequest(path="../../../etc/passwd")

    def test_max_files_default(self):
        """Test max_files has correct default."""
        req = AnalyzeRequest(path="/path")
        assert req.max_files == 1000

    def test_max_files_validation(self):
        """Test max_files validation."""
        # Valid range
        req = AnalyzeRequest(path="/path", max_files=500)
        assert req.max_files == 500

        # Too low
        with pytest.raises(ValidationError):
            AnalyzeRequest(path="/path", max_files=0)

        # Too high
        with pytest.raises(ValidationError):
            AnalyzeRequest(path="/path", max_files=100000)


class TestSearchRequest:
    """Test SearchRequest model validation."""

    def test_valid_query(self):
        """Test valid search query."""
        req = SearchRequest(query="authentication")
        assert req.query == "authentication"

    def test_query_trimmed(self):
        """Test query is trimmed."""
        req = SearchRequest(query="  search term  ")
        assert req.query == "search term"

    def test_empty_query_rejected(self):
        """Test empty query is rejected."""
        with pytest.raises(ValidationError):
            SearchRequest(query="")

    def test_query_max_length(self):
        """Test query max length."""
        long_query = "a" * 501
        with pytest.raises(ValidationError):
            SearchRequest(query=long_query)


class TestBuildingMetrics:
    """Test BuildingMetrics model."""

    def test_valid_metrics(self):
        """Test valid metrics creation."""
        metrics = BuildingMetrics(
            loc=100,
            complexity=5,
            churn=3,
            age_days=30,
            dependencies_in=2,
            dependencies_out=5,
            size_bytes=2500
        )
        assert metrics.loc == 100
        assert metrics.complexity == 5

    def test_default_values(self):
        """Test default values."""
        metrics = BuildingMetrics(loc=50)
        assert metrics.complexity == 1
        assert metrics.churn == 0
        assert metrics.age_days == 0

    def test_negative_loc_rejected(self):
        """Test negative LOC is rejected."""
        with pytest.raises(ValidationError):
            BuildingMetrics(loc=-10)


class TestBuilding:
    """Test Building model."""

    def test_valid_building(self):
        """Test valid building creation."""
        building = Building(
            id="src/main.py",
            name="main.py",
            path="src/main.py",
            district_id="src",
            position={"x": 0, "y": 5, "z": 0}
        )
        assert building.id == "src/main.py"
        assert building.name == "main.py"

    def test_empty_id_rejected(self):
        """Test empty id is rejected."""
        with pytest.raises(ValidationError):
            Building(
                id="",
                name="main.py",
                path="src/main.py",
                district_id="src",
                position={"x": 0, "y": 0, "z": 0}
            )


class TestLanguageType:
    """Test LanguageType enum."""

    def test_supported_languages(self):
        """Test all supported languages."""
        assert LanguageType.PYTHON == "python"
        assert LanguageType.JAVASCRIPT == "javascript"
        assert LanguageType.TYPESCRIPT == "typescript"
        assert LanguageType.JAVA == "java"
        assert LanguageType.GO == "go"
        assert LanguageType.RUST == "rust"

    def test_unknown_language(self):
        """Test unknown language fallback."""
        assert LanguageType.UNKNOWN == "unknown"
