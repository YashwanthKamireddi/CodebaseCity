from .base import PipelineStep, PipelineContext
from parsing.intelligence import IntelligenceEngine

class IntelligenceStep(PipelineStep):
    """
    Step 4: Deep Analysis (Complexity, Security, Architecture, Duplicates)
    """

    async def execute(self, context: PipelineContext) -> PipelineContext:
        print("[Pipeline] Running Intelligence Engine...")

        parsed_files = context.parsed_files
        graph = context.graph

        # 0. Author Extraction (Social City)
        # NOTE: GitMetaStep already sets author as a string. This is a secondary enrichment
        # that should NOT overwrite existing author data.
        author_map = {}
        try:
            from services.git_service import GitService
            print(f"[Pipeline] Extracting Authors for {context.root_path}...")
            author_map = GitService.extract_authors(context.root_path)
        except Exception as e:
            print(f"[Pipeline] Author extraction failed: {e}")

        # 1. Complexity & Security
        for pf in parsed_files:
            # Only update author if not already set by GitMetaStep (or is 'Unknown')
            # Always enrich with Social Data (Email Hash for Gravatar)
            if pf['path'] in author_map:
                author_data = author_map[pf['path']]
                if isinstance(author_data, dict):
                    # Ensure metrics dict exists
                    if 'metrics' not in pf:
                        pf['metrics'] = {}

                    # Inject Hash unconditionally
                    pf['metrics']['email_hash'] = author_data.get('email_hash')

                    # Populate basic author info if missing
                    current_author = pf.get('author', 'Unknown')
                    if current_author == 'Unknown' or current_author is None:
                        pf['author'] = author_data.get('author', 'Unknown')
                        pf['email'] = author_data.get('email', '')
                    elif not pf.get('email'):
                        # If author name exists but email is missing, add email
                        pf['email'] = author_data.get('email', '')

            comp = IntelligenceEngine.calculate_complexity(pf.get('content', ''))
            pf['complexity_score'] = comp['score']
            pf['complexityLevel'] = comp['level']

            issues = IntelligenceEngine.scan_security(pf.get('content', ''), pf['name'])
            pf['security_issues'] = issues

            pf['layer'] = IntelligenceEngine.detect_layer(pf['path'])

            # 2. Blast Radius (Impact) & Patterns
            impact = IntelligenceEngine.calculate_impact(graph, pf['name']) # Using name or path? Graph nodes are likely 'paths' or 'names'.
            # Graph builder usually uses file paths or names. Let's check graph.py if needed,
            # but usually 'name' or 'path' is the node ID.
            # In analyzer.py, self.graph.add_node(file_path).
            # So we should use pf['path'].
            impact = IntelligenceEngine.calculate_impact(graph, pf['path'])
            pf['impact'] = impact

            patterns = IntelligenceEngine.detect_patterns(pf.get('content', ''), pf['name'])
            pf['patterns'] = patterns

        # 2. Graph Issues
        graph_issues = IntelligenceEngine.detect_graph_issues(graph, parsed_files)

        # 3. Layer Violations
        # Fix: Ensure edges list contains dicts with 'source' and 'target'
        edges_list = [{'source': u, 'target': v} for u, v in graph.edges()]
        layer_violations = IntelligenceEngine.detect_layer_violations(parsed_files, {'edges': edges_list})

        # 4. Duplicates
        duplicates = IntelligenceEngine.detect_duplicates(parsed_files)

        # 5. Metadata Assembly
        context.metadata = {
            "num_files": len(parsed_files),
            "num_directories": len(context.clusters),
            "languages": {},
            "layer_violations": layer_violations,
            "duplicates": duplicates,
            "issues": graph_issues
        }

        # 6. Health Score
        health = IntelligenceEngine.calculate_health_score(context.metadata)
        context.metadata['health'] = health

        return context
