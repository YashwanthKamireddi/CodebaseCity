"""
Refactoring Helper
Provides suggestions and analysis for code refactoring.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import networkx as nx


class RefactoringType(Enum):
    """Types of refactoring suggestions"""
    EXTRACT_FUNCTION = "extract_function"
    EXTRACT_CLASS = "extract_class"
    MOVE_FILE = "move_file"
    SPLIT_FILE = "split_file"
    MERGE_FILES = "merge_files"
    RENAME = "rename"
    INLINE = "inline"
    EXTRACT_CONSTANT = "extract_constant"


@dataclass
class RefactoringSuggestion:
    """A refactoring suggestion"""
    type: RefactoringType
    title: str
    description: str
    affected_files: List[str]
    effort: str  # low, medium, high
    benefit: str  # description of benefit
    priority: int  # 1-5, higher is more important
    
    def to_dict(self) -> Dict:
        return {
            'type': self.type.value,
            'title': self.title,
            'description': self.description,
            'affected_files': self.affected_files,
            'effort': self.effort,
            'benefit': self.benefit,
            'priority': self.priority
        }


class RefactoringHelper:
    """
    Analyzes codebase and suggests refactoring opportunities.
    
    Detects:
    - Files that should be split (too large/complex)
    - Files that could be merged (too small, related)
    - Misplaced files (in wrong directory)
    - Naming inconsistencies
    - Circular dependencies that could be broken
    - God classes/files that need decomposition
    """
    
    # Thresholds
    LARGE_FILE_LINES = 500
    SMALL_FILE_LINES = 30
    HIGH_COMPLEXITY = 30
    TOO_MANY_FUNCTIONS = 15
    TOO_MANY_IMPORTS = 20
    
    def __init__(self, graph: nx.DiGraph, parsed_files: List[Dict]):
        self.graph = graph
        self.parsed_files = parsed_files
        self.file_index = {f['id']: f for f in parsed_files}
        self.suggestions: List[RefactoringSuggestion] = []
    
    def analyze(self) -> Dict[str, Any]:
        """
        Analyze codebase and generate refactoring suggestions.
        """
        self.suggestions = []
        
        # Analyze each file
        for file_obj in self.parsed_files:
            self._analyze_file(file_obj)
        
        # Cross-file analysis
        self._find_merge_candidates()
        self._find_circular_dependencies()
        self._find_misplaced_files()
        
        # Sort by priority
        self.suggestions.sort(key=lambda s: s.priority, reverse=True)
        
        return self._generate_report()
    
    def _analyze_file(self, file_obj: Dict):
        """Analyze single file for refactoring opportunities"""
        file_path = file_obj.get('path', '')
        loc = file_obj.get('loc', 0)
        complexity = file_obj.get('complexity', 0)
        functions = file_obj.get('functions', [])
        imports = file_obj.get('imports', [])
        
        # Check if file should be split
        if loc > self.LARGE_FILE_LINES:
            self.suggestions.append(RefactoringSuggestion(
                type=RefactoringType.SPLIT_FILE,
                title=f"Split large file: {file_path}",
                description=f"File has {loc} lines. Consider splitting by responsibility.",
                affected_files=[file_path],
                effort="high",
                benefit="Improved maintainability and testability",
                priority=4 if loc > 800 else 3
            ))
        
        # High complexity file
        if complexity > self.HIGH_COMPLEXITY:
            self.suggestions.append(RefactoringSuggestion(
                type=RefactoringType.EXTRACT_FUNCTION,
                title=f"Reduce complexity: {file_path}",
                description=f"Complexity score of {complexity}. Extract helper functions.",
                affected_files=[file_path],
                effort="medium",
                benefit="Reduced cognitive load, easier testing",
                priority=4
            ))
        
        # Too many functions - candidate for class extraction
        if len(functions) > self.TOO_MANY_FUNCTIONS:
            self.suggestions.append(RefactoringSuggestion(
                type=RefactoringType.EXTRACT_CLASS,
                title=f"Extract class from: {file_path}",
                description=f"File has {len(functions)} functions. Group related ones into classes.",
                affected_files=[file_path],
                effort="medium",
                benefit="Better organization and encapsulation",
                priority=3
            ))
        
        # Too many imports - might be doing too much
        if len(imports) > self.TOO_MANY_IMPORTS:
            self.suggestions.append(RefactoringSuggestion(
                type=RefactoringType.SPLIT_FILE,
                title=f"Too many dependencies: {file_path}",
                description=f"File imports {len(imports)} modules. May be doing too much.",
                affected_files=[file_path],
                effort="high",
                benefit="Reduced coupling, clearer responsibilities",
                priority=3
            ))
        
        # Check individual functions
        for func in functions:
            func_lines = func.get('lines', 0)
            func_complexity = func.get('complexity', 0)
            func_name = func.get('name', 'unknown')
            
            if func_lines > 50:
                self.suggestions.append(RefactoringSuggestion(
                    type=RefactoringType.EXTRACT_FUNCTION,
                    title=f"Long function: {func_name}",
                    description=f"Function has {func_lines} lines. Consider extracting sub-functions.",
                    affected_files=[file_path],
                    effort="low",
                    benefit="Improved readability and testability",
                    priority=2
                ))
    
    def _find_merge_candidates(self):
        """Find small related files that could be merged"""
        small_files = [
            f for f in self.parsed_files 
            if f.get('loc', 0) < self.SMALL_FILE_LINES
            and f.get('loc', 0) > 0
        ]
        
        # Group by directory
        by_dir: Dict[str, List[Dict]] = {}
        for f in small_files:
            path = f.get('path', '')
            dir_name = '/'.join(path.split('/')[:-1])
            if dir_name not in by_dir:
                by_dir[dir_name] = []
            by_dir[dir_name].append(f)
        
        # Suggest merging files in same directory
        for dir_name, files in by_dir.items():
            if len(files) >= 3:
                paths = [f['path'] for f in files]
                self.suggestions.append(RefactoringSuggestion(
                    type=RefactoringType.MERGE_FILES,
                    title=f"Merge small files in {dir_name}",
                    description=f"Found {len(files)} small files. Consider consolidating.",
                    affected_files=paths[:5],  # Limit for display
                    effort="medium",
                    benefit="Reduced file navigation, simplified structure",
                    priority=2
                ))
    
    def _find_circular_dependencies(self):
        """Detect circular dependencies and suggest how to break them"""
        try:
            cycles = list(nx.simple_cycles(self.graph))
            
            for cycle in cycles[:5]:  # Limit to 5 cycles
                if len(cycle) <= 5:  # Only report manageable cycles
                    paths = [
                        self.file_index.get(fid, {}).get('path', fid)
                        for fid in cycle
                    ]
                    self.suggestions.append(RefactoringSuggestion(
                        type=RefactoringType.MOVE_FILE,
                        title=f"Circular dependency detected",
                        description=f"Cycle: {' → '.join(paths[:3])}{'...' if len(paths) > 3 else ''}",
                        affected_files=paths,
                        effort="high",
                        benefit="Cleaner architecture, easier testing and maintenance",
                        priority=5  # High priority
                    ))
        except Exception:
            pass  # Graph might not support cycle detection
    
    def _find_misplaced_files(self):
        """Find files that might be in the wrong directory"""
        # Analyze import patterns to detect misplacements
        file_deps = {}
        
        for file_obj in self.parsed_files:
            file_id = file_obj['id']
            file_path = file_obj.get('path', '')
            file_dir = '/'.join(file_path.split('/')[:-1])
            
            # Get dependencies
            if self.graph.has_node(file_id):
                deps = list(self.graph.successors(file_id))
                dep_dirs = []
                
                for dep_id in deps:
                    dep_info = self.file_index.get(dep_id, {})
                    dep_path = dep_info.get('path', '')
                    dep_dir = '/'.join(dep_path.split('/')[:-1])
                    if dep_dir and dep_dir != file_dir:
                        dep_dirs.append(dep_dir)
                
                # If most dependencies are in a different directory
                if len(dep_dirs) >= 3:
                    from collections import Counter
                    most_common = Counter(dep_dirs).most_common(1)
                    if most_common:
                        common_dir, count = most_common[0]
                        if count >= 3 and count / len(deps) > 0.6:
                            self.suggestions.append(RefactoringSuggestion(
                                type=RefactoringType.MOVE_FILE,
                                title=f"Consider moving: {file_path}",
                                description=f"File imports mostly from {common_dir}",
                                affected_files=[file_path],
                                effort="medium",
                                benefit="Better code organization, reduced import paths",
                                priority=2
                            ))
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate refactoring report"""
        by_type = {}
        for suggestion in self.suggestions:
            t = suggestion.type.value
            if t not in by_type:
                by_type[t] = []
            by_type[t].append(suggestion.to_dict())
        
        # Summary
        high_priority = len([s for s in self.suggestions if s.priority >= 4])
        medium_priority = len([s for s in self.suggestions if s.priority == 3])
        low_priority = len([s for s in self.suggestions if s.priority <= 2])
        
        return {
            'total_suggestions': len(self.suggestions),
            'by_priority': {
                'high': high_priority,
                'medium': medium_priority,
                'low': low_priority
            },
            'by_type': {k: len(v) for k, v in by_type.items()},
            'suggestions': [s.to_dict() for s in self.suggestions[:30]],
            'quick_wins': [
                s.to_dict() for s in self.suggestions
                if s.effort == 'low' and s.priority >= 3
            ][:5],
            'recommendations': self._get_recommendations()
        }
    
    def _get_recommendations(self) -> List[str]:
        """Generate high-level recommendations"""
        recs = []
        
        circular = len([s for s in self.suggestions if 'Circular' in s.title])
        if circular > 0:
            recs.append(f"🔴 Found {circular} circular dependency chains - address these first for cleaner architecture")
        
        large_files = len([s for s in self.suggestions if s.type == RefactoringType.SPLIT_FILE])
        if large_files > 0:
            recs.append(f"🟡 {large_files} files could be split for better maintainability")
        
        complexity = len([s for s in self.suggestions if 'complexity' in s.title.lower()])
        if complexity > 0:
            recs.append(f"🟡 {complexity} files have high complexity - extract helper functions")
        
        if not recs:
            recs.append("✅ Codebase structure looks healthy!")
        
        return recs


def get_refactoring_suggestions(graph: nx.DiGraph, parsed_files: List[Dict]) -> Dict[str, Any]:
    """
    Convenience function to get refactoring suggestions.
    """
    helper = RefactoringHelper(graph, parsed_files)
    return helper.analyze()
