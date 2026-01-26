"""
Code Search Engine
Provides semantic and keyword search capabilities for the codebase.
"""

class CodeSearchEngine:
    def __init__(self):
        self.index = []
        self.documents = {}

    def index_files(self, parsed_files: list):
        """
        Index parsed files for search.
        parsed_files: List of dicts with 'content', 'name', 'path', etc.
        """
        print(f"[SearchEngine] Indexing {len(parsed_files)} files...")
        self.index = parsed_files
        # In a real implementation, we would use Whoosh or FAISS here.
        # For now, we store them in memory for simple filtering.

    def search(self, query: str) -> list:
        """
        Search for query in indexed files.
        Returns list of results.
        """
        query = query.lower()
        results = []

        for pf in self.index:
            score = 0
            content = pf.get('content', '').lower()
            name = pf.get('name', '').lower()
            path = pf.get('path', '').lower()

            # Simple scoring
            if query in name: score += 10
            if query in path: score += 5
            if query in content: score += content.count(query)

            if score > 0:
                results.append({
                    "id": pf.get('id', pf['path']),
                    "name": pf['name'],
                    "path": pf['path'],
                    "score": score,
                    "match_preview": self._get_preview(content, query)
                })

        # Sort by score desc
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:20]

    def _get_preview(self, content: str, query: str) -> str:
        try:
            idx = content.find(query)
            if idx == -1: return ""
            start = max(0, idx - 50)
            end = min(len(content), idx + 100)
            return "..." + content[start:end].replace("\n", " ") + "..."
        except:
            return ""
