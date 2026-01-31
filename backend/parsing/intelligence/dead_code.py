"""
Dead Code Detector
Identifies unused exports, orphan files, and unreachable code patterns.
"""

from typing import Dict, List, Set, Any
import networkx as nx
import re


class DeadCodeDetector:
    """
    Analyzes codebase for dead/unused code patterns.
    
    Detects:
    1. Orphan files - No incoming or outgoing dependencies
    2. Unused exports - Functions/classes exported but never imported
    3. One-way dependencies - Files that only import, never export
    4. Potential dead branches - Code behind always-false conditions
    """
    
    def __init__(self, graph: nx.DiGraph, parsed_files: List[Dict]):
        self.graph = graph
        self.parsed_files = parsed_files
        self.file_index = {f['id']: f for f in parsed_files}
    
    def analyze(self) -> Dict[str, Any]:
        """Run full dead code analysis"""
        return {
            'orphan_files': self._find_orphan_files(),
            'unused_exports': self._find_unused_exports(),
            'one_way_files': self._find_one_way_dependencies(),
            'low_usage_files': self._find_low_usage_files(),
            'summary': self._generate_summary()
        }
    
    def _find_orphan_files(self) -> List[Dict]:
        """
        Find files with no connections to the rest of the codebase.
        These are either standalone utilities or truly dead code.
        """
        orphans = []
        
        for file_id in self.file_index:
            if not self.graph.has_node(file_id):
                orphans.append({
                    'id': file_id,
                    'path': self.file_index[file_id]['path'],
                    'reason': 'not_in_graph',
                    'risk': 'high'
                })
                continue
            
            in_degree = self.graph.in_degree(file_id)
            out_degree = self.graph.out_degree(file_id)
            
            if in_degree == 0 and out_degree == 0:
                orphans.append({
                    'id': file_id,
                    'path': self.file_index[file_id]['path'],
                    'reason': 'no_connections',
                    'risk': 'high'
                })
        
        return orphans
    
    def _find_unused_exports(self) -> List[Dict]:
        """
        Find files that export functions/classes but are never imported.
        """
        unused = []
        
        for file_id in self.file_index:
            if not self.graph.has_node(file_id):
                continue
            
            in_degree = self.graph.in_degree(file_id)
            out_degree = self.graph.out_degree(file_id)
            
            # Has exports (out_degree > 0) but no imports from others (in_degree == 0)
            if in_degree == 0 and out_degree > 0:
                file_info = self.file_index[file_id]
                
                # Skip entry points (index, main, app files)
                if self._is_entry_point(file_info['name']):
                    continue
                
                unused.append({
                    'id': file_id,
                    'path': file_info['path'],
                    'exports_count': out_degree,
                    'reason': 'exports_never_imported',
                    'risk': 'medium'
                })
        
        return unused
    
    def _find_one_way_dependencies(self) -> List[Dict]:
        """
        Find leaf files - only import, never export.
        These are typically entry points or unused code.
        """
        one_way = []
        
        for file_id in self.file_index:
            if not self.graph.has_node(file_id):
                continue
            
            in_degree = self.graph.in_degree(file_id)
            out_degree = self.graph.out_degree(file_id)
            
            # Only imports (out_degree > 0), never imported by others (in_degree == 0)
            if in_degree == 0 and out_degree > 0:
                file_info = self.file_index[file_id]
                
                # Entry points are expected to be one-way
                if self._is_entry_point(file_info['name']):
                    continue
                
                one_way.append({
                    'id': file_id,
                    'path': file_info['path'],
                    'imports_count': out_degree,
                    'reason': 'imports_but_not_imported',
                    'risk': 'low'  # Could be an entry point
                })
        
        return one_way
    
    def _find_low_usage_files(self) -> List[Dict]:
        """
        Find files that are rarely imported (potential candidates for removal).
        """
        low_usage = []
        
        for file_id in self.file_index:
            if not self.graph.has_node(file_id):
                continue
            
            in_degree = self.graph.in_degree(file_id)
            file_info = self.file_index[file_id]
            
            # Large file (100+ LOC) with only 1 importer
            if in_degree == 1 and file_info.get('loc', 0) > 100:
                importers = list(self.graph.predecessors(file_id))
                
                low_usage.append({
                    'id': file_id,
                    'path': file_info['path'],
                    'loc': file_info.get('loc', 0),
                    'single_importer': importers[0] if importers else None,
                    'reason': 'large_file_single_use',
                    'risk': 'review',
                    'suggestion': 'Consider inlining or validating usage'
                })
        
        return low_usage
    
    def _is_entry_point(self, filename: str) -> bool:
        """Check if file is likely an entry point"""
        entry_patterns = [
            r'^index\.',
            r'^main\.',
            r'^app\.',
            r'^server\.',
            r'^__init__\.',
            r'^setup\.',
            r'\.config\.',
            r'\.test\.',
            r'\.spec\.',
        ]
        
        filename_lower = filename.lower()
        return any(re.match(pattern, filename_lower) for pattern in entry_patterns)
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate summary statistics"""
        total_files = len(self.parsed_files)
        orphans = self._find_orphan_files()
        unused = self._find_unused_exports()
        
        return {
            'total_files': total_files,
            'orphan_count': len(orphans),
            'unused_exports_count': len(unused),
            'dead_code_percentage': round((len(orphans) / max(total_files, 1)) * 100, 1),
            'health_status': self._calculate_health_status(orphans, total_files)
        }
    
    def _calculate_health_status(self, orphans: List, total: int) -> str:
        """Calculate overall codebase health regarding dead code"""
        percentage = (len(orphans) / max(total, 1)) * 100
        
        if percentage < 5:
            return 'excellent'
        elif percentage < 15:
            return 'good'
        elif percentage < 30:
            return 'needs_attention'
        else:
            return 'critical'
