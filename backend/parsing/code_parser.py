"""
Code Parser - Extract structure and dependencies from source files
"""

import re
from typing import List, Dict, Any


class CodeParser:
    """Parser for extracting code structure and dependencies"""
    
    def __init__(self):
        # Regex patterns for import extraction
        self.import_patterns = {
            'python': [
                r'^import\s+([\w.]+)',
                r'^from\s+([\w.]+)\s+import',
            ],
            'javascript': [
                r'import\s+.*?\s+from\s+[\'"]([^"\']+)[\'"]',
                r'require\s*\(\s*[\'"]([^"\']+)[\'"]\s*\)',
                r'import\s*\(\s*[\'"]([^"\']+)[\'"]\s*\)',
            ],
            'typescript': [
                r'import\s+.*?\s+from\s+[\'"]([^"\']+)[\'"]',
                r'require\s*\(\s*[\'"]([^"\']+)[\'"]\s*\)',
            ],
            'java': [
                r'^import\s+([\w.]+);',
            ],
            'go': [
                r'import\s+[\'"]([^"\']+)[\'"]',
                r'import\s+\(\s*[\'"]([^"\']+)[\'"]',
            ],
        }
    
    def extract_imports(self, content: str, language: str) -> List[str]:
        """Extract import statements from code"""
        imports = []
        patterns = self.import_patterns.get(language, [])
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            imports.extend(matches)
        
        # Normalize imports
        normalized = []
        for imp in imports:
            # Remove relative path indicators
            imp = imp.lstrip('./')
            # Skip standard library / external modules for now
            if not imp.startswith(('node_modules', 'http', 'https')):
                normalized.append(imp)
        
        return list(set(normalized))
    
    def extract_classes(self, content: str, language: str) -> List[Dict[str, Any]]:
        """Extract class definitions"""
        classes = []
        
        if language == 'python':
            pattern = r'class\s+(\w+)\s*(?:\(([^)]*)\))?:'
            for match in re.finditer(pattern, content):
                classes.append({
                    'name': match.group(1),
                    'base': match.group(2) if match.group(2) else None,
                    'line': content[:match.start()].count('\n') + 1
                })
        
        elif language in ('javascript', 'typescript'):
            pattern = r'class\s+(\w+)\s*(?:extends\s+(\w+))?\s*{'
            for match in re.finditer(pattern, content):
                classes.append({
                    'name': match.group(1),
                    'base': match.group(2) if match.group(2) else None,
                    'line': content[:match.start()].count('\n') + 1
                })
        
        elif language == 'java':
            pattern = r'class\s+(\w+)\s*(?:extends\s+(\w+))?\s*(?:implements\s+[^{]+)?\s*{'
            for match in re.finditer(pattern, content):
                classes.append({
                    'name': match.group(1),
                    'base': match.group(2) if match.group(2) else None,
                    'line': content[:match.start()].count('\n') + 1
                })
        
        return classes
    
    def extract_functions(self, content: str, language: str) -> List[Dict[str, Any]]:
        """Extract function definitions"""
        functions = []
        
        if language == 'python':
            pattern = r'(?:async\s+)?def\s+(\w+)\s*\('
            for match in re.finditer(pattern, content):
                functions.append({
                    'name': match.group(1),
                    'line': content[:match.start()].count('\n') + 1
                })
        
        elif language in ('javascript', 'typescript'):
            patterns = [
                r'function\s+(\w+)\s*\(',
                r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(',
                r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function',
            ]
            for pattern in patterns:
                for match in re.finditer(pattern, content):
                    functions.append({
                        'name': match.group(1),
                        'line': content[:match.start()].count('\n') + 1
                    })
        
        return functions
    
    def extract_exports(self, content: str, language: str) -> List[str]:
        """Extract exported symbols"""
        exports = []
        
        if language in ('javascript', 'typescript'):
            # export default
            default_match = re.search(r'export\s+default\s+(?:class|function)?\s*(\w+)?', content)
            if default_match and default_match.group(1):
                exports.append(default_match.group(1))
            
            # named exports
            named_pattern = r'export\s+(?:const|let|var|function|class)\s+(\w+)'
            exports.extend(re.findall(named_pattern, content))
        
        elif language == 'python':
            # Check __all__ definition
            all_match = re.search(r'__all__\s*=\s*\[(.*?)\]', content, re.DOTALL)
            if all_match:
                exports.extend(re.findall(r'[\'"](\w+)[\'"]', all_match.group(1)))
        
        return exports
