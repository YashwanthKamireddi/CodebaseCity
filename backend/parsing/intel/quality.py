"""
Code Quality Scanner
Detects code smells, anti-patterns, and potential bugs.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import re


class IssueSeverity(Enum):
    """Severity levels for code issues"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class IssueCategory(Enum):
    """Categories of code issues"""
    COMPLEXITY = "complexity"
    DUPLICATION = "duplication"
    NAMING = "naming"
    SECURITY = "security"
    PERFORMANCE = "performance"
    MAINTAINABILITY = "maintainability"
    BUG_RISK = "bug_risk"
    STYLE = "style"


@dataclass
class CodeIssue:
    """Represents a detected code issue"""
    id: str
    title: str
    description: str
    category: IssueCategory
    severity: IssueSeverity
    file_path: str
    line_number: Optional[int] = None
    code_snippet: Optional[str] = None
    suggestion: Optional[str] = None
    effort_to_fix: str = "low"  # low, medium, high
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category.value,
            'severity': self.severity.value,
            'file_path': self.file_path,
            'line_number': self.line_number,
            'code_snippet': self.code_snippet,
            'suggestion': self.suggestion,
            'effort_to_fix': self.effort_to_fix
        }


class CodeQualityScanner:
    """
    Scans codebase for common code quality issues.
    
    Detects:
    - Long functions (God functions)
    - Deep nesting
    - Long parameter lists
    - Duplicate code patterns
    - Magic numbers
    - Complex conditionals
    - Large files
    - Poor naming conventions
    - Security anti-patterns
    - Performance issues
    """
    
    # Thresholds for issue detection
    THRESHOLDS = {
        'max_function_lines': 50,
        'max_function_params': 5,
        'max_nesting_depth': 4,
        'max_file_lines': 500,
        'max_complexity': 15,
        'max_class_methods': 20,
        'min_name_length': 2,
        'max_name_length': 40,
    }
    
    # Known security anti-patterns (simplified)
    SECURITY_PATTERNS = [
        (r'eval\s*\(', 'Use of eval() is dangerous'),
        (r'innerHTML\s*=', 'innerHTML can lead to XSS'),
        (r'document\.write\s*\(', 'document.write can cause XSS'),
        (r'dangerouslySetInnerHTML', 'dangerouslySetInnerHTML bypasses XSS protection'),
        (r'password\s*=\s*["\'][^"\']+["\']', 'Hardcoded password detected'),
        (r'api[_-]?key\s*=\s*["\'][^"\']+["\']', 'Hardcoded API key detected'),
        (r'secret\s*=\s*["\'][^"\']+["\']', 'Hardcoded secret detected'),
        (r'exec\s*\(', 'Use of exec() is dangerous'),
        (r'__proto__', '__proto__ manipulation can be dangerous'),
    ]
    
    # Performance anti-patterns
    PERFORMANCE_PATTERNS = [
        (r'\.forEach\([^)]*\)\s*\{[^}]*\.push', 'Use map() instead of forEach+push'),
        (r'for\s*\([^)]*\)\s*\{[^}]*await\s', 'Await in loop - consider Promise.all'),
        (r'JSON\.parse\s*\(\s*JSON\.stringify', 'Deep clone with JSON is slow'),
        (r'\.sort\s*\(\s*\)\s*\[\s*0\s*\]', 'Use Math.min/max instead of sort for extremes'),
        (r'new RegExp\s*\([^)]+\)', 'Create RegExp outside loop if pattern is static'),
    ]
    
    def __init__(self, parsed_files: List[Dict], source_cache: Dict[str, str] = None):
        self.parsed_files = parsed_files
        self.file_index = {f['id']: f for f in parsed_files}
        self.source_cache = source_cache or {}
        self.issues: List[CodeIssue] = []
    
    def scan(self) -> Dict[str, Any]:
        """
        Perform full quality scan on codebase.
        
        Returns comprehensive report with all detected issues.
        """
        self.issues = []
        
        for file_obj in self.parsed_files:
            self._scan_file(file_obj)
        
        # Analyze patterns across files
        self._detect_cross_file_issues()
        
        return self._generate_report()
    
    def _scan_file(self, file_obj: Dict):
        """Scan a single file for issues"""
        file_path = file_obj.get('path', '')
        
        # File-level checks
        self._check_file_size(file_obj, file_path)
        
        # Function-level checks
        for func in file_obj.get('functions', []):
            self._check_function(func, file_path)
        
        # Class-level checks
        for cls in file_obj.get('classes', []):
            self._check_class(cls, file_path)
        
        # Source code pattern checks
        source = self.source_cache.get(file_path, '')
        if source:
            self._check_source_patterns(source, file_path)
            self._check_naming(file_obj, source, file_path)
    
    def _check_file_size(self, file_obj: Dict, file_path: str):
        """Check if file is too large"""
        loc = file_obj.get('loc', 0)
        
        if loc > self.THRESHOLDS['max_file_lines']:
            self.issues.append(CodeIssue(
                id='large-file',
                title='Large File',
                description=f'File has {loc} lines, exceeding recommended {self.THRESHOLDS["max_file_lines"]}',
                category=IssueCategory.MAINTAINABILITY,
                severity=IssueSeverity.WARNING,
                file_path=file_path,
                suggestion='Consider splitting into smaller modules',
                effort_to_fix='high'
            ))
        
        # Check complexity
        complexity = file_obj.get('complexity', 0)
        if complexity > self.THRESHOLDS['max_complexity'] * 2:
            self.issues.append(CodeIssue(
                id='high-complexity-file',
                title='High File Complexity',
                description=f'File has complexity score of {complexity}',
                category=IssueCategory.COMPLEXITY,
                severity=IssueSeverity.WARNING,
                file_path=file_path,
                suggestion='Break down complex logic into smaller functions',
                effort_to_fix='medium'
            ))
    
    def _check_function(self, func: Dict, file_path: str):
        """Check function for issues"""
        func_name = func.get('name', 'anonymous')
        line = func.get('line', 0)
        
        # Long function
        func_lines = func.get('lines', 0)
        if func_lines > self.THRESHOLDS['max_function_lines']:
            self.issues.append(CodeIssue(
                id='long-function',
                title='Long Function',
                description=f'Function "{func_name}" has {func_lines} lines',
                category=IssueCategory.MAINTAINABILITY,
                severity=IssueSeverity.WARNING,
                file_path=file_path,
                line_number=line,
                suggestion=f'Consider extracting parts into separate functions. Target: <{self.THRESHOLDS["max_function_lines"]} lines',
                effort_to_fix='medium'
            ))
        
        # Too many parameters
        params = func.get('params', [])
        if len(params) > self.THRESHOLDS['max_function_params']:
            self.issues.append(CodeIssue(
                id='too-many-params',
                title='Too Many Parameters',
                description=f'Function "{func_name}" has {len(params)} parameters',
                category=IssueCategory.MAINTAINABILITY,
                severity=IssueSeverity.WARNING,
                file_path=file_path,
                line_number=line,
                suggestion='Consider using an options object or refactoring',
                effort_to_fix='low'
            ))
        
        # High complexity
        complexity = func.get('complexity', 0)
        if complexity > self.THRESHOLDS['max_complexity']:
            self.issues.append(CodeIssue(
                id='complex-function',
                title='High Cyclomatic Complexity',
                description=f'Function "{func_name}" has complexity of {complexity}',
                category=IssueCategory.COMPLEXITY,
                severity=IssueSeverity.WARNING if complexity < 25 else IssueSeverity.ERROR,
                file_path=file_path,
                line_number=line,
                suggestion='Simplify conditionals, extract helper functions, or use early returns',
                effort_to_fix='medium'
            ))
    
    def _check_class(self, cls: Dict, file_path: str):
        """Check class for issues"""
        class_name = cls.get('name', 'Unknown')
        line = cls.get('line', 0)
        methods = cls.get('methods', [])
        
        # Too many methods (God class)
        if len(methods) > self.THRESHOLDS['max_class_methods']:
            self.issues.append(CodeIssue(
                id='god-class',
                title='God Class',
                description=f'Class "{class_name}" has {len(methods)} methods',
                category=IssueCategory.MAINTAINABILITY,
                severity=IssueSeverity.WARNING,
                file_path=file_path,
                line_number=line,
                suggestion='Consider splitting into smaller, focused classes (Single Responsibility Principle)',
                effort_to_fix='high'
            ))
        
        # Check each method
        for method in methods:
            self._check_function(method, file_path)
    
    def _check_source_patterns(self, source: str, file_path: str):
        """Check source code for anti-patterns"""
        lines = source.split('\n')
        
        # Security patterns
        for pattern, message in self.SECURITY_PATTERNS:
            for i, line in enumerate(lines, 1):
                if re.search(pattern, line, re.IGNORECASE):
                    self.issues.append(CodeIssue(
                        id='security-issue',
                        title='Security Anti-Pattern',
                        description=message,
                        category=IssueCategory.SECURITY,
                        severity=IssueSeverity.ERROR,
                        file_path=file_path,
                        line_number=i,
                        code_snippet=line.strip()[:100],
                        suggestion='Review and fix this security concern',
                        effort_to_fix='medium'
                    ))
        
        # Performance patterns
        for pattern, message in self.PERFORMANCE_PATTERNS:
            for i, line in enumerate(lines, 1):
                if re.search(pattern, line):
                    self.issues.append(CodeIssue(
                        id='performance-issue',
                        title='Performance Anti-Pattern',
                        description=message,
                        category=IssueCategory.PERFORMANCE,
                        severity=IssueSeverity.INFO,
                        file_path=file_path,
                        line_number=i,
                        code_snippet=line.strip()[:100],
                        suggestion='Consider the suggested optimization',
                        effort_to_fix='low'
                    ))
        
        # Magic numbers
        magic_number_pattern = r'(?<![.\w])(?<!["\'])(?<![a-zA-Z_])([2-9]\d{2,}|[1-9]\d{3,})(?![.\w])(?!["\'])'
        for i, line in enumerate(lines, 1):
            # Skip imports, comments, and obvious non-code
            if any(skip in line.lower() for skip in ['import', '//', '#', '/*', 'console.log']):
                continue
            
            matches = re.findall(magic_number_pattern, line)
            for match in matches[:1]:  # One per line
                if int(match) not in [100, 1000, 1024, 3600, 86400, 10000]:  # Common acceptable values
                    self.issues.append(CodeIssue(
                        id='magic-number',
                        title='Magic Number',
                        description=f'Unexplained number {match} in code',
                        category=IssueCategory.MAINTAINABILITY,
                        severity=IssueSeverity.INFO,
                        file_path=file_path,
                        line_number=i,
                        code_snippet=line.strip()[:80],
                        suggestion='Extract to named constant for clarity',
                        effort_to_fix='low'
                    ))
        
        # Deep nesting detection
        self._check_nesting(lines, file_path)
    
    def _check_nesting(self, lines: List[str], file_path: str):
        """Detect deeply nested code"""
        indent_chars = 0
        max_indent = 0
        max_indent_line = 0
        
        for i, line in enumerate(lines, 1):
            if line.strip():
                leading = len(line) - len(line.lstrip())
                # Estimate indent level (assume 2-4 spaces per level)
                indent_level = leading // 2
                if indent_level > max_indent:
                    max_indent = indent_level
                    max_indent_line = i
        
        if max_indent > self.THRESHOLDS['max_nesting_depth']:
            self.issues.append(CodeIssue(
                id='deep-nesting',
                title='Deep Nesting',
                description=f'Code nesting depth of ~{max_indent} levels detected',
                category=IssueCategory.COMPLEXITY,
                severity=IssueSeverity.WARNING,
                file_path=file_path,
                line_number=max_indent_line,
                suggestion='Use early returns, extract functions, or flatten conditionals',
                effort_to_fix='medium'
            ))
    
    def _check_naming(self, file_obj: Dict, source: str, file_path: str):
        """Check naming conventions"""
        # Check function names
        for func in file_obj.get('functions', []):
            name = func.get('name', '')
            if name and not name.startswith('_'):
                if len(name) < self.THRESHOLDS['min_name_length']:
                    self.issues.append(CodeIssue(
                        id='short-name',
                        title='Too Short Name',
                        description=f'Function name "{name}" is too short',
                        category=IssueCategory.NAMING,
                        severity=IssueSeverity.INFO,
                        file_path=file_path,
                        line_number=func.get('line', 0),
                        suggestion='Use descriptive names that explain the purpose',
                        effort_to_fix='low'
                    ))
                elif len(name) > self.THRESHOLDS['max_name_length']:
                    self.issues.append(CodeIssue(
                        id='long-name',
                        title='Too Long Name',
                        description=f'Function name "{name}" is very long ({len(name)} chars)',
                        category=IssueCategory.NAMING,
                        severity=IssueSeverity.INFO,
                        file_path=file_path,
                        line_number=func.get('line', 0),
                        suggestion='Consider a more concise name',
                        effort_to_fix='low'
                    ))
    
    def _detect_cross_file_issues(self):
        """Detect issues that span multiple files"""
        # Detect potential duplicate files (similar structure)
        file_signatures = {}
        for file_obj in self.parsed_files:
            sig = (
                len(file_obj.get('functions', [])),
                len(file_obj.get('classes', [])),
                file_obj.get('loc', 0) // 50 * 50  # Bucket by 50 lines
            )
            if sig in file_signatures and sig != (0, 0, 0):
                existing = file_signatures[sig]
                self.issues.append(CodeIssue(
                    id='possible-duplicate',
                    title='Possible Duplicate File',
                    description=f'Similar structure to {existing}',
                    category=IssueCategory.DUPLICATION,
                    severity=IssueSeverity.INFO,
                    file_path=file_obj['path'],
                    suggestion='Review if these files can be consolidated',
                    effort_to_fix='medium'
                ))
            else:
                file_signatures[sig] = file_obj['path']
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive scan report"""
        # Group by category
        by_category = {}
        for issue in self.issues:
            cat = issue.category.value
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(issue.to_dict())
        
        # Group by severity
        by_severity = {}
        for issue in self.issues:
            sev = issue.severity.value
            if sev not in by_severity:
                by_severity[sev] = 0
            by_severity[sev] += 1
        
        # Calculate score (0-100, higher is better)
        severity_weights = {'info': 1, 'warning': 3, 'error': 10, 'critical': 25}
        total_weight = sum(
            by_severity.get(sev, 0) * weight 
            for sev, weight in severity_weights.items()
        )
        score = max(0, 100 - total_weight)
        
        return {
            'total_issues': len(self.issues),
            'quality_score': score,
            'by_severity': by_severity,
            'by_category': {k: len(v) for k, v in by_category.items()},
            'issues': by_category,
            'top_issues': [i.to_dict() for i in self.issues[:20]],
            'files_analyzed': len(self.parsed_files),
            'recommendations': self._get_recommendations(by_category)
        }
    
    def _get_recommendations(self, by_category: Dict) -> List[str]:
        """Generate actionable recommendations"""
        recs = []
        
        if 'security' in by_category:
            recs.append("🔴 Address security issues immediately - they pose risk to your application")
        
        if 'complexity' in by_category:
            recs.append("🟡 Refactor complex functions - break them into smaller, testable units")
        
        if 'maintainability' in by_category:
            recs.append("🟡 Improve maintainability - consider smaller files and functions")
        
        if 'performance' in by_category:
            recs.append("🔵 Review performance patterns - small optimizations can add up")
        
        if 'naming' in by_category:
            recs.append("🔵 Improve naming - clear names reduce cognitive load")
        
        if not recs:
            recs.append("✅ Great job! Your codebase looks healthy")
        
        return recs
