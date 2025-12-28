"""
High-Performance Codebase Analyzer
Optimized for massive repositories (Linux kernel scale)
Uses parallel processing, streaming, and efficient algorithms
"""

import os
import asyncio
from pathlib import Path
from typing import List, Optional, AsyncGenerator
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import subprocess
import multiprocessing

from api.models import CityData, Building, District, Road, BuildingMetrics
from .code_parser import CodeParser
from .metrics import MetricsCalculator
from graph.graph_builder import GraphBuilder
from graph.clustering import ClusteringEngine
from graph.layout import LayoutEngine


# Number of worker processes for CPU-bound tasks
MAX_WORKERS = min(8, multiprocessing.cpu_count())


class CodebaseAnalyzer:
    """High-performance codebase analyzer for massive repositories"""
    
    def __init__(self):
        self.parser = CodeParser()
        self.metrics = MetricsCalculator()
        self.graph_builder = GraphBuilder()
        self.clustering = ClusteringEngine()
        self.layout = LayoutEngine()
        
        # Supported file extensions with language mapping
        self.supported_extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cc': 'cpp',
            '.h': 'c',
            '.hpp': 'cpp',
            '.rb': 'ruby',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.cs': 'csharp',
        }
        
        # Directories to always skip (performance critical)
        self.skip_dirs = frozenset({
            'node_modules', '.git', '__pycache__', 'venv', 'env',
            '.venv', 'dist', 'build', '.next', 'target', 'vendor',
            '.idea', '.vscode', 'coverage', '.pytest_cache',
            'bower_components', '.cache', '.npm', '.yarn',
            'packages', '.tox', 'htmlcov', 'eggs', '.eggs',
            'lib', 'libs', 'third_party', '3rdparty', 'external',
            'doc', 'docs', 'documentation', 'examples', 'samples',
            'test', 'tests', 'testing', '__tests__', 'spec', 'specs',
            'benchmark', 'benchmarks', 'fixtures'
        })
        
        # Files to skip
        self.skip_files = frozenset({
            'package-lock.json', 'yarn.lock', 'Cargo.lock',
            'poetry.lock', 'Gemfile.lock', 'composer.lock'
        })
    
    async def analyze(self, path: str, max_files: int = 5000) -> CityData:
        """
        Analyze a codebase with high performance.
        Handles repositories with thousands of files efficiently.
        """
        root_path = Path(path)
        if not root_path.exists():
            raise FileNotFoundError(f"Path not found: {path}")
        
        print(f"[Analyzer] Starting analysis of {root_path.name}")
        
        # Step 1: Fast file discovery using os.scandir (faster than rglob)
        print("[Analyzer] Discovering files...")
        files = self._fast_discover_files(root_path, max_files)
        print(f"[Analyzer] Found {len(files)} code files")
        
        if len(files) == 0:
            return self._empty_city(root_path.name)
        
        # Step 2: Parallel file parsing with ThreadPool
        print("[Analyzer] Parsing files in parallel...")
        parsed_files = await self._parallel_parse(files, root_path)
        print(f"[Analyzer] Parsed {len(parsed_files)} files successfully")
        
        if len(parsed_files) == 0:
            return self._empty_city(root_path.name)
        
        # Step 3: Build dependency graph (optimized)
        print("[Analyzer] Building dependency graph...")
        graph = self.graph_builder.build(parsed_files)
        print(f"[Analyzer] Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")
        
        # Step 4: Fast clustering (Leiden algorithm)
        print("[Analyzer] Clustering into districts...")
        clusters = await self.clustering.cluster(graph, parsed_files)
        print(f"[Analyzer] Created {len(clusters)} districts")
        
        # Step 5: Generate spatial layout
        print("[Analyzer] Generating city layout...")
        layout_data = self.layout.generate(parsed_files, clusters, graph)
        
        # Step 6: Assemble city data
        print("[Analyzer] Building city structure...")
        city = self._build_city(
            name=root_path.name,
            parsed_files=parsed_files,
            clusters=clusters,
            layout=layout_data,
            graph=graph
        )
        
        print(f"[Analyzer] Complete! City has {len(city.buildings)} buildings")
        return city
    
    def _fast_discover_files(self, root: Path, max_files: int) -> List[Path]:
        """
        Ultra-fast file discovery using os.scandir.
        Much faster than rglob for large directories.
        """
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
                        
                        # Skip hidden files/dirs
                        if name.startswith('.'):
                            continue
                        
                        if entry.is_dir(follow_symlinks=False):
                            # Skip unwanted directories
                            if name.lower() not in self.skip_dirs:
                                stack.append(Path(entry.path))
                        
                        elif entry.is_file(follow_symlinks=False):
                            # Skip unwanted files
                            if name in self.skip_files:
                                continue
                            
                            # Check extension
                            path = Path(entry.path)
                            if path.suffix in self.supported_extensions:
                                # Skip very large files (>500KB)
                                try:
                                    if entry.stat().st_size < 500_000:
                                        files.append(path)
                                except OSError:
                                    pass
            
            except PermissionError:
                continue
            except OSError:
                continue
        
        return files
    
    async def _parallel_parse(self, files: List[Path], root: Path) -> List[dict]:
        """
        Parse files in parallel using ThreadPoolExecutor.
        I/O bound so threads work better than processes.
        """
        parsed = []
        batch_size = 50  # Process in batches for memory efficiency
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            for i in range(0, len(files), batch_size):
                batch = files[i:i + batch_size]
                
                # Parse batch in parallel
                loop = asyncio.get_event_loop()
                futures = [
                    loop.run_in_executor(executor, self._parse_file_sync, f, root)
                    for f in batch
                ]
                
                results = await asyncio.gather(*futures, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, dict):
                        parsed.append(result)
        
        return parsed
    
    def _parse_file_sync(self, file_path: Path, root: Path) -> Optional[dict]:
        """Synchronous file parsing for use in thread pool"""
        try:
            # Read file
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            language = self.supported_extensions.get(file_path.suffix, 'unknown')
            relative_path = str(file_path.relative_to(root)).replace('\\', '/')
            
            # Fast metrics calculation
            lines = content.split('\n')
            loc = len(lines)
            
            # Simplified complexity (count conditionals)
            complexity = self.metrics.cyclomatic_complexity(content, language)
            
            # Get git metrics (with timeout protection)
            age_days = self.metrics.get_file_age(file_path)
            churn = self.metrics.get_file_churn(file_path)
            
            # Extract imports
            imports = self.parser.extract_imports(content, language)
            
            # Hotspot detection
            is_hotspot = complexity > 15 and (churn > 8 or loc > 500)
            
            # Decay level
            decay = min(1.0, age_days / 730)
            
            return {
                'id': relative_path,
                'name': file_path.name,
                'path': relative_path,
                'content': content[:5000],  # Limit content for memory
                'language': language,
                'loc': loc,
                'complexity': complexity,
                'age_days': age_days,
                'churn': churn,
                'imports': imports,
                'is_hotspot': is_hotspot,
                'decay_level': decay
            }
        
        except Exception as e:
            return None
    
    def _empty_city(self, name: str) -> CityData:
        """Return an empty city structure"""
        return CityData(
            name=name,
            buildings=[],
            districts=[],
            roads=[],
            stats={
                'total_files': 0,
                'total_loc': 0,
                'total_districts': 0,
                'total_dependencies': 0,
                'hotspots': 0
            }
        )
    
    def _build_city(
        self,
        name: str,
        parsed_files: List[dict],
        clusters: List[dict],
        layout: dict,
        graph
    ) -> CityData:
        """Assemble the final city data structure"""
        
        # Build buildings
        buildings = []
        for pf in parsed_files:
            pos = layout['positions'].get(pf['id'], {'x': 0, 'y': 0, 'z': 0})
            
            # Scale dimensions with caps for visual consistency
            loc = pf['loc']
            complexity = pf['complexity']
            
            width = max(2, min(10, loc / 100))
            height = max(1, min(25, complexity * 0.8))
            depth = max(2, min(10, loc / 100))
            
            cluster_id = layout['file_clusters'].get(pf['id'], 'default')
            
            buildings.append(Building(
                id=pf['id'],
                name=pf['name'],
                path=pf['path'],
                district_id=cluster_id,
                position=pos,
                dimensions={'width': width, 'height': height, 'depth': depth},
                metrics=BuildingMetrics(
                    loc=pf['loc'],
                    complexity=pf['complexity'],
                    churn=pf.get('churn', 0),
                    age_days=pf.get('age_days', 0),
                    dependencies_in=graph.in_degree(pf['id']) if graph.has_node(pf['id']) else 0,
                    dependencies_out=graph.out_degree(pf['id']) if graph.has_node(pf['id']) else 0
                ),
                language=pf['language'],
                decay_level=pf['decay_level'],
                is_hotspot=pf['is_hotspot']
            ))
        
        # Build districts
        districts = []
        for cluster in clusters:
            districts.append(District(
                id=cluster['id'],
                name=cluster['name'],
                color=cluster['color'],
                center=cluster['center'],
                boundary=cluster['boundary'],
                building_count=cluster['size'],
                description=cluster.get('description')
            ))
        
        # Build roads - limit for performance
        roads = []
        edge_count = 0
        max_edges = 500  # Cap edges for rendering performance
        
        for source, target, data in graph.edges(data=True):
            if edge_count >= max_edges:
                break
            
            src_cluster = layout['file_clusters'].get(source)
            tgt_cluster = layout['file_clusters'].get(target)
            
            roads.append(Road(
                source=source,
                target=target,
                weight=data.get('weight', 1.0),
                path=[],  # Skip paths for performance
                is_cross_district=src_cluster != tgt_cluster
            ))
            edge_count += 1
        
        return CityData(
            name=name,
            buildings=buildings,
            districts=districts,
            roads=roads,
            stats={
                'total_files': len(buildings),
                'total_loc': sum(b.metrics.loc for b in buildings),
                'total_districts': len(districts),
                'total_dependencies': graph.number_of_edges(),
                'hotspots': sum(1 for b in buildings if b.is_hotspot)
            }
        )
