"""
Impact Analyzer
Predicts the impact of changes to files in the codebase.
"""

from typing import Dict, List, Set, Any, Tuple
import networkx as nx
from collections import deque


class ImpactAnalyzer:
    """
    Analyzes the potential impact of modifying, moving, or deleting files.
    
    Features:
    - Blast radius calculation (what breaks if X changes)
    - Safe delete analysis
    - Refactoring impact preview
    - Critical path identification
    """
    
    def __init__(self, graph: nx.DiGraph, parsed_files: List[Dict]):
        self.graph = graph
        self.parsed_files = parsed_files
        self.file_index = {f['id']: f for f in parsed_files}
    
    def get_blast_radius(self, file_id: str, depth: int = 3) -> Dict[str, Any]:
        """
        Calculate the 'blast radius' - all files affected if this file changes.
        
        Returns files grouped by impact level:
        - Level 1: Direct dependents (import this file)
        - Level 2: Indirect dependents (import files that import this)
        - Level 3+: Transitive dependents
        """
        if not self.graph.has_node(file_id):
            return {'error': 'File not found in dependency graph'}
        
        levels = {}
        visited = {file_id}
        current_level = {file_id}
        
        for level in range(1, depth + 1):
            next_level = set()
            
            for node in current_level:
                # Get all files that depend on this node (predecessors in directed graph)
                dependents = set(self.graph.predecessors(node))
                new_dependents = dependents - visited
                next_level.update(new_dependents)
                visited.update(new_dependents)
            
            if next_level:
                levels[f'level_{level}'] = [
                    {
                        'id': fid,
                        'path': self.file_index.get(fid, {}).get('path', fid),
                        'complexity': self.file_index.get(fid, {}).get('complexity', 0)
                    }
                    for fid in next_level
                ]
            
            current_level = next_level
            
            if not current_level:
                break
        
        # Calculate risk score
        total_affected = sum(len(files) for files in levels.values())
        avg_complexity = 0
        if total_affected > 0:
            all_complexities = [
                f['complexity'] 
                for level_files in levels.values() 
                for f in level_files
            ]
            avg_complexity = sum(all_complexities) / len(all_complexities)
        
        risk_score = self._calculate_risk_score(total_affected, avg_complexity)
        
        return {
            'file_id': file_id,
            'file_path': self.file_index.get(file_id, {}).get('path', file_id),
            'total_affected': total_affected,
            'levels': levels,
            'risk_score': risk_score,
            'risk_level': self._risk_level(risk_score),
            'recommendation': self._get_recommendation(risk_score, total_affected)
        }
    
    def can_safely_delete(self, file_id: str) -> Dict[str, Any]:
        """
        Analyze if a file can be safely deleted.
        
        Returns:
        - Safe to delete: No dependents
        - Unsafe: List of files that would break
        - Warnings: Edge cases to consider
        """
        if not self.graph.has_node(file_id):
            return {
                'safe': True,
                'reason': 'File has no dependencies in graph',
                'warnings': ['File may be dynamically imported or entry point']
            }
        
        dependents = list(self.graph.predecessors(file_id))
        dependencies = list(self.graph.successors(file_id))
        
        if not dependents:
            file_info = self.file_index.get(file_id, {})
            warnings = []
            
            # Check if it might be an entry point
            name = file_info.get('name', '').lower()
            if any(pattern in name for pattern in ['index', 'main', 'app', 'server']):
                warnings.append('This appears to be an entry point - verify before deleting')
            
            if file_info.get('loc', 0) > 200:
                warnings.append('Large file - ensure no dynamic imports reference it')
            
            return {
                'safe': True,
                'reason': 'No files depend on this',
                'dependencies_to_clean': len(dependencies),
                'warnings': warnings
            }
        
        return {
            'safe': False,
            'reason': f'{len(dependents)} files would break',
            'breaking_files': [
                {
                    'id': fid,
                    'path': self.file_index.get(fid, {}).get('path', fid)
                }
                for fid in dependents[:20]  # Limit to 20
            ],
            'total_breaking': len(dependents),
            'suggestion': 'Consider deprecating with migration path'
        }
    
    def preview_move(self, file_id: str, target_directory: str) -> Dict[str, Any]:
        """
        Preview the impact of moving a file to a new location.
        
        Returns:
        - Files that need import path updates
        - Estimated effort
        - Potential issues
        """
        if not self.graph.has_node(file_id):
            return {'error': 'File not found'}
        
        file_info = self.file_index.get(file_id, {})
        current_path = file_info.get('path', '')
        
        # Get all dependents (need to update their imports)
        dependents = list(self.graph.predecessors(file_id))
        
        # Get all dependencies (this file imports)
        dependencies = list(self.graph.successors(file_id))
        
        # Calculate which imports in THIS file need updating (relative paths)
        relative_import_updates = []
        for dep_id in dependencies:
            dep_info = self.file_index.get(dep_id, {})
            dep_path = dep_info.get('path', '')
            
            # Simplified: assume relative imports need updating
            if not dep_path.startswith('node_modules') and not dep_path.startswith('@'):
                relative_import_updates.append({
                    'file': dep_path,
                    'type': 'relative_import_in_moved_file'
                })
        
        return {
            'file': current_path,
            'target': target_directory,
            'files_to_update': len(dependents),
            'dependents': [
                {
                    'id': fid,
                    'path': self.file_index.get(fid, {}).get('path', fid),
                    'update_type': 'import_path'
                }
                for fid in dependents[:30]
            ],
            'internal_updates': len(relative_import_updates),
            'effort_estimate': self._estimate_effort(len(dependents), len(relative_import_updates)),
            'automation_possible': True,
            'recommended_approach': self._get_move_recommendation(len(dependents))
        }
    
    def find_critical_paths(self) -> List[Dict[str, Any]]:
        """
        Identify critical paths - files that many others depend on.
        These are high-risk for changes.
        """
        criticality_scores = []
        
        for file_id in self.file_index:
            if not self.graph.has_node(file_id):
                continue
            
            # Direct dependents
            direct = self.graph.in_degree(file_id)
            
            # Transitive dependents (BFS)
            transitive = len(self._get_all_dependents(file_id))
            
            file_info = self.file_index[file_id]
            
            # Score: combination of direct importance and transitive reach
            score = direct * 2 + transitive * 0.5 + file_info.get('complexity', 0) * 0.1
            
            if score > 5:  # Only include significant files
                criticality_scores.append({
                    'id': file_id,
                    'path': file_info['path'],
                    'direct_dependents': direct,
                    'transitive_dependents': transitive,
                    'complexity': file_info.get('complexity', 0),
                    'criticality_score': round(score, 1)
                })
        
        # Sort by criticality
        criticality_scores.sort(key=lambda x: x['criticality_score'], reverse=True)
        
        return criticality_scores[:20]  # Top 20 critical files
    
    def _get_all_dependents(self, file_id: str) -> Set[str]:
        """Get all transitive dependents using BFS"""
        visited = set()
        queue = deque([file_id])
        
        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            
            dependents = self.graph.predecessors(current)
            for dep in dependents:
                if dep not in visited:
                    queue.append(dep)
        
        visited.discard(file_id)  # Don't include the original file
        return visited
    
    def _calculate_risk_score(self, affected_count: int, avg_complexity: float) -> float:
        """Calculate risk score 0-100"""
        # Base score from affected files
        base = min(affected_count * 5, 60)
        
        # Complexity multiplier
        complexity_factor = min(avg_complexity / 10, 1.5)
        
        return min(100, base * (1 + complexity_factor * 0.5))
    
    def _risk_level(self, score: float) -> str:
        """Convert score to risk level"""
        if score < 20:
            return 'low'
        elif score < 40:
            return 'medium'
        elif score < 70:
            return 'high'
        else:
            return 'critical'
    
    def _get_recommendation(self, risk_score: float, affected: int) -> str:
        """Get recommendation based on risk"""
        if risk_score < 20:
            return "✅ Safe to modify - low impact"
        elif risk_score < 40:
            return "⚠️ Test affected files after changes"
        elif risk_score < 70:
            return "🔶 High impact - consider incremental changes with feature flags"
        else:
            return "🚨 Critical file - require thorough review and staged rollout"
    
    def _estimate_effort(self, dependents: int, internal: int) -> str:
        """Estimate refactoring effort"""
        total = dependents + internal
        
        if total <= 5:
            return "~10 minutes"
        elif total <= 15:
            return "~30 minutes"
        elif total <= 30:
            return "~1 hour"
        elif total <= 50:
            return "~2-3 hours"
        else:
            return "~half day or more"
    
    def _get_move_recommendation(self, dependents: int) -> str:
        """Get recommendation for file move"""
        if dependents == 0:
            return "Direct move - no import updates needed"
        elif dependents <= 5:
            return "Manual update feasible"
        elif dependents <= 20:
            return "Use IDE refactoring tools (e.g., VS Code 'Move Symbol')"
        else:
            return "Consider using automated codemod (jscodeshift/ts-morph)"
