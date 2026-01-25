import networkx as nx
from typing import List, Dict, Any

class GraphBuilder:
    """
    Constructs a NetworkX graph from the parsed codebase data.
    """

    def build(self, files: List[Dict[str, Any]]) -> nx.DiGraph:
        G = nx.DiGraph()

        # 1. Add Nodes
        for file in files:
            # Sanitize attributes for valid graph storage
            attrs = {
                'size': file.get('metrics', {}).get('loc', 0),
                'complexity': file.get('metrics', {}).get('complexity', 0),
                'type': file.get('type', 'file'),
                'path': file.get('path', ''),
                'name': file.get('name', '')
            }
            G.add_node(file['id'], **attrs)

        # 2. Add Edges (Inferred or Explicit)
        # Note: In a real "Enterprise" parser, we'd have explicit imports.
        # Here we might need to infer them if the parser result (files) doesn't have them explicitly linked yet.
        # But Phase 1 assumes we have some connectivity data.
        # If 'roads' or 'dependencies' are passed, we use them.
        # For now, we'll assume the parsed data MIGHT contain 'imports' or we rely on the demo builder's logic.

        # If this is the Demo, we reconstruct logic.
        # Ideally, the Analyzer should return 'dependencies'.

        return G

    def reconstruct_edges_from_roads(self, G: nx.DiGraph, roads: List[Dict]) -> nx.DiGraph:
        """
        If we already have 'roads' from the legacy analyzer, render them as edges.
        """
        for road in roads:
            if G.has_node(road['source']) and G.has_node(road['target']):
                desc = "Cross-District" if road.get('is_cross_district') else "Local"
                G.add_edge(road['source'], road['target'], weight=road.get('weight', 1), type=desc)
        return G
