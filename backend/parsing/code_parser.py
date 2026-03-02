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
    import tree_sitter_typescript
    HAS_TREESITTER = True

    # Initialize Languages (v0.22+ API)
    PY_LANGUAGE = Language(tree_sitter_python.language())
    JS_LANGUAGE = Language(tree_sitter_javascript.language())
    TS_LANGUAGE = Language(tree_sitter_typescript.language_typescript())

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
            self.parsers['typescript'] = Parser(TS_LANGUAGE)

            # --- QUERIES ---
            # Python Imports
            self.py_import_query = PY_LANGUAGE.query("""
                (import_statement (dotted_name) @module)
                (import_from_statement module_name: (dotted_name) @module)
                (import_from_statement module_name: (relative_import) @module)
            """)
            self.py_class_query = PY_LANGUAGE.query("(class_definition name: (identifier) @name)")
            self.py_func_query = PY_LANGUAGE.query("(function_definition name: (identifier) @name)")

            # JS Imports
            self.js_import_query = JS_LANGUAGE.query("""
                (import_statement source: (string) @source)
                (call_expression
                    function: (identifier) @func
                    arguments: (arguments (string) @source)
                    (#match? @func "^require$"))
            """)
            self.ts_import_query = TS_LANGUAGE.query("""
                (import_statement source: (string) @source)
            """)

            js_class_q = "(class_declaration name: (_) @name)"
            js_func_q = """
                (function_declaration name: (_) @name)
                (method_definition name: (_) @name)
                (variable_declarator name: (_) @name value: (arrow_function))
            """
            self.js_class_query = JS_LANGUAGE.query(js_class_q)
            self.js_func_query = JS_LANGUAGE.query(js_func_q)
            self.ts_class_query = TS_LANGUAGE.query(js_class_q)
            self.ts_func_query = TS_LANGUAGE.query(js_func_q)

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

        elif language == 'javascript':
            captures = self.js_import_query.captures(tree.root_node)
            for node, name in captures:
                if name == 'source':
                    text = content[node.start_byte:node.end_byte]
                    imports.add(text.strip('"\''))
        elif language == 'typescript':
            captures = self.ts_import_query.captures(tree.root_node)
            for node, name in captures:
                if name == 'source':
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
        """Extract classes (AST implementation mapping GitNexus behavior)"""
        classes = []
        if HAS_TREESITTER and language in self.parsers:
            try:
                parser = self.parsers[language]
                tree = parser.parse(bytes(content, "utf8"))
                query = getattr(self, f"{language[:2]}_class_query", getattr(self, f"{language}_class_query", None))
                if query:
                    for match in query.matches(tree.root_node):
                        for name, node_list in match[1].items():
                             for node in (node_list if isinstance(node_list, list) else [node_list]):
                                 text = content[node.start_byte:node.end_byte]
                                 classes.append({'name': text, 'line': node.start_point[0] + 1})
                    if classes: return classes
            except Exception as e:
                print(f"AST Class error {language}: {e}")
                pass

        # Fallback to Regex
        if language == 'python':
            pattern = r'class\s+(\w+)\s*(?:\(([^)]*)\))?:'
            for match in re.finditer(pattern, content):
                classes.append({'name': match.group(1), 'line': content[:match.start()].count('\\n') + 1})
        elif language in ('javascript', 'typescript'):
             pattern = r'class\s+(\w+)'
             for match in re.finditer(pattern, content):
                classes.append({'name': match.group(1), 'line': content[:match.start()].count('\\n') + 1})
        return classes

    def extract_functions(self, content: str, language: str) -> List[Dict[str, Any]]:
        """Extract functions and methods using AST queries"""
        functions = []
        if HAS_TREESITTER and language in self.parsers:
            try:
                parser = self.parsers[language]
                tree = parser.parse(bytes(content, "utf8"))
                query = getattr(self, f"{language[:2]}_func_query", getattr(self, f"{language}_func_query", None))
                if query:
                    for match in query.matches(tree.root_node):
                        for name, node_list in match[1].items():
                             for node in (node_list if isinstance(node_list, list) else [node_list]):
                                 text = content[node.start_byte:node.end_byte]
                                 functions.append({'name': text, 'line': node.start_point[0] + 1})
                    if functions: return functions
            except Exception as e:
                print(f"AST Function error {language}: {e}")
                pass

        # Fallback to Regex
        if language == 'python':
            pattern = r'(?:async\s+)?def\s+(\w+)\s*\('
            for match in re.finditer(pattern, content):
                functions.append({'name': match.group(1), 'line': content[:match.start()].count('\\n') + 1})
        elif language in ('javascript', 'typescript'):
            pattern = r'function\s+(\w+)'
            for match in re.finditer(pattern, content):
                functions.append({'name': match.group(1), 'line': content[:match.start()].count('\\n') + 1})
        return functions

    def extract_exports(self, content: str, language: str) -> List[str]:
        # Regex baseline
        return []
