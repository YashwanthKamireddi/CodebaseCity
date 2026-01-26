import os
from pathlib import Path
from typing import List, Set
from .base import PipelineStep, PipelineContext

class DiscoveryStep(PipelineStep):
    """
    Step 1: Rapidly discover code files in the directory.
    Uses iterative filtering for speed.
    """

    # Configuration (Could be injected)
    SKIP_DIRS = frozenset({
        'node_modules', '.git', '__pycache__', 'venv', 'env',
        '.venv', 'dist', 'build', '.next', 'target', 'vendor',
        '.idea', '.vscode', 'coverage', '.pytest_cache',
        'bower_components', '.cache', '.npm', '.yarn',
        'packages', '.tox', 'htmlcov', 'lib', 'libs', 'docs'
    })

    SUPPORTED_EXTENSIONS = {
        '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go', '.rs',
        '.cpp', '.c', '.cc', '.h', '.hpp', '.rb', '.php',
        '.swift', '.kt', '.scala', '.cs'
    }

    async def execute(self, context: PipelineContext) -> PipelineContext:
        print(f"[Pipeline] Discovery started for {context.root_path}...")

        context.files = self._fast_discover_files(
            Path(context.root_path),
            context.max_files
        )

        print(f"[Pipeline] Found {len(context.files)} valid code files.")
        return context

    def _fast_discover_files(self, root: Path, max_files: int) -> List[Path]:
        files = []
        stack = [root]

        while stack and len(files) < max_files:
            try:
                current = stack.pop()
                with os.scandir(current) as entries:
                    for entry in entries:
                        if len(files) >= max_files:
                            break

                        name = entry.name
                        if name.startswith('.'): continue

                        if entry.is_dir(follow_symlinks=False):
                            if name.lower() not in self.SKIP_DIRS:
                                stack.append(Path(entry.path))

                        elif entry.is_file(follow_symlinks=False):
                            path = Path(entry.path)
                            if path.suffix in self.SUPPORTED_EXTENSIONS:
                                try:
                                    if entry.stat().st_size < 500_000: # 500KB Limit
                                        files.append(path)
                                except OSError:
                                    pass
            except (PermissionError, OSError):
                continue

        return files
