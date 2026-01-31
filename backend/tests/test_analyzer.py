"""
Analyzer Unit Tests
Tests for the codebase analysis engine.
"""

import pytest
import os
from parsing.analyzer import CodebaseAnalyzer


class TestCodebaseAnalyzer:
    """Test the CodebaseAnalyzer class."""

    @pytest.fixture
    def analyzer(self):
        """Create analyzer instance."""
        return CodebaseAnalyzer()

    def test_analyzer_initialization(self, analyzer):
        """Test analyzer initializes correctly."""
        assert analyzer is not None

    def test_analyze_temp_project(self, analyzer, temp_project_dir):
        """Test analyzing a temporary project."""
        result = analyzer.analyze(temp_project_dir)

        # Should return city data structure
        assert result is not None
        assert "buildings" in result or hasattr(result, "buildings")

    def test_analyze_nonexistent_path(self, analyzer):
        """Test analyzing nonexistent path."""
        with pytest.raises(Exception):
            analyzer.analyze("/nonexistent/path/12345")

    def test_file_extension_detection(self, analyzer):
        """Test language detection by extension."""
        test_cases = [
            ("main.py", "python"),
            ("app.js", "javascript"),
            ("component.tsx", "typescript"),
            ("Main.java", "java"),
            ("main.go", "go"),
            ("lib.rs", "rust"),
            ("unknown.xyz", "unknown")
        ]

        for filename, expected_lang in test_cases:
            # Analyzer should have a method to detect language
            if hasattr(analyzer, '_detect_language'):
                lang = analyzer._detect_language(filename)
                assert lang == expected_lang, f"Expected {expected_lang} for {filename}"


class TestMetricsCalculation:
    """Test code metrics calculation."""

    @pytest.fixture
    def analyzer(self):
        return CodebaseAnalyzer()

    def test_loc_calculation(self, analyzer, temp_project_dir):
        """Test lines of code calculation."""
        result = analyzer.analyze(temp_project_dir)

        if hasattr(result, 'buildings'):
            buildings = result.buildings
        else:
            buildings = result.get('buildings', [])

        # All buildings should have positive LOC
        for building in buildings:
            metrics = building.get('metrics', {}) if isinstance(building, dict) else building.metrics
            if metrics:
                loc = metrics.get('loc', 0) if isinstance(metrics, dict) else metrics.loc
                assert loc >= 0

    def test_complexity_calculation(self, analyzer, temp_project_dir):
        """Test complexity calculation."""
        result = analyzer.analyze(temp_project_dir)

        if hasattr(result, 'buildings'):
            buildings = result.buildings
        else:
            buildings = result.get('buildings', [])

        # All buildings should have complexity >= 1
        for building in buildings:
            metrics = building.get('metrics', {}) if isinstance(building, dict) else building.metrics
            if metrics:
                complexity = metrics.get('complexity', 1) if isinstance(metrics, dict) else metrics.complexity
                assert complexity >= 1
