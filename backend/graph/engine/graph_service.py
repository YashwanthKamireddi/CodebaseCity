import networkx as nx
import community.community_louvain as louvain
from typing import List, Dict, Any, Optional
from .graph_builder import GraphBuilder

class GraphService:
    """
    Cognitive Core: Handles Clustering, Pathfinding, and Structure Analysis.
    """
    def __init__(self):
        self.builder = GraphBuilder()
        self._graph_cache: Dict[str, nx.DiGraph] = {}

    def get_graph(self, city_id: str, files: List[Dict], roads: List[Dict] = None) -> nx.DiGraph:
        if city_id not in self._graph_cache:
            print(f"[GraphService] Building fresh graph for {city_id}")
            G = self.builder.build(files)
            if roads:
                G = self.builder.reconstruct_edges_from_roads(G, roads)
            self._graph_cache[city_id] = G
        return self._graph_cache[city_id]

    def compute_communities(self, city_id: str) -> Dict[str, int]:
        """
        Uses Louvain algorithm to detect semantic communities.
        Returns: { node_id: community_id }
        """
        if city_id not in self._graph_cache:
            return {}

        G = self._graph_cache[city_id]

        # Louvain works best on undirected graphs for community detection
        G_undirected = G.to_undirected()

        try:
            partition = louvain.best_partition(G_undirected)
            return partition
        except Exception as e:
            print(f"[GraphService] Clustering Logic Error: {e}")
            # Fallback: Every node is its own community
            return {n: i for i, n in enumerate(G.nodes())}

    def trace_shortest_path(self, city_id: str, source: str, target: str) -> Dict[str, Any]:
        """
        A* / Dijkstra Pathfinding
        """
        if city_id not in self._graph_cache:
            return {"found": False, "error": "Graph not loaded"}

        G = self._graph_cache[city_id]

        # TODO: Fuzzy finding logic (moved to helper if needed)
        try:
            path = nx.shortest_path(G, source, target)
            return {
                "found": True,
                "path": path,
                "steps": len(path),
                "edges": self._get_path_details(G, path)
            }
        except nx.NetworkXNoPath:
            return {"found": False, "error": "No logic path exists"}
        except nx.NodeNotFound as e:
            return {"found": False, "error": f"Node not found: {e}"}

    def _get_path_details(self, G: nx.DiGraph, path: List[str]) -> List[Dict]:
        details = []
        for i in range(len(path) - 1):
            u, v = path[i], path[i+1]
            data = G.get_edge_data(u, v)
            details.append({"source": u, "target": v, "metadata": data})
        return details
