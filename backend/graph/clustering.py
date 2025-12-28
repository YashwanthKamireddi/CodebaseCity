"""
Clustering Engine - Group files into semantic districts using Leiden algorithm
"""

import networkx as nx
from typing import List, Dict, Any, Optional
import random

# Colors for districts - vibrant city-themed palette
DISTRICT_COLORS = [
    "#FF6B6B",  # Coral Red - Business Logic
    "#4ECDC4",  # Teal - Data Layer
    "#45B7D1",  # Sky Blue - API
    "#96CEB4",  # Sage Green - Utils
    "#FFEAA7",  # Sunny Yellow - Config
    "#DDA0DD",  # Plum - Auth
    "#98D8C8",  # Mint - Services
    "#F7DC6F",  # Gold - Core
    "#BB8FCE",  # Lavender - UI
    "#85C1E9",  # Light Blue - Testing
    "#F8B500",  # Amber - Infrastructure
    "#00CED1",  # Dark Cyan - Networking
    "#FF7F50",  # Coral - Events
    "#9ACD32",  # Yellow Green - Plugins
    "#DA70D6",  # Orchid - Extensions
]


class ClusteringEngine:
    """Cluster files into semantic districts"""
    
    def __init__(self):
        self.min_cluster_size = 2
        self.max_clusters = 15
    
    async def cluster(
        self, 
        graph: nx.DiGraph, 
        parsed_files: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Cluster files into semantic districts.
        Uses Leiden algorithm if available, falls back to Louvain/component-based.
        """
        if graph.number_of_nodes() < 3:
            # Too small for clustering
            return self._create_single_district(parsed_files)
        
        # Try Leiden algorithm first
        try:
            clusters = self._leiden_clustering(graph)
        except ImportError:
            # Fall back to connected components + simple clustering
            clusters = self._simple_clustering(graph, parsed_files)
        
        # Enrich clusters with semantic names
        enriched = await self._enrich_clusters(clusters, parsed_files)
        
        return enriched
    
    def _leiden_clustering(self, graph: nx.DiGraph) -> Dict[str, int]:
        """Use Leiden algorithm for community detection"""
        import leidenalg
        import igraph as ig
        
        # Convert to undirected for community detection
        undirected = graph.to_undirected()
        
        # Convert NetworkX to igraph
        nodes = list(undirected.nodes())
        node_to_idx = {node: i for i, node in enumerate(nodes)}
        edges = [(node_to_idx[u], node_to_idx[v]) for u, v in undirected.edges()]
        
        ig_graph = ig.Graph(n=len(nodes), edges=edges)
        
        # Run Leiden
        partition = leidenalg.find_partition(
            ig_graph, 
            leidenalg.ModularityVertexPartition
        )
        
        # Map back to node IDs
        clusters = {}
        for cluster_id, members in enumerate(partition):
            for idx in members:
                clusters[nodes[idx]] = cluster_id
        
        return clusters
    
    def _simple_clustering(
        self, 
        graph: nx.DiGraph, 
        parsed_files: List[Dict]
    ) -> Dict[str, int]:
        """Fallback clustering based on directory structure and connectivity"""
        clusters = {}
        
        # Group by top-level directory
        dir_groups: Dict[str, List[str]] = {}
        
        for pf in parsed_files:
            path = pf['id']
            parts = path.replace('\\', '/').split('/')
            
            # Use first directory as cluster key
            if len(parts) > 1:
                key = parts[0]
            else:
                key = 'root'
            
            if key not in dir_groups:
                dir_groups[key] = []
            dir_groups[key].append(pf['id'])
        
        # Assign cluster IDs
        for cluster_id, (_, files) in enumerate(dir_groups.items()):
            for file_id in files:
                clusters[file_id] = cluster_id
        
        return clusters
    
    def _create_single_district(self, parsed_files: List[Dict]) -> List[Dict[str, Any]]:
        """Create a single district for very small codebases"""
        return [{
            'id': 'main',
            'name': 'Main District',
            'color': DISTRICT_COLORS[0],
            'files': [pf['id'] for pf in parsed_files],
            'size': len(parsed_files),
            'center': {'x': 0, 'y': 0},
            'boundary': [
                {'x': -50, 'y': -50},
                {'x': 50, 'y': -50},
                {'x': 50, 'y': 50},
                {'x': -50, 'y': 50}
            ]
        }]
    
    async def _enrich_clusters(
        self, 
        cluster_assignments: Dict[str, int],
        parsed_files: List[Dict]
    ) -> List[Dict[str, Any]]:
        """Add semantic names and colors to clusters - works without AI"""
        
        # Group files by cluster
        cluster_files: Dict[int, List[Dict]] = {}
        for pf in parsed_files:
            cluster_id = cluster_assignments.get(pf['id'], 0)
            if cluster_id not in cluster_files:
                cluster_files[cluster_id] = []
            cluster_files[cluster_id].append(pf)
        
        enriched = []
        
        for cluster_id, files in cluster_files.items():
            file_names = [f['name'] for f in files]
            file_paths = [f['id'] for f in files]
            
            # Use directory-based naming (no AI required)
            name = self._generate_cluster_name(file_paths, file_names)
            
            # Assign color
            color = DISTRICT_COLORS[cluster_id % len(DISTRICT_COLORS)]
            
            enriched.append({
                'id': f'district_{cluster_id}',
                'name': name,
                'color': color,
                'files': [f['id'] for f in files],
                'size': len(files),
                'center': {'x': 0, 'y': 0},
                'boundary': []
            })
        
        return enriched

    def _generate_cluster_name(self, file_paths: List[str], file_names: List[str]) -> str:
        """Generate a meaningful name from file paths without AI"""
        # Common directory patterns
        known_patterns = {
            'api': 'API Layer',
            'routes': 'Routes',
            'controllers': 'Controllers',
            'services': 'Services',
            'service': 'Services',
            'models': 'Data Models',
            'model': 'Data Models',
            'utils': 'Utilities',
            'util': 'Utilities',
            'helpers': 'Helpers',
            'components': 'Components',
            'views': 'Views',
            'pages': 'Pages',
            'auth': 'Authentication',
            'config': 'Configuration',
            'middleware': 'Middleware',
            'db': 'Database',
            'database': 'Database',
            'data': 'Data Layer',
            'core': 'Core',
            'lib': 'Library',
            'common': 'Common',
            'shared': 'Shared',
            'tests': 'Tests',
            'test': 'Tests',
            'src': 'Source',
            'app': 'Application',
            'ui': 'User Interface',
            'store': 'State Management',
            'hooks': 'Hooks',
            'types': 'Type Definitions',
            'interfaces': 'Interfaces',
            'schemas': 'Schemas',
            'migrations': 'Migrations',
            'handlers': 'Handlers',
            'providers': 'Providers',
            'factories': 'Factories',
            'repositories': 'Repositories',
            'entities': 'Entities',
            'domain': 'Domain',
            'infrastructure': 'Infrastructure',
            'parsing': 'Parsing',
            'graph': 'Graph Analysis',
            'ai': 'AI Features',
        }
        
        # Extract common directories from paths
        dir_counts = {}
        for path in file_paths:
            parts = path.replace('\\', '/').split('/')
            for part in parts[:-1]:  # Exclude filename
                part_lower = part.lower()
                if part_lower and part_lower not in ['src', 'app', 'lib']:
                    dir_counts[part_lower] = dir_counts.get(part_lower, 0) + 1
        
        # Find the most common meaningful directory
        if dir_counts:
            most_common = max(dir_counts, key=dir_counts.get)
            if most_common in known_patterns:
                return known_patterns[most_common]
            return most_common.replace('_', ' ').replace('-', ' ').title()
        
        # Fallback: use file name patterns
        for name in file_names[:5]:
            name_lower = name.lower()
            for pattern, label in known_patterns.items():
                if pattern in name_lower:
                    return label
        
        return f"Module {random.randint(1, 99)}"
    
    def _find_common_directory(self, file_names: List[str]) -> str:
        """Find a common theme in file names"""
        # Just use the most common word
        words = []
        for name in file_names:
            # Extract meaningful words
            name_parts = name.replace('.', '_').replace('-', '_').split('_')
            words.extend([p.lower() for p in name_parts if len(p) > 2])
        
        if not words:
            return ""
        
        # Find most common
        word_counts = {}
        for w in words:
            word_counts[w] = word_counts.get(w, 0) + 1
        
        most_common = max(word_counts, key=word_counts.get)
        return most_common
