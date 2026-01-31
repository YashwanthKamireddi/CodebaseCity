"""
Code Search Engine
High-performance semantic and keyword search for codebases.
Features: Fuzzy matching, code-aware search, ranking by relevance.
"""

import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from functools import lru_cache


@dataclass
class SearchMatch:
    """A single search match with context."""
    line_number: int
    line_content: str
    match_start: int
    match_end: int


class CodeSearchEngine:
    """Enterprise-grade code search engine with fuzzy matching and ranking."""

    def __init__(self):
        self.index: List[Dict[str, Any]] = []
        self.file_map: Dict[str, Dict[str, Any]] = {}

        # Code-aware patterns for smart search
        self.code_patterns = {
            'function': r'(?:def|function|func|fn)\s+(\w+)',
            'class': r'(?:class|struct|interface)\s+(\w+)',
            'import': r'(?:import|from|require|use)\s+["\']?([^"\'\s;]+)',
            'variable': r'(?:const|let|var|val)\s+(\w+)',
        }

    def index_files(self, parsed_files: List[Dict[str, Any]]) -> None:
        """
        Index parsed files for search with optimized data structures.
        """
        print(f"[SearchEngine] Indexing {len(parsed_files)} files...")
        self.index = parsed_files
        self.file_map = {pf.get('path', pf.get('id', '')): pf for pf in parsed_files}

        # Pre-compute lowercase content for faster search
        for pf in self.index:
            pf['_content_lower'] = pf.get('content', '').lower()
            pf['_name_lower'] = pf.get('name', '').lower()
            pf['_path_lower'] = pf.get('path', '').lower()

    def search(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search for query across indexed files.
        Returns ranked results with match previews and metadata.
        """
        if not query or len(query) < 2:
            return []

        query_lower = query.lower()
        query_parts = query_lower.split()
        results = []

        for pf in self.index:
            score = 0
            matches: List[SearchMatch] = []

            name_lower = pf.get('_name_lower', '')
            path_lower = pf.get('_path_lower', '')
            content_lower = pf.get('_content_lower', '')
            content = pf.get('content', '')

            # ========== SCORING ALGORITHM ==========

            # 1. Exact filename match (highest priority)
            if query_lower == name_lower.rsplit('.', 1)[0]:
                score += 100
            elif query_lower in name_lower:
                score += 50

            # 2. Filename starts with query
            if name_lower.startswith(query_lower):
                score += 30

            # 3. Path match (directory structure)
            if query_lower in path_lower:
                score += 20

            # 4. All query parts match (fuzzy)
            parts_matched = sum(1 for part in query_parts if part in path_lower or part in content_lower)
            if parts_matched == len(query_parts):
                score += 15 * parts_matched

            # 5. Content matches (with count-based scoring)
            if query_lower in content_lower:
                occurrence_count = content_lower.count(query_lower)
                score += min(occurrence_count * 2, 30)  # Cap at 30

                # Find line matches for preview
                lines = content.split('\\n')
                for i, line in enumerate(lines[:500]):  # Limit to first 500 lines
                    if query_lower in line.lower():
                        match_start = line.lower().find(query_lower)
                        matches.append(SearchMatch(
                            line_number=i + 1,
                            line_content=line.strip()[:200],
                            match_start=match_start,
                            match_end=match_start + len(query)
                        ))
                        if len(matches) >= 3:  # Max 3 matches per file
                            break

            # 6. Code-aware search (function/class names)
            for pattern_type, pattern in self.code_patterns.items():
                pattern_matches = re.findall(pattern, content, re.IGNORECASE)
                for match in pattern_matches:
                    if query_lower in match.lower():
                        score += 25
                        break

            # 7. Boost by file importance metrics
            complexity = pf.get('complexity', 1)
            loc = pf.get('loc', 0)

            # Larger, more complex files are often more important
            if loc > 100:
                score += 5
            if complexity > 10:
                score += 3

            # Skip files with no matches
            if score == 0:
                continue

            # Build result
            results.append({
                "id": pf.get('id', pf.get('path', '')),
                "name": pf.get('name', ''),
                "path": pf.get('path', ''),
                "language": pf.get('language', 'unknown'),
                "score": score,
                "loc": loc,
                "complexity": complexity,
                "match_preview": self._build_preview(content, query_lower),
                "matches": [
                    {
                        "line": m.line_number,
                        "content": m.line_content,
                        "start": m.match_start,
                        "end": m.match_end
                    }
                    for m in matches[:3]
                ]
            })

        # Sort by score (descending)
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]

    def search_symbols(self, query: str, symbol_type: str = 'all') -> List[Dict[str, Any]]:
        """
        Search for code symbols (functions, classes, variables).
        """
        if not query or len(query) < 2:
            return []

        query_lower = query.lower()
        results = []

        patterns = self.code_patterns if symbol_type == 'all' else {symbol_type: self.code_patterns.get(symbol_type, '')}

        for pf in self.index:
            content = pf.get('content', '')
            file_path = pf.get('path', '')

            for sym_type, pattern in patterns.items():
                if not pattern:
                    continue

                for match in re.finditer(pattern, content, re.IGNORECASE):
                    symbol_name = match.group(1)
                    if query_lower in symbol_name.lower():
                        # Find line number
                        line_num = content[:match.start()].count('\\n') + 1

                        results.append({
                            "symbol": symbol_name,
                            "type": sym_type,
                            "file": pf.get('name', ''),
                            "path": file_path,
                            "line": line_num,
                            "score": 100 if symbol_name.lower() == query_lower else 50
                        })

        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:30]

    def get_file(self, path: str) -> Optional[Dict[str, Any]]:
        """Get file data by path."""
        return self.file_map.get(path)

    def _build_preview(self, content: str, query: str) -> str:
        """Build a contextual preview around the match."""
        try:
            content_lower = content.lower()
            idx = content_lower.find(query)

            if idx == -1:
                return ""

            # Find line boundaries
            start = content.rfind('\\n', 0, idx)
            start = 0 if start == -1 else start + 1

            end = content.find('\\n', idx)
            end = len(content) if end == -1 else end

            # Get the line with some context
            line = content[start:end].strip()

            # Truncate if too long
            if len(line) > 150:
                # Center around the match
                match_pos = idx - start
                preview_start = max(0, match_pos - 50)
                preview_end = min(len(line), match_pos + len(query) + 100)
                line = ('...' if preview_start > 0 else '') + line[preview_start:preview_end] + ('...' if preview_end < len(line) else '')

            return line

        except Exception:
            return ""
