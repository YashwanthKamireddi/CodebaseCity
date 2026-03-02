"""
Intelligence Module
Advanced code analysis and insights for developers.
"""

from .dead_code import DeadCodeDetector
from .health import CodeHealthAnalyzer, HealthMetrics, HealthGrade
from .impact import ImpactAnalyzer
from .search import SmartSearch, SearchType
from .quality import CodeQualityScanner, CodeIssue, IssueSeverity, IssueCategory
from .refactoring import RefactoringHelper, RefactoringSuggestion, RefactoringType
from .dependencies import DependencyAnalyzer

__all__ = [
    'DeadCodeDetector',
    'CodeHealthAnalyzer',
    'HealthMetrics',
    'HealthGrade',
    'ImpactAnalyzer',
    'SmartSearch',
    'SearchType',
    'CodeQualityScanner',
    'CodeIssue',
    'IssueSeverity',
    'IssueCategory',
    'RefactoringHelper',
    'RefactoringSuggestion',
    'RefactoringType',
    'DependencyAnalyzer',
]
