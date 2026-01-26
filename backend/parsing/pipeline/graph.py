from .base import PipelineStep, PipelineContext
from graph.graph_builder import GraphBuilder
from graph.clustering import ClusteringEngine
from graph.layout import LayoutEngine

class GraphStep(PipelineStep):
    """
    Step 3: Build dependency graph, cluster modules, and calculate layout.
    """

    def __init__(self):
        self.graph_builder = GraphBuilder()
        self.clustering = ClusteringEngine()
        self.layout_engine = LayoutEngine()

    async def execute(self, context: PipelineContext) -> PipelineContext:
        print("[Pipeline] Building Graph and Layout...")

        # 1. Build Graph
        context.graph = self.graph_builder.build(context.parsed_files)
        print(f"[Pipeline] Graph: {context.graph.number_of_nodes()} nodes")

        # 2. Cluster
        context.clusters = await self.clustering.cluster(context.graph, context.parsed_files)
        print(f"[Pipeline] Clusters: {len(context.clusters)} districts")

        # 3. Layout
        context.layout = self.layout_engine.generate(
            context.parsed_files,
            context.clusters,
            context.graph
        )

        return context
