"""
High-Performance Codebase Analyzer (Pipeline Architecture)
Optimized for massive repositories (Linux kernel scale)
Uses modular pipeline steps for maintainability.
"""

from pathlib import Path
from api.models import CityData, Building, District, Road, BuildingMetrics
from parsing.pipeline.base import PipelineContext
from parsing.pipeline.discovery import DiscoveryStep
from parsing.pipeline.parsing import ParsingStep
from parsing.pipeline.graph import GraphStep
from parsing.pipeline.intelligence import IntelligenceStep

from parsing.pipeline.git_meta import GitMetaStep

class CodebaseAnalyzer:
    """High-performance codebase analyzer using Pipeline Pattern"""

    def __init__(self):
        # Initialize Pipeline Steps
        self.steps = [
            DiscoveryStep(),
            ParsingStep(),
            GitMetaStep(),  # Inject Git Data
            GraphStep(),
            IntelligenceStep()
        ]
        self.last_parsed_files = [] # For Search Indexing interaction

    async def analyze(self, repo_path: str, max_files: int = 1000) -> CityData:
        """
        Analyze a repository from path.
        """
        import os

        # Normalize path and extract repo name (handle trailing slashes)
        normalized_path = repo_path.rstrip('/\\')
        repo_name = os.path.basename(normalized_path)

        # Fallback if still empty (e.g., root path)
        if not repo_name:
            repo_name = os.path.basename(os.path.dirname(normalized_path)) or 'Unnamed Project'

        # Initialize Context
        context = PipelineContext(repo_path, max_files)

        # Execute Pipeline
        for step in self.steps:
            context = await step.execute(context)

        # Update name if metadata found (but not with empty string)
        metadata_name = context.metadata.get('name', '').strip()
        if metadata_name:
            repo_name = metadata_name

        # Cache for search indexing
        self.last_parsed_files = context.parsed_files

        return self._build_city(context, repo_name, repo_path)

    def _build_city(self, context: PipelineContext, name: str, repo_path: str = None) -> CityData:
        """Assemble the final city data structure from context"""

        # Build buildings
        buildings = []

        for pf in context.parsed_files:
            pos = context.layout['positions'].get(pf['id'], {'x': 0, 'y': 0, 'z': 0})
            cluster_id = context.layout['file_clusters'].get(pf['id'], 'default')

            # Visual Dimensions
            width = max(2, min(10, pf['loc'] / 100))
            height = max(1, min(25, pf['complexity'] * 0.8))
            depth = max(2, min(10, pf['loc'] / 100))

            # Graph Metrics
            g = context.graph
            deps_in = g.in_degree(pf['id']) if g.has_node(pf['id']) else 0
            deps_out = g.out_degree(pf['id']) if g.has_node(pf['id']) else 0

            buildings.append(Building(
                id=pf['id'],
                name=pf['name'],
                path=pf['path'],
                district_id=cluster_id,
                position=pos,
                dimensions={'width': width, 'height': height, 'depth': depth},
                metrics=BuildingMetrics(
                    loc=pf['loc'],
                    complexity=pf['complexity'],
                    churn=pf.get('churn', 0),
                    age_days=pf.get('age_days', 0),
                    dependencies_in=deps_in,
                    dependencies_out=deps_out,
                    size_bytes=pf.get('size_bytes', 0)
                ),
                language=pf['language'],
                decay_level=pf.get('decay_level', 0),
                is_hotspot=pf.get('is_hotspot', False),

                # Social / Git Metadata
                author=pf.get('author', 'Unknown'),
                email=pf.get('email', ''),
                email_hash=pf.get('email_hash'),
                last_modified=pf.get('last_modified', 0)
            ))

        # Build districts
        districts = []
        for cluster in context.clusters:
            districts.append(District(
                id=cluster['id'],
                name=cluster['name'],
                color=cluster['color'],
                center=cluster['center'],
                boundary=cluster['boundary'],
                building_count=cluster['size'],
                description=cluster.get('description')
            ))

        # Build roads (capped)
        roads = []
        edge_count = 0
        max_edges = 500

        for source, target, data in context.graph.edges(data=True):
            if edge_count >= max_edges: break

            src_cluster = context.layout['file_clusters'].get(source)
            tgt_cluster = context.layout['file_clusters'].get(target)

            roads.append(Road(
                source=source,
                target=target,
                weight=data.get('weight', 1.0),
                path=[],
                is_cross_district=src_cluster != tgt_cluster
            ))
            edge_count += 1

        city = CityData(
            name=name,
            path=repo_path,
            buildings=buildings,
            districts=districts,
            roads=roads,
            stats={
                'total_files': len(buildings),
                'total_loc': sum(b.metrics.loc for b in buildings),
                'total_districts': len(districts),
                'total_dependencies': context.graph.number_of_edges(),
                'hotspots': sum(1 for b in buildings if b.is_hotspot)
            }
        )
        # Inject metadata
        city.metadata = context.metadata
        return city

    def _empty_city(self, name: str) -> CityData:
        return CityData(
            name=name,
            buildings=[], districts=[], roads=[],
            stats={'total_files': 0, 'total_loc': 0, 'total_districts': 0, 'total_dependencies': 0, 'hotspots': 0}
        )
