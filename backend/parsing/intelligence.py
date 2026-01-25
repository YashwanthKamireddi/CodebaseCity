
import re
import hashlib
from typing import List, Dict, Any, Set
from difflib import SequenceMatcher

class IntelligenceEngine:
    """
    Advanced static analysis engine ported from CodeFlow.
    Features:
    - Layer Violation Detection
    - Duplicate Code Detection
    - Complexity Analysis
    - Security Scanning
    """

    LAYERS = {
        'presentation': 0, 'ui': 0, 'component': 0, 'page': 0, 'view': 0, 'forms': 0,
        'feature': 1,
        'service': 2, 'api': 2, 'controller': 2,
        'data': 3, 'model': 3, 'store': 3, 'classes': 3,
        'util': 4, 'utils': 4, 'helper': 4, 'lib': 4, 'core': 4,
        'modules': 5
    }

    SECURITY_PATTERNS = [
        (r'(?:password|passwd|pwd|secret|api_key|apikey|token|auth)\s*[=:]\s*[\'"][^\'"]{4,}[\'"]', 'high', 'Hardcoded Secret'),
        (r'eval\(', 'medium', 'Dynamic Code Execution'),
        (r'innerHTML\s*=', 'high', 'XSS Vulnerability'),
        (r'dangerouslySetInnerHTML', 'high', 'XSS Vulnerability'),
        (r'query\s*\(\s*[\'"`][^\'"`]*\s*\+', 'high', 'SQL Injection Risk'),
        (r'console\.(log|debug|info)\(', 'low', 'Debug Statement')
    ]

    @staticmethod
    def detect_layer(path: str) -> str:
        path = path.lower()
        if '/ui/' in path or '/views/' in path or '/pages/' in path or '/components/' in path: return 'ui'
        if '/service' in path or '/api/' in path or '/controller' in path: return 'service'
        if '/data' in path or '/model' in path or '/store' in path: return 'data'
        if '/util' in path or '/helper' in path or '/lib/' in path or '/core/' in path: return 'util'
        return 'other'

    @staticmethod
    def detect_layer_violations(files: List[Dict], graph: Dict) -> List[Dict]:
        violations = []
        # graph is adjacency list? or edge list?
        # Assuming graph is the networkx graph or similar structure passed from analyzer
        # But analyzer passes JSON graph usually?
        # Let's assume we receive list of edges: [{'source': 'path', 'target': 'path'}]

        # We need a map of file_path -> layer
        file_layers = {f['path']: IntelligenceEngine.detect_layer(f['path']) for f in files}

        # Check edges
        # Note: In Graph, Source depends on Target (Source imports Target)
        # Violation: Low Layer (e.g. Util: 4) importing High Layer (e.g. UI: 0)?
        # Wait, Hierarchy: UI (0) -> Service (2) -> Data (3) -> Util (4).
        # Dependency should go DOWN the levels (0 -> 4).
        # Violation is if High Number depends on Low Number? No.
        # UI depends on Service. 0 depends on 2. This is correct.
        # Service depends on UI. 2 depends on 0. This is WRONG (Cycle/Upward).
        # So Violation if SourceLevel > TargetLevel?
        # LayerOrder: UI=0, Util=4.
        # If UI(0) imports Util(4), 0 < 4. Safe.
        # If Util(4) imports UI(0), 4 > 0. Violation.

        edges = graph.get('edges', [])
        for edge in edges:
            src = edge['source']
            tgt = edge['target']
            src_layer = file_layers.get(src, 'other')
            tgt_layer = file_layers.get(tgt, 'other')

            src_level = IntelligenceEngine.LAYERS.get(src_layer, 99)
            tgt_level = IntelligenceEngine.LAYERS.get(tgt_layer, 99)

            if src_level != 99 and tgt_level != 99:
                 if src_level > tgt_level:
                     violations.append({
                         'source': src,
                         'target': tgt,
                         'sourceLayer': src_layer,
                         'targetLayer': tgt_layer,
                         'message': f"Layer Violation: {src_layer} should not import {tgt_layer}"
                     })

        return violations

    @staticmethod
    def calculate_complexity(content: str) -> Dict:
        if not content:
            return {'score': 0, 'level': 'low'}

        # Approximate Cyclomatic Complexity
        metrics = [
            (r'\bif\s*\(', 1),
            (r'\belse\s+if\s*\(', 1),
            (r'\bwhile\s*\(', 1),
            (r'\bfor\s*\(', 1),
            (r'\bcase\s+', 1),
            (r'\bcatch\s*\(', 1),
            (r'\?\s*[^:]+\s*:', 1),
            (r'&&', 1),
            (r'\|\|', 1)
        ]

        score = 1
        for pattern, weight in metrics:
            score += len(re.findall(pattern, content)) * weight

        level = 'low'
        if score > 30: level = 'critical'
        elif score > 20: level = 'high'
        elif score > 10: level = 'medium'

        return {'score': score, 'level': level}

    @staticmethod
    def scan_security(content: str, filename: str) -> List[Dict]:
        issues = []
        if not content: return issues

        lines = content.split('\n')
        for i, line in enumerate(lines):
            for pattern, severity, name in IntelligenceEngine.SECURITY_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    # Filter False Positives
                    if 'process.env' in line or 'config.' in line: continue

                    issues.append({
                        'title': name,
                        'file': filename,
                        'line': i + 1,
                        'severity': severity,
                        'code': line.strip()[:80]
                    })
        return issues

    @staticmethod
    def detect_graph_issues(graph, files: List[Dict]) -> Dict:
        """
        Detect graph-level issues like cycles and god objects.
        """
        try:
            import networkx as nx
        except ImportError:
            return {}

        issues = {
            "circular_dependencies": [],
            "god_objects": [],
            "highly_coupled": [],
            "large_files": []
        }

        # 1. Cycles
        try:
            cycles = list(nx.simple_cycles(graph))
            # Limit to small cycles for performance/relevance
            cycles = [c for c in cycles if len(c) < 5][:10]
            issues["circular_dependencies"] = cycles
        except Exception:
            pass # Graph might not be directed or error in cycle finding

        # 2. God Objects (High Degree)
        for node, degree in graph.degree():
            if degree > 20:
                issues["god_objects"].append(node)

        # 3. Large Files
        for f in files:
            if f.get('loc', 0) > 1000:
                issues["large_files"].append(f['path'])

        return issues

    @staticmethod
    def calculate_health_score(metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate an overall health score (0-100) and grade (A-F).
        Deducts points for issues, complexity, and violations.
        """
        score = 100

        # 1. Architecture Violations
        violations = len(metadata.get('layer_violations', []))
        score -= min(20, violations * 2)

        # 2. Circular Dependencies
        circles = len(metadata.get('issues', {}).get('circular_dependencies', []))
        score -= min(20, circles * 5)

        # 3. God Objects & Large Files
        gods = len(metadata.get('issues', {}).get('god_objects', []))
        large = len(metadata.get('issues', {}).get('large_files', []))
        score -= min(15, gods * 5 + large * 1)

        # 4. Duplicates
        dupes = len(metadata.get('duplicates', []))
        score -= min(10, dupes * 2)

        # 5. High Complexity
        # Need to sum complexity issues.
        # For now assume metadata has 'complexity_count' or calculated elsewhere.
        # Let's say we check files directly if passed, but metadata structure is fixed.
        # Simplification: Deduct for 'Coupling'
        coupled = len(metadata.get('issues', {}).get('highly_coupled', []))
        score -= min(15, coupled * 2)

        score = max(0, round(score))

        grade = 'F'
        if score >= 90: grade = 'A'
        elif score >= 80: grade = 'B'
        elif score >= 70: grade = 'C'
        elif score >= 60: grade = 'D'

        return {'score': score, 'grade': grade}

    @staticmethod
    def detect_patterns(content: str, filename: str) -> List[str]:
        """
        Detect software design patterns and anti-patterns.
        """
        patterns = []
        if not content: return patterns

        # 1. React Patterns
        if '.jsx' in filename or '.tsx' in filename:
            if re.search(r'export\s+function\s+use[A-Z]', content):
                patterns.append('Custom Hook')
            if 'createContext' in content:
                patterns.append('Context Provider')
            if 'useEffect' in content and 'useState' in content:
                patterns.append('Stateful Component')

        # 2. General OO Patterns
        if 'class ' in content:
            if 'getInstance' in content and 'static' in content:
                patterns.append('Singleton')
            if 'Factory' in filename or re.search(r'class\s+.*Factory', content):
                patterns.append('Factory')
            if 'subscribe' in content and 'notify' in content:
                patterns.append('Observer')
            if 'extends' in content:
                patterns.append('Inheritance')

        # 3. Anti-Patterns
        lines = len(content.split('\n'))
        if lines > 600:
            patterns.append('Long File')

        return list(set(patterns))

    @staticmethod
    def detect_duplicates(files: List[Dict]) -> List[Dict]:
        # file: {path, content, ...}
        # Simplified detection: File-level hash matching
        # Block-level is expensive here, we'll implement full file dupes + near dupes

        hashes = {}
        duplicates = []

        for f in files:
            if not f.get('content'): continue

            # Normalize content (remove whitespaces) to find near-dupes
            normalized = re.sub(r'\s+', '', f['content'])
            h = hashlib.md5(normalized.encode('utf-8')).hexdigest()

            if h in hashes:
                duplicates.append({
                    'original': hashes[h],
                    'duplicate': f['path'],
                    'type': 'exact_content'
                })
            else:
                hashes[h] = f['path']

    @staticmethod
    def generate_flowchart(content: str, filename: str) -> str:
        """
        Generates a Mermaid Flowchart representing the logic inside the file.
        Uses AST for Python, Fallback for others.
        """
        if not content: return ""

        # Python AST Parser
        if filename.endswith('.py'):
            try:
                import ast
                tree = ast.parse(content)

                chart = ["graph TD"]
                function_map = {} # func_name -> node_id
                calls = [] # (caller_id, callee_name)

                # 1. Identify Functions (Nodes)
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        node_id = f"F_{node.name}"
                        function_map[node.name] = node_id
                        chart.append(f"    {node_id}[def {node.name}]")

                        # Inspect body for calls
                        for subnode in ast.walk(node):
                            if isinstance(subnode, ast.Call):
                                if isinstance(subnode.func, ast.Name):
                                    calls.append((node_id, subnode.func.id))
                                elif isinstance(subnode.func, ast.Attribute):
                                    calls.append((node_id, subnode.func.attr))

                # 2. Map Calls (Edges)
                for caller_id, callee_name in calls:
                    # Internal calls
                    if callee_name in function_map:
                        chart.append(f"    {caller_id} -->|calls| {function_map[callee_name]}")
                    # External API calls (simplified)
                    elif callee_name in ['print', 'save', 'get', 'post', 'fetch']:
                        ext_id = f"EXT_{callee_name}"
                        chart.append(f"    {ext_id}(({callee_name}))")
                        chart.append(f"    {caller_id} -.-> {ext_id}")

                if len(chart) == 1:
                    return "graph TD\n    Root[Module Body]:::root"

                return "\n".join(chart)
            except Exception:
                return "graph TD\n    Error[Parse Error]:::error"

        # JS/TS Structure Parser (Regex)
        is_js = filename.endswith(('.js', '.jsx', '.ts', '.tsx'))
        if is_js:
            chart = ["graph TD"]
            # Find functions
            funcs = re.findall(r'(?:function|const|let|var)\s+([a-zA-Z0-9_]+)\s*=?\s*(?:async\s*)?\(', content)

            for f in funcs[:10]: # Limit to avoid clutter
                 chart.append(f"    {f}[{f}]")

            # Simple waterfall for now as JS AST is hard in Python
            for i in range(len(funcs) - 1):
                chart.append(f"    {funcs[i]} -.-> {funcs[i+1]}")

            if len(chart) == 1:
                 return "graph TD\n    Code[Code Content]:::code"

            return "\n".join(chart)

        return ""
