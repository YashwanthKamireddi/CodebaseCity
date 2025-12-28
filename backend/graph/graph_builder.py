"""
Graph Builder - Construct dependency graphs from parsed code
"""

import networkx as nx
from typing import List, Dict, Any, Optional
import os


class GraphBuilder:
    """Build and analyze dependency graphs"""
    
    def __init__(self):
        pass
    
    def build(self, parsed_files: List[Dict[str, Any]]) -> nx.DiGraph:
        """
        Build a directed graph from parsed file data.
        Nodes are files, edges are dependencies (imports).
        """
        G = nx.DiGraph()
        
        # Create a mapping of possible import names to file IDs
        file_map = self._build_file_map(parsed_files)
        
        # Add all files as nodes
        for pf in parsed_files:
            G.add_node(
                pf['id'],
                name=pf['name'],
                language=pf['language'],
                loc=pf['loc'],
                complexity=pf['complexity'],
                decay=pf.get('decay_level', 0)
            )
        
        # Add edges based on imports
        for pf in parsed_files:
            source = pf['id']
            
            for imp in pf.get('imports', []):
                # Try to resolve import to a file
                target = self._resolve_import(imp, source, file_map)
                
                if target and target != source and G.has_node(target):
                    # Add edge with weight (can be enhanced later)
                    if G.has_edge(source, target):
                        G[source][target]['weight'] += 1
                    else:
                        G.add_edge(source, target, weight=1)
        
        return G
    
    def _build_file_map(self, parsed_files: List[Dict]) -> Dict[str, str]:
        """
        Build a mapping of import names to file IDs.
        This helps resolve imports like 'utils' to 'src/utils.py'
        """
        file_map = {}
        
        for pf in parsed_files:
            file_id = pf['id']
            name = pf['name']
            
            # Remove extension
            name_no_ext = os.path.splitext(name)[0]
            
            # Add various possible import patterns
            file_map[name_no_ext] = file_id
            file_map[name] = file_id
            
            # Convert path to module style (e.g., src/utils/helper.py -> src.utils.helper)
            path_parts = file_id.replace('\\', '/').split('/')
            module_path = '.'.join(os.path.splitext(p)[0] for p in path_parts)
            file_map[module_path] = file_id
            
            # Also add just the final module name
            if path_parts:
                file_map[os.path.splitext(path_parts[-1])[0]] = file_id
        
        return file_map
    
    def _resolve_import(
        self, 
        import_name: str, 
        source_file: str, 
        file_map: Dict[str, str]
    ) -> Optional[str]:
        """Resolve an import statement to a file ID"""
        
        # Direct match
        if import_name in file_map:
            return file_map[import_name]
        
        # Try with common extensions
        for ext in ['.py', '.js', '.ts', '.jsx', '.tsx']:
            if import_name + ext in file_map:
                return file_map[import_name + ext]
        
        # Try relative resolution
        if import_name.startswith('.'):
            source_dir = os.path.dirname(source_file)
            relative_path = os.path.normpath(os.path.join(source_dir, import_name))
            relative_path = relative_path.replace('\\', '/')
            
            if relative_path in file_map:
                return file_map[relative_path]
        
        # Try partial match on end of path
        for key, file_id in file_map.items():
            if key.endswith(import_name) or file_id.endswith(import_name):
                return file_id
        
        return None
    
    def get_centrality_metrics(self, G: nx.DiGraph) -> Dict[str, Dict[str, float]]:
        """Calculate various centrality metrics for the graph"""
        metrics = {}
        
        if G.number_of_nodes() == 0:
            return metrics
        
        try:
            # Betweenness - identifies "bridge" files
            betweenness = nx.betweenness_centrality(G)
            metrics['betweenness'] = betweenness
        except:
            metrics['betweenness'] = {}
        
        try:
            # PageRank - identifies important files
            pagerank = nx.pagerank(G, max_iter=100)
            metrics['pagerank'] = pagerank
        except:
            metrics['pagerank'] = {}
        
        try:
            # In-degree - most imported files
            in_degree = dict(G.in_degree())
            metrics['in_degree'] = in_degree
        except:
            metrics['in_degree'] = {}
        
        try:
            # Out-degree - files with most dependencies
            out_degree = dict(G.out_degree())
            metrics['out_degree'] = out_degree
        except:
            metrics['out_degree'] = {}
        
        return metrics
    
    def find_god_classes(self, G: nx.DiGraph, threshold_percentile: float = 95) -> List[str]:
        """Find files with very high incoming dependencies (God Classes)"""
        if G.number_of_nodes() == 0:
            return []
        
        in_degrees = dict(G.in_degree())
        
        if not in_degrees:
            return []
        
        # Calculate threshold
        values = list(in_degrees.values())
        threshold = sorted(values)[int(len(values) * threshold_percentile / 100)]
        
        return [node for node, degree in in_degrees.items() if degree >= threshold and degree > 0]
    
    def find_circular_dependencies(self, G: nx.DiGraph) -> List[List[str]]:
        """Find circular dependency cycles in the graph"""
        try:
            cycles = list(nx.simple_cycles(G))
            # Limit to first 10 cycles to avoid overwhelming
            return cycles[:10]
        except:
            return []
    
    def get_subgraph(self, G: nx.DiGraph, center_node: str, depth: int = 2) -> nx.DiGraph:
        """Get a subgraph around a specific node"""
        if center_node not in G:
            return nx.DiGraph()
        
        # Get nodes within depth hops
        nodes = {center_node}
        current_layer = {center_node}
        
        for _ in range(depth):
            next_layer = set()
            for node in current_layer:
                next_layer.update(G.successors(node))
                next_layer.update(G.predecessors(node))
            nodes.update(next_layer)
            current_layer = next_layer
        
        return G.subgraph(nodes).copy()
