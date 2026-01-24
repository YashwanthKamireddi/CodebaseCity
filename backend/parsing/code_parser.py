"""
Code Parser - Extract structure and dependencies using Tree-sitter (AST)
"""

import re
import os
from typing import List, Dict, Any, Optional

# Try importing tree-sitter bindings
try:
    from tree_sitter import Language, Parser
    import tree_sitter_python
    import tree_sitter_javascript
    HAS_TREESITTER = True

    # Initialize Languages (v0.22+ API)
    PY_LANGUAGE = Language(tree_sitter_python.language())
    JS_LANGUAGE = Language(tree_sitter_javascript.language())

except ImportError:
    print("Warning: Tree-sitter not found. Falling back to Regex parser.")
    HAS_TREESITTER = False


class CodeParser:
    """Parser for extracting code structure and dependencies using AST"""

    def __init__(self):
        self.parsers = {}
        if HAS_TREESITTER:
            self.parsers['python'] = Parser(PY_LANGUAGE)
            self.parsers['javascript'] = Parser(JS_LANGUAGE)
            self.parsers['typescript'] = Parser(JS_LANGUAGE) # Use JS parser for basic TS

            # --- QUERIES ---
            # Python Imports
            self.py_import_query = PY_LANGUAGE.query("""
                (import_statement (dotted_name) @module)
                (import_from_statement module_name: (dotted_name) @module)
                (import_from_statement module_name: (relative_import) @module)
            """)

            # JS Imports
            self.js_import_query = JS_LANGUAGE.query("""
                (import_statement source: (string) @source)
                (call_expression
                    function: (identifier) @func
                    arguments: (arguments (string) @source)
                    (#match? @func "^require$"))
            """)

        # Fallback patterns
        self.regex_patterns = {
            'python': [r'^import\s+([\w.]+)', r'^from\s+([\w.]+)\s+import'],
            'javascript': [r'import\s+.*?\s+from\s+[\'"]([^"\']+)[\'"]', r'require\s*\(\s*[\'"]([^"\']+)[\'"]\s*\)'],
            'typescript': [r'import\s+.*?\s+from\s+[\'"]([^"\']+)[\'"]'],
            'java': [r'^import\s+([\w.]+);'],
            'go': [r'import\s+[\'"]([^"\']+)[\'"]'],
        }

    def extract_imports(self, content: str, language: str) -> List[str]:
        """Extract import statements from code (Hybrid Approach)"""
        if HAS_TREESITTER and language in self.parsers:
            try:
                return self._extract_imports_ast(content, language)
            except (AttributeError, ValueError, Exception) as e:
                # Fallback to regex silently (or log debug) if AST fails
                # print(f"AST Parse failed for {language}: {e}, using regex.") # Debug
                return self._extract_imports_regex(content, language)
        return self._extract_imports_regex(content, language)

    def _extract_imports_ast(self, content: str, language: str) -> List[str]:
        parser = self.parsers[language]
        tree = parser.parse(bytes(content, "utf8"))

        imports = set()

        if language == 'python':
            captures = self.py_import_query.captures(tree.root_node)
            for node, name in captures:
                text = content[node.start_byte:node.end_byte]
                # Filter out pure dots in relative imports
                if text and not set(text).issubset({'.'}):
                     imports.add(text)

        elif language in ('javascript', 'typescript'):
            captures = self.js_import_query.captures(tree.root_node)
            for node, name in captures:
                if name == 'source':
                    # string node includes quotes, strip them
                    text = content[node.start_byte:node.end_byte]
                    imports.add(text.strip('"\''))

        # Normalize
        normalized = []
        for imp in imports:
            imp = imp.lstrip('./')
            if not imp.startswith(('node_modules', 'http', 'https')):
                normalized.append(imp)
        return list(normalized)

    def _extract_imports_regex(self, content: str, language: str) -> List[str]:
        imports = []
        patterns = self.regex_patterns.get(language, [])
        for pattern in patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            imports.extend(matches)

        normalized = []
        for imp in imports:
            imp = imp.lstrip('./')
            if not imp.startswith(('node_modules', 'http', 'https')):
                normalized.append(imp)
        return list(set(normalized))

    def extract_classes(self, content: str, language: str) -> List[Dict[str, Any]]:
        """Extract classes (AST or Regex)"""
        # For brevity, using Regex for definitions in this iteration
        # (Imports are the priority for Graph accuracy)
        classes = []
        if language == 'python':
            pattern = r'class\s+(\w+)\s*(?:\(([^)]*)\))?:'
            for match in re.finditer(pattern, content):
                classes.append({'name': match.group(1), 'line': content[:match.start()].count('\n') + 1})
        elif language in ('javascript', 'typescript'):
             pattern = r'class\s+(\w+)'
             for match in re.finditer(pattern, content):
                classes.append({'name': match.group(1), 'line': content[:match.start()].count('\n') + 1})
        return classes

    def extract_functions(self, content: str, language: str) -> List[Dict[str, Any]]:
        # Using Regex for now (Imports are priority)
        functions = []
        if language == 'python':
            pattern = r'(?:async\s+)?def\s+(\w+)\s*\('
            for match in re.finditer(pattern, content):
                functions.append({'name': match.group(1), 'line': content[:match.start()].count('\n') + 1})
        elif language in ('javascript', 'typescript'):
            pattern = r'function\s+(\w+)'
            for match in re.finditer(pattern, content):
                functions.append({'name': match.group(1), 'line': content[:match.start()].count('\n') + 1})
        return functions

    def extract_exports(self, content: str, language: str) -> List[str]:
        # Regex baseline
        return []
