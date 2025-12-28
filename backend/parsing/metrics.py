"""
Metrics Calculator - Calculate code quality and activity metrics
"""

import re
import os
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional


class MetricsCalculator:
    """Calculate various code metrics"""
    
    def cyclomatic_complexity(self, content: str, language: str) -> int:
        """
        Calculate cyclomatic complexity of a file.
        Simplified version - counts decision points.
        """
        # Keywords that increase complexity
        complexity_keywords = {
            'python': [r'\bif\b', r'\belif\b', r'\bfor\b', r'\bwhile\b', r'\band\b', r'\bor\b', r'\bexcept\b', r'\bwith\b'],
            'javascript': [r'\bif\b', r'\belse\s+if\b', r'\bfor\b', r'\bwhile\b', r'\bcase\b', r'\bcatch\b', r'\b\?\b', r'&&', r'\|\|'],
            'typescript': [r'\bif\b', r'\belse\s+if\b', r'\bfor\b', r'\bwhile\b', r'\bcase\b', r'\bcatch\b', r'\b\?\b', r'&&', r'\|\|'],
            'java': [r'\bif\b', r'\belse\s+if\b', r'\bfor\b', r'\bwhile\b', r'\bcase\b', r'\bcatch\b', r'&&', r'\|\|'],
            'go': [r'\bif\b', r'\bfor\b', r'\bcase\b', r'&&', r'\|\|'],
        }
        
        keywords = complexity_keywords.get(language, complexity_keywords['python'])
        complexity = 1  # Base complexity
        
        for keyword in keywords:
            complexity += len(re.findall(keyword, content))
        
        return complexity
    
    def get_file_age(self, file_path: Path) -> int:
        """Get the age of a file in days since last modification"""
        try:
            result = subprocess.run(
                ['git', 'log', '-1', '--format=%ct', str(file_path)],
                capture_output=True,
                text=True,
                cwd=file_path.parent
            )
            if result.returncode == 0 and result.stdout.strip():
                timestamp = int(result.stdout.strip())
                last_modified = datetime.fromtimestamp(timestamp)
                age = (datetime.now() - last_modified).days
                return max(0, age)
        except:
            pass
        
        # Fallback to file system modification time
        try:
            mtime = os.path.getmtime(file_path)
            last_modified = datetime.fromtimestamp(mtime)
            return max(0, (datetime.now() - last_modified).days)
        except:
            return 0
    
    def get_file_churn(self, file_path: Path, days: int = 90) -> int:
        """Get the number of commits touching this file in the last N days"""
        try:
            result = subprocess.run(
                ['git', 'log', f'--since={days} days ago', '--oneline', str(file_path)],
                capture_output=True,
                text=True,
                cwd=file_path.parent
            )
            if result.returncode == 0:
                return len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0
        except:
            pass
        return 0
    
    def comment_density(self, content: str, language: str) -> float:
        """Calculate the ratio of comment lines to total lines"""
        lines = content.split('\n')
        total_lines = len(lines)
        if total_lines == 0:
            return 0.0
        
        comment_lines = 0
        in_block_comment = False
        
        for line in lines:
            stripped = line.strip()
            
            if language in ('python',):
                if stripped.startswith('#'):
                    comment_lines += 1
                elif stripped.startswith('"""') or stripped.startswith("'''"):
                    in_block_comment = not in_block_comment
                    comment_lines += 1
                elif in_block_comment:
                    comment_lines += 1
            
            elif language in ('javascript', 'typescript', 'java', 'go', 'cpp', 'c'):
                if stripped.startswith('//'):
                    comment_lines += 1
                elif stripped.startswith('/*'):
                    in_block_comment = True
                    comment_lines += 1
                elif stripped.endswith('*/'):
                    in_block_comment = False
                    comment_lines += 1
                elif in_block_comment:
                    comment_lines += 1
        
        return comment_lines / total_lines
    
    def function_count(self, content: str, language: str) -> int:
        """Count the number of functions in a file"""
        patterns = {
            'python': r'(?:async\s+)?def\s+\w+\s*\(',
            'javascript': r'(?:function\s+\w+\s*\(|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))',
            'typescript': r'(?:function\s+\w+\s*\(|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))',
            'java': r'(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+\w+\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{',
            'go': r'func\s+(?:\([^)]*\)\s+)?\w+\s*\(',
        }
        
        pattern = patterns.get(language, patterns['python'])
        return len(re.findall(pattern, content))
    
    def class_count(self, content: str, language: str) -> int:
        """Count the number of classes in a file"""
        patterns = {
            'python': r'class\s+\w+',
            'javascript': r'class\s+\w+',
            'typescript': r'class\s+\w+',
            'java': r'class\s+\w+',
        }
        
        pattern = patterns.get(language, r'class\s+\w+')
        return len(re.findall(pattern, content))
