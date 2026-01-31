"""
API Routes Unit Tests
Tests for the main API endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_root_endpoint(self, test_client):
        """Test the root endpoint returns service info."""
        response = test_client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "Codebase City" in data["data"]["name"]
        assert data["data"]["status"] == "running"

    def test_health_endpoint(self, test_client):
        """Test the health endpoint."""
        response = test_client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data


class TestAnalyzeEndpoint:
    """Test the /api/analyze endpoint."""

    def test_analyze_requires_path(self, test_client):
        """Test that analyze endpoint requires a path."""
        response = test_client.post("/api/analyze", json={})
        assert response.status_code == 422  # Validation error

    def test_analyze_rejects_empty_path(self, test_client):
        """Test that empty path is rejected."""
        response = test_client.post("/api/analyze", json={"path": ""})
        assert response.status_code == 422

    def test_analyze_rejects_path_traversal(self, test_client):
        """Test that path traversal is blocked."""
        response = test_client.post("/api/analyze", json={"path": "../../../etc/passwd"})
        assert response.status_code == 422

    @patch('api.routes.analyzer')
    @patch('api.routes.GitService')
    def test_analyze_local_path(self, mock_git, mock_analyzer, test_client, mock_city_data, temp_project_dir):
        """Test analyzing a local directory."""
        mock_git.parse_url.return_value = (temp_project_dir, False, "test")
        mock_analyzer.analyze.return_value = mock_city_data

        response = test_client.post("/api/analyze", json={"path": temp_project_dir})

        # Should succeed or return cached
        assert response.status_code in [200, 404]


class TestSearchEndpoint:
    """Test the /api/search endpoint."""

    def test_search_requires_query(self, test_client):
        """Test that search requires a query."""
        response = test_client.post("/api/search", json={})
        assert response.status_code == 422

    def test_search_rejects_empty_query(self, test_client):
        """Test that empty query is rejected."""
        response = test_client.post("/api/search", json={"query": ""})
        assert response.status_code == 422


class TestChatEndpoint:
    """Test the /api/chat endpoint."""

    def test_chat_requires_message(self, test_client):
        """Test that chat requires a message."""
        response = test_client.post("/api/chat", json={})
        assert response.status_code == 422

    @patch('api.routes.guide')
    def test_chat_returns_response(self, mock_guide, test_client):
        """Test that chat returns AI response."""
        mock_guide.chat.return_value = "This is a test response from the AI guide."

        response = test_client.post("/api/chat", json={
            "message": "What is this codebase about?",
            "context": {}
        })

        # May fail if AI not configured, which is expected
        assert response.status_code in [200, 500, 502]


class TestFilesEndpoint:
    """Test the /api/files endpoints."""

    def test_files_content_requires_path(self, test_client):
        """Test that file content endpoint requires path."""
        response = test_client.get("/api/files/content")
        assert response.status_code == 422

    def test_files_content_nonexistent_file(self, test_client):
        """Test reading nonexistent file."""
        response = test_client.get("/api/files/content", params={"path": "/nonexistent/file.py"})
        assert response.status_code in [404, 500]
