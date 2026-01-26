import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Dict
from .base import PipelineStep, PipelineContext
import subprocess

class GitMetaStep(PipelineStep):
    """
    Step 3: Extract Git Metadata (Author, Timestamp) for each file.
    Critial for 'Social City' and 'Time Travel'.
    """

    async def execute(self, context: PipelineContext) -> PipelineContext:
        print("[Pipeline] Extracting Git metadata...")

        # Only run if it's a git repo
        if not (Path(context.root_path) / ".git").exists():
            print("[Pipeline] No .git directory found. Skipping Git metadata.")
            return context

        context.parsed_files = await self._parallel_git_info(context.parsed_files, Path(context.root_path))
        return context

    async def _parallel_git_info(self, parsed_files: List[Dict], root: Path) -> List[Dict]:
        updated_files = []
        batch_size = 50
        max_workers = 8

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for i in range(0, len(parsed_files), batch_size):
                batch = parsed_files[i:i + batch_size]
                loop = asyncio.get_event_loop()

                futures = [
                    loop.run_in_executor(executor, self._get_git_info, pf, root)
                    for pf in batch
                ]

                results = await asyncio.gather(*futures, return_exceptions=True)
                for res in results:
                     if isinstance(res, dict):
                         updated_files.append(res)

        return updated_files

    def _get_git_info(self, file_data: Dict, root: Path) -> Dict:
        """Enrich file_data with git info"""
        try:
            abs_path = root / file_data['path']
            # Format: AuthorName|AuthorEmail|Timestamp
            result = subprocess.run(
                ['git', 'log', '-1', '--format=%an|%ae|%ct', str(abs_path)],
                capture_output=True,
                text=True,
                cwd=root
            )

            if result.returncode == 0 and result.stdout.strip():
                parts = result.stdout.strip().split('|')
                if len(parts) >= 3:
                     file_data['author'] = parts[0]
                     file_data['email'] = parts[1]
                     file_data['last_modified'] = int(parts[2])
            else:
                 # Fallback
                 file_data['author'] = 'Unknown'
                 file_data['email'] = ''
                 file_data['last_modified'] = 0

        except Exception:
            file_data['author'] = 'Unknown'
            file_data['email'] = ''
            file_data['last_modified'] = 0

        return file_data
