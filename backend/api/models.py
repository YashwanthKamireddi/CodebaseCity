"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class AnalyzeRequest(BaseModel):
    """Request to analyze a codebase"""
    path: str = Field(..., description="Local path or GitHub URL to analyze")
    max_files: int = Field(default=1000, description="Maximum files to process")


class BuildingMetrics(BaseModel):
    """Metrics for a single building (file)"""
    loc: int = Field(..., description="Lines of code")
    complexity: int = Field(default=1, description="Cyclomatic complexity")
    churn: int = Field(default=0, description="Number of recent commits")
    age_days: int = Field(default=0, description="Days since last modification")
    dependencies_in: int = Field(default=0, description="Incoming dependencies")
    dependencies_out: int = Field(default=0, description="Outgoing dependencies")


class Building(BaseModel):
    """A building represents a file in the city"""
    id: str = Field(..., description="Unique identifier (file path)")
    name: str = Field(..., description="Display name (filename)")
    path: str = Field(..., description="Full file path")
    district_id: str = Field(..., description="Which district this belongs to")
    position: Dict[str, float] = Field(..., description="x, y, z coordinates")
    dimensions: Dict[str, float] = Field(..., description="width, height, depth")
    metrics: BuildingMetrics
    language: str = Field(default="unknown")
    summary: Optional[str] = Field(default=None, description="AI-generated summary")
    decay_level: float = Field(default=0.0, description="0-1, visual decay amount")
    is_hotspot: bool = Field(default=False, description="High churn + high complexity")


class District(BaseModel):
    """A district represents a semantic cluster of related files"""
    id: str
    name: str = Field(..., description="AI-generated semantic name")
    color: str = Field(..., description="Hex color for this district")
    center: Dict[str, float] = Field(..., description="Center x, y coordinates")
    boundary: List[Dict[str, float]] = Field(..., description="Polygon boundary points")
    building_count: int
    description: Optional[str] = Field(default=None)


class Road(BaseModel):
    """A road represents a dependency between buildings"""
    source: str = Field(..., description="Source building ID")
    target: str = Field(..., description="Target building ID")
    weight: float = Field(default=1.0, description="Dependency strength")
    path: List[Dict[str, float]] = Field(..., description="Bundled path points")
    is_cross_district: bool = Field(default=False)


class CityData(BaseModel):
    """Complete city representation"""
    name: str
    buildings: List[Building]
    districts: List[District]
    roads: List[Road]
    stats: Dict[str, Any] = Field(default_factory=dict)


class ChatMessage(BaseModel):
    """A chat message for the City Guide"""
    role: str = Field(..., description="user or assistant")
    content: str


class ChatRequest(BaseModel):
    """Request to chat with the City Guide"""
    message: str
    context: Optional[Dict[str, Any]] = Field(default=None, description="Current view context")
    history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Response from the City Guide"""
    message: str
    highlighted_buildings: List[str] = Field(default_factory=list)
    navigation_target: Optional[str] = Field(default=None)


class BuildingDetailRequest(BaseModel):
    """Request for building details"""
    building_id: str


class BuildingDetail(BaseModel):
    """Detailed information about a building"""
    id: str
    name: str
    path: str
    metrics: BuildingMetrics
    summary: str
    imports: List[str]
    imported_by: List[str]
    recent_changes: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
