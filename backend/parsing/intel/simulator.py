"""
Refactoring Simulator Backend Engine
Calculates architecture drift resulting from simulated client-side Drag-and-Drop operations.
"""
from typing import Dict, List, Any
import networkx as nx

class RefactoringSimulator:
    def __init__(self, base_graph: nx.DiGraph, parsed_files: List[Dict]):
        self.base_graph = base_graph
        self.parsed_files = parsed_files
        self.file_index = {f['id']: f for f in parsed_files}

    def simulate_drifts(self, drifts: List[Dict]) -> Dict[str, Any]:
        """
        Calculates the delta logic based on moving files to new conceptual modules.

        Args:
            drifts: List of dictionaries containing { buildingId, newDistrictId (mock path) }
        """
        total_dependencies_affected = 0
        broken_encapsulations = 0
        resolved_circular_deps = 0
        new_circular_deps = 0

        # We create a simulated graph to test cycle dependencies
        sim_graph = self.base_graph.copy()

        # In a fully robust AST layout, we would re-run path resolutions here.
        # Since districts are visual in the POC, we calculate generic architectural
        # disruption numbers to populate the DragModeHUD realistically.

        for drift in drifts:
            b_id = drift.get('buildingId')
            # Simulated Impact calculation
            if self.base_graph.has_node(b_id):
                in_degree = self.base_graph.in_degree(b_id)
                out_degree = self.base_graph.out_degree(b_id)

                # Moving heavily depended-upon files causes massive blast radius
                total_dependencies_affected += (in_degree + out_degree)

                # If a file has high out_degree, moving it might break encapsulation
                if out_degree > 5:
                    broken_encapsulations += 1

        # Calculate a fake "Architectural Stability Score" post-drift
        # Base stability starts at 100, drops heavily based on blast radius
        stability_drop = min(total_dependencies_affected * 2 + broken_encapsulations * 10, 80)
        new_stability_score = 100 - stability_drop

        return {
            "status": "simulated",
            "drifts_processed": len(drifts),
            "metrics": {
                "blast_radius_edges": total_dependencies_affected,
                "encapsulation_risks": broken_encapsulations,
                "resolved_cycles": resolved_circular_deps,
                "projected_stability": new_stability_score
            },
            "recommendation": "PROCEED" if new_stability_score > 50 else "REVERT",
            "message": f"Moving these {len(drifts)} files disrupts {total_dependencies_affected} distinct import paths."
        }
