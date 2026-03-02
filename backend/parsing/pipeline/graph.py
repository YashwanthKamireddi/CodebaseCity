from .base import PipelineStep, PipelineContext
from graph.graph_builder import GraphBuilder
from graph.kuzu_engine import KuzuEngine
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

        # 1. Build In-Memory Graph (for fast algorithms/layout)
        context.graph = self.graph_builder.build(context.parsed_files)
        print(f"[Pipeline] In-Memory Graph: {context.graph.number_of_nodes()} nodes")

        # 1.5. Build Persistent Graph (for MCP / deep queries)
        try:
            # Instantiate KuzuEngine here so it closes when it goes out of scope, releasing the lock for MCP
            from graph.kuzu_engine import KuzuEngine
            kuzu_engine = KuzuEngine(read_only=False)
            kuzu_engine.ingest_parsed_data(context.parsed_files)
            print("[Pipeline] KuzuDB Persistent Graph updated.")

            # Explicitly delete to release the file lock
            del kuzu_engine

        except Exception as e:
            print(f"[Pipeline] Warning: KuzuDB ingestion failed: {e}")

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
