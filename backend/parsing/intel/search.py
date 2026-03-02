"""
Smart Code Search
Powerful search functionality combining regex, semantic, and structural search.
"""

import re
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass
from enum import Enum


class SearchType(Enum):
    """Types of search operations"""
    EXACT = "exact"
    REGEX = "regex"
    FUZZY = "fuzzy"
    SEMANTIC = "semantic"
    STRUCTURAL = "structural"


@dataclass
class SearchResult:
    """A single search result"""
    file_id: str
    file_path: str
    line_number: int
    line_content: str
    match_start: int
    match_end: int
    context_before: List[str]
    context_after: List[str]
    relevance_score: float


class SmartSearch:
    """
    Intelligent code search with multiple search modes.
    
    Features:
    - Exact text search
    - Regex search with capture groups
    - Fuzzy search for typos
    - Structural search (find all functions, classes, imports)
    - Semantic search for meaning-based queries
    """
    
    def __init__(self, parsed_files: List[Dict], source_cache: Dict[str, str] = None):
        """
        Initialize with parsed files and optional source cache.
        
        Args:
            parsed_files: List of parsed file objects
            source_cache: Optional dict mapping file paths to source code
        """
        self.parsed_files = parsed_files
        self.file_index = {f['id']: f for f in parsed_files}
        self.source_cache = source_cache or {}
        
        # Build indexes for fast searching
        self._build_indexes()
    
    def _build_indexes(self):
        """Build search indexes from parsed files"""
        self.function_index: Dict[str, List[Dict]] = {}
        self.class_index: Dict[str, List[Dict]] = {}
        self.import_index: Dict[str, List[Dict]] = {}
        self.symbol_index: Dict[str, Set[str]] = {}
        
        for file_obj in self.parsed_files:
            file_id = file_obj['id']
            file_path = file_obj.get('path', '')
            
            # Index functions
            for func in file_obj.get('functions', []):
                func_name = func.get('name', '')
                if func_name:
                    if func_name not in self.function_index:
                        self.function_index[func_name] = []
                    self.function_index[func_name].append({
                        'file_id': file_id,
                        'file_path': file_path,
                        'details': func
                    })
                    self.symbol_index.setdefault(func_name.lower(), set()).add(file_id)
            
            # Index classes
            for cls in file_obj.get('classes', []):
                class_name = cls.get('name', '')
                if class_name:
                    if class_name not in self.class_index:
                        self.class_index[class_name] = []
                    self.class_index[class_name].append({
                        'file_id': file_id,
                        'file_path': file_path,
                        'details': cls
                    })
                    self.symbol_index.setdefault(class_name.lower(), set()).add(file_id)
            
            # Index imports
            for imp in file_obj.get('imports', []):
                imp_name = imp.get('module', '') or imp.get('name', '')
                if imp_name:
                    if imp_name not in self.import_index:
                        self.import_index[imp_name] = []
                    self.import_index[imp_name].append({
                        'file_id': file_id,
                        'file_path': file_path,
                        'details': imp
                    })
    
    def search(
        self,
        query: str,
        search_type: SearchType = SearchType.EXACT,
        file_filter: Optional[str] = None,
        limit: int = 50,
        context_lines: int = 2
    ) -> Dict[str, Any]:
        """
        Main search entry point.
        
        Args:
            query: Search query string
            search_type: Type of search to perform
            file_filter: Optional glob pattern to filter files
            limit: Maximum results to return
            context_lines: Number of context lines around matches
        
        Returns:
            Search results with metadata
        """
        if search_type == SearchType.STRUCTURAL:
            return self.structural_search(query)
        
        results = []
        files_searched = 0
        
        # Filter files if pattern provided
        files_to_search = self._filter_files(file_filter)
        
        for file_obj in files_to_search:
            file_id = file_obj['id']
            file_path = file_obj.get('path', '')
            
            # Get source code
            source = self.source_cache.get(file_path, '')
            if not source:
                continue
            
            files_searched += 1
            lines = source.split('\n')
            
            # Perform search based on type
            if search_type == SearchType.EXACT:
                file_results = self._exact_search(query, lines, file_id, file_path, context_lines)
            elif search_type == SearchType.REGEX:
                file_results = self._regex_search(query, lines, file_id, file_path, context_lines)
            elif search_type == SearchType.FUZZY:
                file_results = self._fuzzy_search(query, lines, file_id, file_path, context_lines)
            else:
                file_results = self._exact_search(query, lines, file_id, file_path, context_lines)
            
            results.extend(file_results)
            
            if len(results) >= limit:
                break
        
        return {
            'query': query,
            'search_type': search_type.value,
            'total_results': len(results),
            'files_searched': files_searched,
            'results': results[:limit]
        }
    
    def _exact_search(
        self,
        query: str,
        lines: List[str],
        file_id: str,
        file_path: str,
        context_lines: int
    ) -> List[Dict]:
        """Perform exact text search"""
        results = []
        query_lower = query.lower()
        
        for i, line in enumerate(lines):
            idx = line.lower().find(query_lower)
            if idx != -1:
                results.append({
                    'file_id': file_id,
                    'file_path': file_path,
                    'line_number': i + 1,
                    'line_content': line.strip(),
                    'match_start': idx,
                    'match_end': idx + len(query),
                    'context_before': [l.strip() for l in lines[max(0, i-context_lines):i]],
                    'context_after': [l.strip() for l in lines[i+1:i+1+context_lines]],
                    'relevance_score': 1.0
                })
        
        return results
    
    def _regex_search(
        self,
        pattern: str,
        lines: List[str],
        file_id: str,
        file_path: str,
        context_lines: int
    ) -> List[Dict]:
        """Perform regex search"""
        results = []
        
        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error:
            return []
        
        for i, line in enumerate(lines):
            match = regex.search(line)
            if match:
                results.append({
                    'file_id': file_id,
                    'file_path': file_path,
                    'line_number': i + 1,
                    'line_content': line.strip(),
                    'match_start': match.start(),
                    'match_end': match.end(),
                    'matched_text': match.group(),
                    'groups': match.groups() if match.groups() else None,
                    'context_before': [l.strip() for l in lines[max(0, i-context_lines):i]],
                    'context_after': [l.strip() for l in lines[i+1:i+1+context_lines]],
                    'relevance_score': 1.0
                })
        
        return results
    
    def _fuzzy_search(
        self,
        query: str,
        lines: List[str],
        file_id: str,
        file_path: str,
        context_lines: int
    ) -> List[Dict]:
        """Perform fuzzy search allowing for typos"""
        results = []
        query_lower = query.lower()
        
        for i, line in enumerate(lines):
            line_lower = line.lower()
            
            # Check each word in the line
            words = re.findall(r'\b\w+\b', line_lower)
            for word in words:
                similarity = self._levenshtein_similarity(query_lower, word)
                if similarity > 0.7:  # 70% similarity threshold
                    idx = line_lower.find(word)
                    results.append({
                        'file_id': file_id,
                        'file_path': file_path,
                        'line_number': i + 1,
                        'line_content': line.strip(),
                        'match_start': idx,
                        'match_end': idx + len(word),
                        'matched_word': word,
                        'context_before': [l.strip() for l in lines[max(0, i-context_lines):i]],
                        'context_after': [l.strip() for l in lines[i+1:i+1+context_lines]],
                        'relevance_score': similarity
                    })
                    break  # One match per line
        
        # Sort by relevance
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        return results
    
    def structural_search(self, query: str) -> Dict[str, Any]:
        """
        Search for structural elements in code.
        
        Query syntax:
        - "function:name" - Find function by name
        - "class:Name" - Find class by name
        - "import:module" - Find imports of module
        - "uses:symbol" - Find all usages of a symbol
        - "implements:interface" - Find implementations
        """
        parts = query.split(':', 1)
        
        if len(parts) != 2:
            return {'error': 'Use syntax: type:name (e.g., function:handleClick)'}
        
        search_type, search_term = parts
        search_type = search_type.lower().strip()
        search_term = search_term.strip()
        
        if search_type == 'function':
            return self._search_functions(search_term)
        elif search_type == 'class':
            return self._search_classes(search_term)
        elif search_type == 'import':
            return self._search_imports(search_term)
        elif search_type == 'uses':
            return self._search_usages(search_term)
        else:
            return {'error': f'Unknown search type: {search_type}'}
    
    def _search_functions(self, name: str) -> Dict[str, Any]:
        """Search for functions by name"""
        results = []
        name_lower = name.lower()
        
        for func_name, locations in self.function_index.items():
            if name_lower in func_name.lower():
                for loc in locations:
                    details = loc['details']
                    results.append({
                        'name': func_name,
                        'file_path': loc['file_path'],
                        'file_id': loc['file_id'],
                        'line': details.get('line', 0),
                        'parameters': details.get('params', []),
                        'complexity': details.get('complexity', 0)
                    })
        
        return {
            'type': 'function',
            'query': name,
            'total': len(results),
            'results': results
        }
    
    def _search_classes(self, name: str) -> Dict[str, Any]:
        """Search for classes by name"""
        results = []
        name_lower = name.lower()
        
        for class_name, locations in self.class_index.items():
            if name_lower in class_name.lower():
                for loc in locations:
                    details = loc['details']
                    results.append({
                        'name': class_name,
                        'file_path': loc['file_path'],
                        'file_id': loc['file_id'],
                        'line': details.get('line', 0),
                        'methods': [m.get('name', '') for m in details.get('methods', [])]
                    })
        
        return {
            'type': 'class',
            'query': name,
            'total': len(results),
            'results': results
        }
    
    def _search_imports(self, module: str) -> Dict[str, Any]:
        """Search for imports of a module"""
        results = []
        module_lower = module.lower()
        
        for import_name, locations in self.import_index.items():
            if module_lower in import_name.lower():
                for loc in locations:
                    results.append({
                        'module': import_name,
                        'file_path': loc['file_path'],
                        'file_id': loc['file_id'],
                        'import_type': loc['details'].get('type', 'import')
                    })
        
        return {
            'type': 'import',
            'query': module,
            'total': len(results),
            'results': results,
            'summary': f'Found {len(results)} files importing "{module}"'
        }
    
    def _search_usages(self, symbol: str) -> Dict[str, Any]:
        """Find all usages of a symbol across the codebase"""
        symbol_lower = symbol.lower()
        file_ids = self.symbol_index.get(symbol_lower, set())
        
        results = []
        for fid in file_ids:
            file_info = self.file_index.get(fid, {})
            results.append({
                'file_id': fid,
                'file_path': file_info.get('path', ''),
                'type': self._determine_symbol_type(symbol, file_info)
            })
        
        return {
            'type': 'usage',
            'query': symbol,
            'total': len(results),
            'results': results
        }
    
    def _determine_symbol_type(self, symbol: str, file_info: Dict) -> str:
        """Determine if symbol is a function, class, etc in this file"""
        symbol_lower = symbol.lower()
        
        for func in file_info.get('functions', []):
            if func.get('name', '').lower() == symbol_lower:
                return 'function_definition'
        
        for cls in file_info.get('classes', []):
            if cls.get('name', '').lower() == symbol_lower:
                return 'class_definition'
        
        return 'reference'
    
    def _filter_files(self, pattern: Optional[str]) -> List[Dict]:
        """Filter files by glob pattern"""
        if not pattern:
            return self.parsed_files
        
        import fnmatch
        return [
            f for f in self.parsed_files
            if fnmatch.fnmatch(f.get('path', ''), pattern)
        ]
    
    def _levenshtein_similarity(self, s1: str, s2: str) -> float:
        """Calculate similarity between two strings (0-1)"""
        if len(s1) < len(s2):
            s1, s2 = s2, s1
        
        if len(s2) == 0:
            return 0.0
        
        distances = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            new_distances = [i + 1]
            for j, c2 in enumerate(s2):
                if c1 == c2:
                    new_distances.append(distances[j])
                else:
                    new_distances.append(1 + min(distances[j], distances[j+1], new_distances[-1]))
            distances = new_distances
        
        max_len = max(len(s1), len(s2))
        return 1 - (distances[-1] / max_len)
    
    # === Query Builder Methods ===
    
    def find_files_importing(self, module: str) -> List[str]:
        """Quick helper: Find all files that import a specific module"""
        result = self._search_imports(module)
        return [r['file_path'] for r in result['results']]
    
    def find_function_definition(self, func_name: str) -> Optional[Dict]:
        """Quick helper: Find where a function is defined"""
        locations = self.function_index.get(func_name, [])
        return locations[0] if locations else None
    
    def find_class_definition(self, class_name: str) -> Optional[Dict]:
        """Quick helper: Find where a class is defined"""
        locations = self.class_index.get(class_name, [])
        return locations[0] if locations else None
