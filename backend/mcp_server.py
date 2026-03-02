import os
import sys
from typing import List, Dict, Any
import httpx
from mcp.server.fastmcp import FastMCP
from graph.kuzu_engine import KuzuEngine

# Create the MCP server
mcp = FastMCP("Code City MCP Server")

# Initialize KuzuDB Engine
# We assume this is run from the backend directory
db_path = os.environ.get("KUZU_DB_PATH", ".kuzudb/graph.db")
try:
    kuzu_engine = KuzuEngine(db_path, read_only=True)
    print(f"KuzuEngine initialized at {db_path}", file=sys.stderr)
except Exception as e:
    print(f"Failed to initialize KuzuEngine: {e}", file=sys.stderr)
    sys.exit(1)

async def notify_backend(event_type: str, data: Dict[str, Any]):
    """Notify the FastAPI backend to trigger UI updates"""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:8000/api/mcp/notify",
                json={"type": event_type, "data": data},
                timeout=2.0
            )
    except Exception as e:
        print(f"Failed to notify backend: {e}", file=sys.stderr)

@mcp.tool()
def query_architecture(query: str) -> List[Dict[str, Any]]:
    """
    Execute a raw Cypher query against the Code City AST and dependency graph.
    The graph contains the following node labels:
    - File (id, name, loc, complexity)
    - Class (id, name, file_id)
    - Function (id, name, file_id)

    And the following relationships:
    - (File)-[:IMPORTS]->(File)
    - (File)-[:DEFINES_CLASS]->(Class)
    - (File)-[:DEFINES_FUNCTION]->(Function)

    Returns a list of dictionaries representing the matched records.
    """
    try:
        return kuzu_engine.execute_query(query)
    except Exception as e:
        return [{"error": str(e)}]

@mcp.tool()
def get_blast_radius(file_id: str, max_depth: int = 2) -> List[Dict[str, Any]]:
    """
    Calculates the impact radius (files that depend on the given file).
    Use this to understand what might break if a file is modified.

    Args:
        file_id: The exact ID (usually relative path) of the file (e.g., 'src/main.py').
        max_depth: How many levels deep to trace dependencies (default 2).

    Returns:
        List of affected files and their depth from the target.
    """
    try:
        # 1. Trigger UI Update
        import asyncio
        asyncio.create_task(notify_backend("mcp_blast_radius", {"file_id": file_id}))

        # 2. Get and return data
        return kuzu_engine.get_blast_radius(file_id, max_depth)
    except Exception as e:
        return [{"error": str(e)}]

if __name__ == "__main__":
    # Start the MCP server using standard I/O for agent communication
    mcp.run()
