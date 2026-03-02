import os
import kuzu
from pathlib import Path
from typing import List, Dict, Any

class KuzuEngine:
    """
    AST-Level Graph Engine using KuzuDB.
    Built to handle semantic code queries (Cypher) and blast radius calculations.
    """

    def __init__(self, db_path: str = '.kuzudb/graph.db', read_only: bool = False):
        # Ensure parent directory exists
        parent_dir = os.path.dirname(db_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)

        self.db_path = db_path

        # Buffer pool size (e.g., 256MB) to keep it light for local run
        try:
            self.db = kuzu.Database(db_path, buffer_pool_size=256 * 1024 * 1024, read_only=read_only)
        except TypeError:
            # Fallback if the Kuzu version doesn't support read_only via kwargs in Database constructor
            # Kuzu < 0.1.0 and >= 0.2.0 change API often, let's gracefully fallback
            # but standard is read_only=...
            self.db = kuzu.Database(db_path, buffer_pool_size=256 * 1024 * 1024)
        self.conn = kuzu.Connection(self.db)

        self.is_initialized = False

    def init_schema(self):
        """Creates the KuzuDB graph schema for AST analysis."""
        schema_queries = [
            # Node Tables
            "CREATE NODE TABLE IF NOT EXISTS File (id STRING, name STRING, loc INT64, complexity FLOAT, PRIMARY KEY (id))",
            "CREATE NODE TABLE IF NOT EXISTS Class (id STRING, name STRING, file_id STRING, PRIMARY KEY (id))",
            "CREATE NODE TABLE IF NOT EXISTS Function (id STRING, name STRING, file_id STRING, PRIMARY KEY (id))",

            # Relationship Tables
            "CREATE REL TABLE IF NOT EXISTS IMPORTS (FROM File TO File)",
            "CREATE REL TABLE IF NOT EXISTS DEFINES_CLASS (FROM File TO Class)",
            "CREATE REL TABLE IF NOT EXISTS DEFINES_FUNCTION (FROM File TO Function)",
            "CREATE REL TABLE IF NOT EXISTS CALLS (FROM Function TO Function, weight INT64)"
        ]

        for q in schema_queries:
            try:
                self.conn.execute(q)
            except RuntimeError as e:
                # Kuzu throws if table already exists even with IF NOT EXISTS in some old versions,
                # but newer versions handle it. We catch just in case.
                if "already exists" not in str(e).lower():
                    raise e

        self.is_initialized = True

    def ingest_parsed_data(self, parsed_files: List[Dict[str, Any]]):
        """Ingests the AST data from the parser into KuzuDB."""
        if not self.is_initialized:
            self.init_schema()

        # 1. Insert Files
        for pf in parsed_files:
            # Escape strings for safe Cypher inserts
            fid = pf['id'].replace("'", "\\'")
            fname = pf['name'].replace("'", "\\'")
            loc = int(pf.get('loc', 0))
            comp = float(pf.get('complexity', 0.0))

            # Upsert File Node
            # We use MERGE to avoid duplicate key errors on re-runs
            self.conn.execute(
                f"MERGE (f:File {{id: '{fid}'}}) "
                f"ON CREATE SET f.name = '{fname}', f.loc = {loc}, f.complexity = {comp} "
                f"ON MATCH SET f.loc = {loc}, f.complexity = {comp}"
            )

            # Insert Functions if any (CodeParser currently just uses regex, will be upgraded to Tree-sitter soon)
            for func_data in pf.get('functions', []):
                func_name = func_data['name'].replace("'", "\\'")
                func_id = f"{fid}::{func_name}"

                self.conn.execute(
                    f"MERGE (fun:Function {{id: '{func_id}'}}) "
                    f"ON CREATE SET fun.name = '{func_name}', fun.file_id = '{fid}'"
                )
                self.conn.execute(
                    f"MATCH (f:File {{id: '{fid}'}}), (fun:Function {{id: '{func_id}'}}) "
                    f"MERGE (f)-[:DEFINES_FUNCTION]->(fun)"
                )

            # Insert Classes if any
            for cls_data in pf.get('classes', []):
                cls_name = cls_data['name'].replace("'", "\\'")
                cls_id = f"{fid}::{cls_name}"

                self.conn.execute(
                    f"MERGE (c:Class {{id: '{cls_id}'}}) "
                    f"ON CREATE SET c.name = '{cls_name}', c.file_id = '{fid}'"
                )
                self.conn.execute(
                    f"MATCH (f:File {{id: '{fid}'}}), (c:Class {{id: '{cls_id}'}}) "
                    f"MERGE (f)-[:DEFINES_CLASS]->(c)"
                )

        # 2. Insert Imports (Edges are handled in second pass after all File nodes exist)
        # Rebuild file map to resolve imports as in NetworkX GraphBuilder
        # Using simple matching for now
        file_ids = {pf['name']: pf['id'] for pf in parsed_files}

        for pf in parsed_files:
            source = pf['id'].replace("'", "\\'")
            for imp in pf.get('imports', []):
                # Try simple filename match first, or precise resolve later
                target_name = imp.split('/')[-1]
                target = None

                for pf2 in parsed_files:
                    if target_name in pf2['name']:
                        target = pf2['id']
                        break

                if target:
                    target_escaped = target.replace("'", "\\'")
                    self.conn.execute(
                        f"MATCH (s:File {{id: '{source}'}}), (t:File {{id: '{target_escaped}'}}) "
                        f"MERGE (s)-[:IMPORTS]->(t)"
                    )

    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Run raw Cypher over the architecture."""
        results = self.conn.execute(query)
        out = []
        while results.has_next():
            out.append(results.get_next())
        return out

    def get_blast_radius(self, file_id: str, max_depth: int = 2) -> List[Dict[str, Any]]:
        """
        Calculates impact radius (who depends on this file)
        using KuzuDB recursive pattern matching.
        """
        # Finds paths where `file_id` is the tail of an IMPORTS string.
        # i.e., other files import `file_id`.
        query = (
            f"MATCH p = (dependent:File)-[:IMPORTS*1..{max_depth}]->(target:File {{id: '{file_id}'}}) "
            f"RETURN dependent.id, dependent.name, length(p) as depth"
        )
        return self.execute_query(query)
