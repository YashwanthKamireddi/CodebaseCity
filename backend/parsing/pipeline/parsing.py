import asyncio
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import List, Dict, Optional
import multiprocessing
import os
from .base import PipelineStep, PipelineContext

def parse_file_worker(file_args) -> Optional[Dict]:
    """Module-level worker to ensure safe pickling for ProcessPoolExecutor"""
    file_path, root = file_args

    from parsing.code_parser import CodeParser
    from parsing.metrics import MetricsCalculator
    parser = CodeParser()
    metrics = MetricsCalculator()

    supported_extensions = {
        '.py': 'python', '.js': 'javascript', '.jsx': 'javascript',
        '.ts': 'typescript', '.tsx': 'typescript', '.java': 'java',
        '.go': 'go', '.rs': 'rust', '.cpp': 'cpp', '.c': 'c'
    }

    try:
        file_size = file_path.stat().st_size
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        language = supported_extensions.get(file_path.suffix, 'unknown')
        relative_path = str(file_path.relative_to(root)).replace('\\', '/')

        lines = content.split('\n')
        loc = len(lines)
        complexity = metrics.cyclomatic_complexity(content, language)

        age_days = metrics.get_file_age(file_path)
        churn = metrics.get_file_churn(file_path)

        imports = parser.extract_imports(content, language)
        classes = parser.extract_classes(content, language)
        functions = parser.extract_functions(content, language)

        is_hotspot = complexity > 15 and (churn > 8 or loc > 500)
        decay = min(1.0, age_days / 730)

        return {
            'id': relative_path,
            'name': file_path.name,
            'path': relative_path,
            'content': content[:10000],
            'language': language,
            'loc': loc,
            'complexity': complexity,
            'age_days': age_days,
            'churn': churn,
            'imports': imports,
            'classes': classes,
            'functions': functions,
            'is_hotspot': is_hotspot,
            'decay_level': decay,
            'size_bytes': file_size
        }
    except Exception:
        return None

class ParsingStep(PipelineStep):
    """
    Step 2: Parse file contents and calculate basic metrics in parallel using Processes to bypass GIL.
    """

    async def execute(self, context: PipelineContext) -> PipelineContext:
        print("[Pipeline] Parsing files across multiple CPU cores...")
        # Await the processing which runs in a thread wrapping the process pool
        context.parsed_files = await self._parallel_parse(context.files, Path(context.root_path))
        return context

    async def _parallel_parse(self, files: List[Path], root: Path) -> List[Dict]:
        parsed = []
        max_workers = max(1, multiprocessing.cpu_count() - 1)

        # Prepare arguments as tuples for map
        args_list = [(f, root) for f in files]

        loop = asyncio.get_event_loop()

        # Run process pool mapping in a thread to not block the asyncio event loop
        def run_pool():
            with ProcessPoolExecutor(max_workers=max_workers) as executor:
                return list(executor.map(parse_file_worker, args_list))

        results = await loop.run_in_executor(None, run_pool)

        for res in results:
            if isinstance(res, dict):
                parsed.append(res)

        return parsed
