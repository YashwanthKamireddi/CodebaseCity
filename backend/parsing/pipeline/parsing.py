import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Dict, Optional
from .base import PipelineStep, PipelineContext
from parsing.code_parser import CodeParser
from parsing.metrics import MetricsCalculator

class ParsingStep(PipelineStep):
    """
    Step 2: Parse file contents and calculate basic metrics in parallel.
    """

    def __init__(self):
        self.parser = CodeParser()
        self.metrics = MetricsCalculator()
        self.supported_extensions = {
            '.py': 'python', '.js': 'javascript', '.jsx': 'javascript',
            '.ts': 'typescript', '.tsx': 'typescript', '.java': 'java',
            '.go': 'go', '.rs': 'rust', '.cpp': 'cpp', '.c': 'c'
        }

    async def execute(self, context: PipelineContext) -> PipelineContext:
        print("[Pipeline] Parsing files...")
        context.parsed_files = await self._parallel_parse(context.files, Path(context.root_path))
        return context

    async def _parallel_parse(self, files: List[Path], root: Path) -> List[Dict]:
        parsed = []
        batch_size = 50
        max_workers = 8

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for i in range(0, len(files), batch_size):
                batch = files[i:i + batch_size]
                loop = asyncio.get_event_loop()

                futures = [
                    loop.run_in_executor(executor, self._parse_file_sync, f, root)
                    for f in batch
                ]

                results = await asyncio.gather(*futures, return_exceptions=True)
                for res in results:
                    if isinstance(res, dict):
                        parsed.append(res)
        return parsed

    def _parse_file_sync(self, file_path: Path, root: Path) -> Optional[Dict]:
        try:
            # Get file size first
            file_size = file_path.stat().st_size

            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            language = self.supported_extensions.get(file_path.suffix, 'unknown')
            relative_path = str(file_path.relative_to(root)).replace('\\', '/')

            lines = content.split('\n')
            loc = len(lines)
            complexity = self.metrics.cyclomatic_complexity(content, language)

            # These can be slow, maybe optional?
            age_days = self.metrics.get_file_age(file_path)
            churn = self.metrics.get_file_churn(file_path)

            imports = self.parser.extract_imports(content, language)
            classes = self.parser.extract_classes(content, language)
            functions = self.parser.extract_functions(content, language)

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
        except Exception as e:
            # print(f"Parse error {file_path}: {e}")
            return None
