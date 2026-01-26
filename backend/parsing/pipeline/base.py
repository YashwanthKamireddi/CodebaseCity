from abc import ABC, abstractmethod
from typing import Any, Dict

class PipelineContext:
    """Shared context passed between pipeline steps"""
    def __init__(self, root_path: str, max_files: int):
        self.root_path = root_path
        self.max_files = max_files
        self.files = []         # List[Path]
        self.parsed_files = []  # List[Dict]
        self.graph = None       # NetworkX Graph
        self.clusters = []      # List[District]
        self.layout = {}        # Layout Data
        self.metadata = {}      # Analysis Metadata

class PipelineStep(ABC):
    """Abstract base class for analysis steps"""

    @abstractmethod
    async def execute(self, context: PipelineContext) -> PipelineContext:
        pass
