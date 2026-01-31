"""
Code Health Analyzer
Calculates comprehensive health scores for files and the entire codebase.
"""

from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum
import math


class HealthGrade(Enum):
    A = 'A'  # Excellent (90-100)
    B = 'B'  # Good (75-89)
    C = 'C'  # Acceptable (60-74)
    D = 'D'  # Needs Work (40-59)
    F = 'F'  # Critical (0-39)


@dataclass
class HealthMetrics:
    """Health metrics for a single file"""
    complexity_score: float  # 0-100 (lower complexity = higher score)
    churn_score: float       # 0-100 (lower churn = higher score)
    size_score: float        # 0-100 (optimal size = higher score)
    coupling_score: float    # 0-100 (lower coupling = higher score)
    age_score: float         # 0-100 (regular updates = higher score)
    overall_score: float     # Weighted average
    grade: HealthGrade
    issues: List[str]


class CodeHealthAnalyzer:
    """
    Calculates code health scores based on multiple factors:
    - Cyclomatic complexity
    - Code churn (change frequency)
    - File size (LOC)
    - Coupling (dependencies)
    - Age/staleness
    """
    
    # Thresholds for scoring
    COMPLEXITY_THRESHOLDS = {
        'excellent': 5,
        'good': 10,
        'acceptable': 20,
        'concerning': 30
    }
    
    SIZE_THRESHOLDS = {
        'tiny': 50,       # Too small might indicate incomplete
        'optimal_min': 50,
        'optimal_max': 300,
        'large': 500,
        'massive': 1000
    }
    
    CHURN_THRESHOLDS = {
        'stable': 3,
        'active': 10,
        'volatile': 25,
        'chaotic': 50
    }
    
    def __init__(self, parsed_files: List[Dict], graph=None):
        self.parsed_files = parsed_files
        self.graph = graph
        self.file_index = {f['id']: f for f in parsed_files}
    
    def analyze_file(self, file_data: Dict) -> HealthMetrics:
        """Calculate health metrics for a single file"""
        issues = []
        
        # 1. Complexity Score
        complexity = file_data.get('complexity', 0)
        complexity_score = self._score_complexity(complexity)
        if complexity > self.COMPLEXITY_THRESHOLDS['concerning']:
            issues.append(f'High complexity: {complexity} (consider refactoring)')
        
        # 2. Size Score
        loc = file_data.get('loc', 0)
        size_score = self._score_size(loc)
        if loc > self.SIZE_THRESHOLDS['massive']:
            issues.append(f'File too large: {loc} lines (consider splitting)')
        
        # 3. Churn Score
        churn = file_data.get('churn', 0)
        churn_score = self._score_churn(churn, complexity)
        if churn > self.CHURN_THRESHOLDS['volatile'] and complexity > 15:
            issues.append(f'High churn + complexity hotspot (prioritize refactoring)')
        
        # 4. Coupling Score
        coupling_score = self._score_coupling(file_data['id'])
        
        # 5. Age Score
        age_days = file_data.get('age_days', 0)
        age_score = self._score_age(age_days, churn)
        if age_days > 365 and churn == 0:
            issues.append('Stale code: No changes in over a year')
        
        # Calculate overall score (weighted average)
        weights = {
            'complexity': 0.30,
            'churn': 0.25,
            'size': 0.20,
            'coupling': 0.15,
            'age': 0.10
        }
        
        overall_score = (
            complexity_score * weights['complexity'] +
            churn_score * weights['churn'] +
            size_score * weights['size'] +
            coupling_score * weights['coupling'] +
            age_score * weights['age']
        )
        
        grade = self._score_to_grade(overall_score)
        
        return HealthMetrics(
            complexity_score=round(complexity_score, 1),
            churn_score=round(churn_score, 1),
            size_score=round(size_score, 1),
            coupling_score=round(coupling_score, 1),
            age_score=round(age_score, 1),
            overall_score=round(overall_score, 1),
            grade=grade,
            issues=issues
        )
    
    def analyze_codebase(self) -> Dict[str, Any]:
        """Calculate health metrics for entire codebase"""
        file_scores = []
        grade_distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
        hotspots = []
        
        for file_data in self.parsed_files:
            metrics = self.analyze_file(file_data)
            file_scores.append({
                'id': file_data['id'],
                'path': file_data['path'],
                'metrics': metrics
            })
            
            grade_distribution[metrics.grade.value] += 1
            
            # Track hotspots (high churn + low score)
            if metrics.overall_score < 50 and file_data.get('churn', 0) > 10:
                hotspots.append({
                    'id': file_data['id'],
                    'path': file_data['path'],
                    'score': metrics.overall_score,
                    'issues': metrics.issues
                })
        
        # Calculate averages
        avg_score = sum(fs['metrics'].overall_score for fs in file_scores) / max(len(file_scores), 1)
        
        # Sort hotspots by score (worst first)
        hotspots.sort(key=lambda x: x['score'])
        
        return {
            'overall_score': round(avg_score, 1),
            'overall_grade': self._score_to_grade(avg_score).value,
            'grade_distribution': grade_distribution,
            'file_count': len(self.parsed_files),
            'hotspots': hotspots[:10],  # Top 10 worst files
            'top_issues': self._aggregate_top_issues(file_scores),
            'recommendations': self._generate_recommendations(avg_score, hotspots, grade_distribution)
        }
    
    def _score_complexity(self, complexity: float) -> float:
        """Convert complexity to 0-100 score (lower complexity = higher score)"""
        if complexity <= self.COMPLEXITY_THRESHOLDS['excellent']:
            return 100
        elif complexity <= self.COMPLEXITY_THRESHOLDS['good']:
            return 100 - ((complexity - 5) / 5) * 15  # 85-100
        elif complexity <= self.COMPLEXITY_THRESHOLDS['acceptable']:
            return 85 - ((complexity - 10) / 10) * 25  # 60-85
        elif complexity <= self.COMPLEXITY_THRESHOLDS['concerning']:
            return 60 - ((complexity - 20) / 10) * 20  # 40-60
        else:
            return max(0, 40 - ((complexity - 30) / 20) * 40)
    
    def _score_size(self, loc: int) -> float:
        """Score file size (optimal range gets highest score)"""
        if loc < self.SIZE_THRESHOLDS['tiny']:
            return 70  # Small files are okay but might be too granular
        elif loc <= self.SIZE_THRESHOLDS['optimal_max']:
            return 100  # Optimal range
        elif loc <= self.SIZE_THRESHOLDS['large']:
            return 100 - ((loc - 300) / 200) * 30  # 70-100
        elif loc <= self.SIZE_THRESHOLDS['massive']:
            return 70 - ((loc - 500) / 500) * 30  # 40-70
        else:
            return max(20, 40 - ((loc - 1000) / 1000) * 20)
    
    def _score_churn(self, churn: int, complexity: float) -> float:
        """Score churn (lower is better, especially for complex files)"""
        base_score = 100
        
        if churn <= self.CHURN_THRESHOLDS['stable']:
            return 100
        elif churn <= self.CHURN_THRESHOLDS['active']:
            base_score = 100 - ((churn - 3) / 7) * 15
        elif churn <= self.CHURN_THRESHOLDS['volatile']:
            base_score = 85 - ((churn - 10) / 15) * 25
        else:
            base_score = max(30, 60 - ((churn - 25) / 25) * 30)
        
        # Penalty for high churn + high complexity combo
        if complexity > 15 and churn > 10:
            base_score *= 0.9
        
        return base_score
    
    def _score_coupling(self, file_id: str) -> float:
        """Score based on coupling (dependencies)"""
        if not self.graph or not self.graph.has_node(file_id):
            return 80  # Default score if no graph data
        
        in_degree = self.graph.in_degree(file_id)
        out_degree = self.graph.out_degree(file_id)
        total_coupling = in_degree + out_degree
        
        if total_coupling <= 5:
            return 100
        elif total_coupling <= 10:
            return 90
        elif total_coupling <= 20:
            return 75
        elif total_coupling <= 30:
            return 60
        else:
            return max(30, 60 - (total_coupling - 30) * 0.5)
    
    def _score_age(self, age_days: int, churn: int) -> float:
        """Score based on file age and activity"""
        if age_days < 30:
            return 100  # New file
        elif age_days < 180:
            return 95 if churn > 0 else 80
        elif age_days < 365:
            return 85 if churn > 0 else 60
        else:
            # Old files: good if actively maintained, bad if stale
            return 70 if churn > 0 else 40
    
    def _score_to_grade(self, score: float) -> HealthGrade:
        """Convert numeric score to letter grade"""
        if score >= 90:
            return HealthGrade.A
        elif score >= 75:
            return HealthGrade.B
        elif score >= 60:
            return HealthGrade.C
        elif score >= 40:
            return HealthGrade.D
        else:
            return HealthGrade.F
    
    def _aggregate_top_issues(self, file_scores: List[Dict]) -> List[str]:
        """Aggregate and count most common issues"""
        issue_counts = {}
        
        for fs in file_scores:
            for issue in fs['metrics'].issues:
                # Normalize issue text
                issue_type = issue.split(':')[0] if ':' in issue else issue
                issue_counts[issue_type] = issue_counts.get(issue_type, 0) + 1
        
        # Sort by count
        sorted_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [f"{issue}: {count} files" for issue, count in sorted_issues[:5]]
    
    def _generate_recommendations(
        self, 
        avg_score: float, 
        hotspots: List[Dict],
        grade_dist: Dict[str, int]
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if avg_score < 60:
            recommendations.append("🚨 Critical: Overall code health needs immediate attention")
        
        if len(hotspots) > 5:
            recommendations.append(f"🔥 Focus on {len(hotspots)} hotspot files with high churn + complexity")
        
        if grade_dist['F'] > grade_dist['A']:
            recommendations.append("📉 More failing files than excellent - prioritize refactoring")
        
        if grade_dist['A'] + grade_dist['B'] > len(self.parsed_files) * 0.7:
            recommendations.append("✅ Codebase is in good shape - maintain current practices")
        
        if not recommendations:
            recommendations.append("💡 Consider setting up automated code quality gates")
        
        return recommendations
