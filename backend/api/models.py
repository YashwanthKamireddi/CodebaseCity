"""
Pydantic models for API requests and responses.
Enterprise-grade data validation with comprehensive documentation.
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any, Literal
from enum import Enum
import re


class LanguageType(str, Enum):
    """Supported programming languages."""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    JAVA = "java"
    GO = "go"
    RUST = "rust"
    CPP = "cpp"
    C = "c"
    CSHARP = "csharp"
    PHP = "php"
    RUBY = "ruby"
    SWIFT = "swift"
    KOTLIN = "kotlin"
    SCALA = "scala"
    HTML = "html"
    CSS = "css"
    SQL = "sql"
    UNKNOWN = "unknown"


class SearchRequest(BaseModel):
    """Request for semantic code search."""
    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Search query string",
        json_schema_extra={"example": "authentication handler"}
    )

    @field_validator('query')
    @classmethod
    def validate_query(cls, v: str) -> str:
        """Sanitize and validate search query."""
        return v.strip()


class AnalyzeRequest(BaseModel):
    """
    Request to analyze a codebase.
    Accepts local paths or GitHub URLs.
    """
    path: str = Field(
        ...,
        min_length=1,
        max_length=2048,
        description="Local path or GitHub URL to analyze",
        json_schema_extra={"example": "owner/repo or /path/to/project"}
    )
    max_files: int = Field(
        default=1000,
        ge=1,
        le=10000,
        description="Maximum files to process"
    )

    @field_validator('path')
    @classmethod
    def validate_path(cls, v: str) -> str:
        """Validate and normalize path input."""
        v = v.strip()
        if not v:
            raise ValueError("Path cannot be empty")
        # Block obviously dangerous patterns
        if '..' in v and not ('github.com' in v):
            raise ValueError("Path traversal not allowed")
        return v


class BuildingMetrics(BaseModel):
    """Metrics for a single building (file)."""
    loc: int = Field(..., ge=0, description="Lines of code")
    complexity: int = Field(default=1, ge=1, description="Cyclomatic complexity")
    churn: int = Field(default=0, ge=0, description="Number of recent commits")
    age_days: int = Field(default=0, ge=0, description="Days since last modification")
    dependencies_in: int = Field(default=0, ge=0, description="Incoming dependencies")
    dependencies_out: int = Field(default=0, ge=0, description="Outgoing dependencies")
    size_bytes: int = Field(default=0, ge=0, description="File size in bytes")


class Building(BaseModel):
    """A building represents a file in the city."""
    id: str = Field(..., min_length=1, description="Unique identifier (file path)")
    name: str = Field(..., min_length=1, description="Display name (filename)")
    path: str = Field(..., min_length=1, description="Full file path")
    district_id: str = Field(..., description="Which district this belongs to")
    position: Dict[str, float] = Field(..., description="x, y, z coordinates")
    dimensions: Dict[str, float] = Field(..., description="width, height, depth")
    metrics: BuildingMetrics
    language: str = Field(default="unknown")
    summary: Optional[str] = Field(default=None, description="AI-generated summary")
    decay_level: float = Field(default=0.0, ge=0.0, le=1.0, description="0-1, visual decay amount")
    is_hotspot: bool = Field(default=False, description="High churn + high complexity")
    author: Optional[str] = Field(default="Unknown", description="Primary author")
    email: Optional[str] = Field(default=None, description="Author email")
    email_hash: Optional[str] = Field(default=None, description="MD5 hash of email for Gravatar")
    last_modified: Optional[int] = Field(default=None, description="Unix timestamp of last modification")


class District(BaseModel):
    """A district represents a semantic cluster of related files."""
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, description="AI-generated semantic name")
    color: str = Field(..., pattern=r'^#[0-9a-fA-F]{6}$', description="Hex color for this district")
    center: Dict[str, float] = Field(..., description="Center x, y coordinates")
    boundary: List[Dict[str, float]] = Field(..., description="Polygon boundary points")
    building_count: int = Field(..., ge=0)
    description: Optional[str] = Field(default=None)


class Road(BaseModel):
    """A road represents a dependency between buildings."""
    source: str = Field(..., min_length=1, description="Source building ID")
    target: str = Field(..., min_length=1, description="Target building ID")
    weight: float = Field(default=1.0, ge=0.0, description="Dependency strength")
    path: List[Dict[str, float]] = Field(default_factory=list, description="Bundled path points")
    is_cross_district: bool = Field(default=False)


class CityStats(BaseModel):
    """Statistics about the analyzed city."""
    total_files: int = Field(default=0, ge=0)
    total_loc: int = Field(default=0, ge=0)
    total_districts: int = Field(default=0, ge=0)
    total_dependencies: int = Field(default=0, ge=0)
    hotspots: int = Field(default=0, ge=0)


class CityData(BaseModel):
    """Complete city representation."""
    name: str = Field(..., min_length=1)
    path: Optional[str] = Field(default=None, description="Local absolute path to the repo")
    buildings: List[Building] = Field(default_factory=list)
    districts: List[District] = Field(default_factory=list)
    roads: List[Road] = Field(default_factory=list)
    stats: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional analysis metadata")


class ChatMessage(BaseModel):
    """A chat message for the City Guide."""
    role: Literal["user", "assistant"] = Field(..., description="Message role")
    content: str = Field(..., min_length=1, max_length=10000, description="Message content")


class ChatRequest(BaseModel):
    """Request to chat with the City Guide."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's message to the guide"
    )
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Current view context (selected building, district, etc.)"
    )
    history: List[ChatMessage] = Field(
        default_factory=list,
        max_length=20,
        description="Conversation history"
    )


class ChatResponse(BaseModel):
    """Response from the City Guide."""
    message: str = Field(..., description="Guide's response")
    highlighted_buildings: List[str] = Field(
        default_factory=list,
        description="Building IDs to highlight"
    )
    navigation_target: Optional[str] = Field(
        default=None,
        description="Building or district to navigate to"
    )


class BuildingDetailRequest(BaseModel):
    """Request for detailed building information."""
    building_id: str = Field(..., min_length=1, description="Building identifier")


class BuildingDetail(BaseModel):
    """Detailed information about a building."""
    id: str
    name: str
    path: str
    summary: str = Field(default="No summary available")
    functions: List[str] = Field(default_factory=list)
    classes: List[str] = Field(default_factory=list)
    imports: List[str] = Field(default_factory=list)
    imported_by: List[str] = Field(default_factory=list)
    metrics: BuildingMetrics
    issues: List[str] = Field(default_factory=list, description="Code quality issues")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")
    recent_changes: List[str] = Field(default_factory=list)


class SearchResult(BaseModel):
    """A single search result."""
    id: str
    name: str
    path: str
    language: str = Field(default="unknown")
    score: float = Field(ge=0.0)
    loc: int = Field(default=0, ge=0)
    complexity: int = Field(default=1, ge=0)
    match_preview: str = Field(default="")
    matches: List[Dict[str, Any]] = Field(default_factory=list, description="Line matches with context")


class SearchResponse(BaseModel):
    """Response containing search results."""
    results: List[SearchResult] = Field(default_factory=list)
    total: int = Field(default=0, ge=0)
    query: Optional[str] = Field(default=None)


class SymbolSearchRequest(BaseModel):
    """Request for symbol search (functions, classes, etc.)."""
    query: str = Field(..., min_length=1, max_length=200)
    symbol_type: Literal["all", "function", "class", "variable", "import"] = Field(default="all")


class SymbolResult(BaseModel):
    """A symbol search result."""
    symbol: str
    type: str
    file: str
    path: str
    line: int
    score: float = Field(ge=0.0)


class SymbolSearchResponse(BaseModel):
    """Response containing symbol search results."""
    results: List[SymbolResult] = Field(default_factory=list)
    total: int = Field(default=0, ge=0)


class FileContentResponse(BaseModel):
    """Response containing file content."""
    content: str = Field(..., description="Raw file content")
    path: Optional[str] = Field(default=None)
    language: Optional[str] = Field(default=None)
    size_bytes: Optional[int] = Field(default=None, ge=0)


# ============ NEW FEATURES ============

class GraphNode(BaseModel):
    """Node in the dependency graph."""
    id: str
    name: str
    path: str
    type: str = Field(default="file")  # file, module, package
    language: str = Field(default="unknown")
    loc: int = Field(default=0, ge=0)
    complexity: int = Field(default=1, ge=0)
    district_id: Optional[str] = Field(default=None)
    x: float = Field(default=0.0)
    y: float = Field(default=0.0)


class GraphEdge(BaseModel):
    """Edge in the dependency graph."""
    source: str
    target: str
    weight: float = Field(default=1.0, ge=0.0)
    type: str = Field(default="import")  # import, extends, implements


class DependencyGraphResponse(BaseModel):
    """2D Dependency graph for visualization."""
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    stats: Dict[str, Any] = Field(default_factory=dict)


class ExportRequest(BaseModel):
    """Request to export analysis report."""
    format: Literal["json", "pdf", "html", "markdown"] = Field(default="json")
    include_metrics: bool = Field(default=True)
    include_graph: bool = Field(default=True)
    include_issues: bool = Field(default=True)


class IncrementalAnalysisRequest(BaseModel):
    """Request for incremental analysis (only changed files)."""
    path: str = Field(..., min_length=1)
    since_commit: Optional[str] = Field(default=None, description="Git commit SHA to compare against")
    max_files: int = Field(default=500, ge=1, le=5000)
