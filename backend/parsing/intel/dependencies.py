"""
Dependency Analyzer
Advanced dependency analysis including patterns, layers, and architecture insights.
"""

from typing import Dict, List, Any, Set, Tuple
from dataclasses import dataclass
from collections import defaultdict
import networkx as nx


@dataclass
class LayerInfo:
    """Information about an architectural layer"""
    name: str
    files: List[str]
    inbound_deps: int
    outbound_deps: int

    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'file_count': len(self.files),
            'inbound_deps': self.inbound_deps,
            'outbound_deps': self.outbound_deps,
            'files': self.files[:10]  # Limit for display
        }


class DependencyAnalyzer:
    """
    Advanced dependency analysis for understanding codebase architecture.

    Features:
    - Layer detection (UI, Business Logic, Data, Utils)
    - Dependency direction analysis
    - Hub detection (files everything depends on)
    - Import pattern analysis
    - Coupling metrics
    """

    # Common layer patterns
    LAYER_PATTERNS = {
        'ui': ['component', 'view', 'page', 'screen', 'ui', 'widget', 'jsx', 'tsx'],
        'api': ['api', 'route', 'controller', 'handler', 'endpoint'],
        'service': ['service', 'manager', 'provider', 'facade'],
        'data': ['model', 'entity', 'schema', 'repository', 'store', 'state'],
        'util': ['util', 'helper', 'common', 'shared', 'lib', 'tools'],
        'config': ['config', 'setting', 'constant', 'env'],
        'test': ['test', 'spec', '__test__', '__tests__']
    }

    def __init__(self, graph: nx.DiGraph, parsed_files: List[Dict]):
        self.graph = graph
        self.parsed_files = parsed_files
        self.file_index = {f['id']: f for f in parsed_files}

    def analyze(self) -> Dict[str, Any]:
        """
        Perform comprehensive dependency analysis.
        """
        layers = self._detect_layers()
        hubs = self._find_hubs()
        coupling = self._calculate_coupling()
        patterns = self._analyze_patterns()
        violations = self._find_layer_violations(layers)

        return {
            'layers': {name: layer.to_dict() for name, layer in layers.items()},
            'hubs': hubs,
            'coupling_metrics': coupling,
            'patterns': patterns,
            'layer_violations': violations,
            'summary': self._generate_summary(layers, hubs, coupling, violations)
        }

    def _detect_layers(self) -> Dict[str, LayerInfo]:
        """Detect architectural layers based on file paths and names"""
        layers = {name: [] for name in self.LAYER_PATTERNS}
        layers['other'] = []

        for file_obj in self.parsed_files:
            path = file_obj.get('path', '').lower()
            name = file_obj.get('name', '').lower()
            file_id = file_obj['id']

            assigned = False
            for layer_name, patterns in self.LAYER_PATTERNS.items():
                if any(p in path or p in name for p in patterns):
                    layers[layer_name].append(file_id)
                    assigned = True
                    break

            if not assigned:
                layers['other'].append(file_id)

        # Calculate dependencies for each layer
        layer_infos = {}
        for layer_name, file_ids in layers.items():
            if not file_ids:
                continue

            inbound = 0
            outbound = 0

            for fid in file_ids:
                if self.graph.has_node(fid):
                    inbound += self.graph.in_degree(fid)
                    outbound += self.graph.out_degree(fid)

            paths = [self.file_index[fid].get('path', fid) for fid in file_ids]
            layer_infos[layer_name] = LayerInfo(
                name=layer_name,
                files=paths,
                inbound_deps=inbound,
                outbound_deps=outbound
            )

        return layer_infos

    def _find_hubs(self) -> List[Dict[str, Any]]:
        """Find hub files that are central to the dependency graph"""
        hubs = []

        for file_id in self.file_index:
            if not self.graph.has_node(file_id):
                continue

            in_degree = self.graph.in_degree(file_id)
            out_degree = self.graph.out_degree(file_id)

            # Hub score: weighted combination of in and out degree
            hub_score = in_degree * 2 + out_degree

            if hub_score > 5:  # Threshold for being a hub
                file_info = self.file_index[file_id]
                hubs.append({
                    'id': file_id,
                    'path': file_info.get('path', ''),
                    'in_degree': in_degree,
                    'out_degree': out_degree,
                    'hub_score': hub_score,
                    'type': self._classify_hub(in_degree, out_degree)
                })

        # Sort by hub score
        hubs.sort(key=lambda h: h['hub_score'], reverse=True)
        return hubs[:15]  # Top 15 hubs

    def _classify_hub(self, in_deg: int, out_deg: int) -> str:
        """Classify hub type based on dependency direction"""
        if in_deg > out_deg * 2:
            return 'provider'  # Many depend on this
        elif out_deg > in_deg * 2:
            return 'consumer'  # This depends on many
        else:
            return 'mediator'  # Both ways

    def _calculate_coupling(self) -> Dict[str, Any]:
        """Calculate coupling metrics for the codebase"""
        if not self.parsed_files:
            return {'afferent': 0, 'efferent': 0, 'instability': 0}

        total_afferent = 0  # Incoming dependencies
        total_efferent = 0  # Outgoing dependencies

        for file_id in self.file_index:
            if self.graph.has_node(file_id):
                total_afferent += self.graph.in_degree(file_id)
                total_efferent += self.graph.out_degree(file_id)

        n_files = len(self.parsed_files)
        avg_afferent = total_afferent / n_files if n_files else 0
        avg_efferent = total_efferent / n_files if n_files else 0

        # Instability metric: I = Ce / (Ca + Ce)
        # 0 = completely stable, 1 = completely unstable
        total = total_afferent + total_efferent
        instability = total_efferent / total if total > 0 else 0

        return {
            'average_afferent': round(avg_afferent, 2),
            'average_efferent': round(avg_efferent, 2),
            'instability': round(instability, 2),
            'total_dependencies': total,
            'coupling_level': self._coupling_level(avg_afferent + avg_efferent)
        }

    def _coupling_level(self, avg_deps: float) -> str:
        """Classify coupling level"""
        if avg_deps < 3:
            return 'loose'
        elif avg_deps < 6:
            return 'moderate'
        elif avg_deps < 10:
            return 'tight'
        else:
            return 'very_tight'

    def _analyze_patterns(self) -> Dict[str, Any]:
        """Analyze common dependency patterns"""
        patterns = {
            'single_file_modules': 0,
            'index_re_exports': 0,
            'utility_imports': 0,
            'cross_feature_imports': 0
        }

        for file_obj in self.parsed_files:
            path = file_obj.get('path', '').lower()
            file_id = file_obj['id']

            # Check for index files (re-export pattern)
            if 'index' in path or '__init__' in path:
                patterns['index_re_exports'] += 1

            # Check for utility imports
            if any(p in path for p in ['util', 'helper', 'common']):
                patterns['utility_imports'] += 1

            # Single file with no dependencies or dependents
            if self.graph.has_node(file_id):
                if self.graph.degree(file_id) == 0:
                    patterns['single_file_modules'] += 1

        return patterns

    def _find_layer_violations(self, layers: Dict[str, LayerInfo]) -> List[Dict[str, Any]]:
        """Find dependency violations between layers"""
        violations = []

        # Define allowed dependencies (lower can depend on higher)
        layer_order = ['ui', 'api', 'service', 'data', 'util', 'config']

        layer_to_files = {}
        file_to_layer = {}

        for layer_name, layer_info in layers.items():
            for file_path in layer_info.files:
                # Find file ID
                for fid, fobj in self.file_index.items():
                    if fobj.get('path') == file_path:
                        file_to_layer[fid] = layer_name
                        break

        # Check for violations
        for file_id, layer in file_to_layer.items():
            if layer not in layer_order:
                continue

            layer_idx = layer_order.index(layer)

            if self.graph.has_node(file_id):
                for dep_id in self.graph.successors(file_id):
                    dep_layer = file_to_layer.get(dep_id)

                    if dep_layer and dep_layer in layer_order:
                        dep_layer_idx = layer_order.index(dep_layer)

                        # Violation: lower layer depends on higher layer
                        # (e.g., data layer imports from UI layer)
                        if dep_layer_idx < layer_idx:
                            file_info = self.file_index.get(file_id, {})
                            dep_info = self.file_index.get(dep_id, {})

                            violations.append({
                                'source_id': file_id,
                                'source': file_info.get('path', file_id),
                                'source_layer': layer,
                                'target_id': dep_id,
                                'target': dep_info.get('path', dep_id),
                                'target_layer': dep_layer,
                                'violation_type': f"{layer} → {dep_layer}"
                            })

        return violations[:20]  # Limit

    def _generate_summary(
        self,
        layers: Dict[str, LayerInfo],
        hubs: List[Dict],
        coupling: Dict[str, Any],
        violations: List[Dict]
    ) -> Dict[str, Any]:
        """Generate summary of dependency analysis"""
        return {
            'total_files': len(self.parsed_files),
            'total_layers': len([l for l in layers.values() if l.files]),
            'top_hub': hubs[0]['path'] if hubs else None,
            'coupling_level': coupling.get('coupling_level', 'unknown'),
            'violation_count': len(violations),
            'health': self._assess_health(coupling, violations),
            'insights': self._generate_insights(layers, hubs, coupling, violations)
        }

    def _assess_health(self, coupling: Dict, violations: List) -> str:
        """Assess overall dependency health"""
        issues = 0

        if coupling.get('instability', 0) > 0.7:
            issues += 2
        elif coupling.get('instability', 0) > 0.5:
            issues += 1

        if coupling.get('coupling_level') in ['tight', 'very_tight']:
            issues += 1

        if len(violations) > 5:
            issues += 2
        elif len(violations) > 0:
            issues += 1

        if issues == 0:
            return 'excellent'
        elif issues <= 2:
            return 'good'
        elif issues <= 4:
            return 'fair'
        else:
            return 'needs_attention'

    def _generate_insights(
        self,
        layers: Dict[str, LayerInfo],
        hubs: List[Dict],
        coupling: Dict[str, Any],
        violations: List[Dict]
    ) -> List[str]:
        """Generate actionable insights"""
        insights = []

        # Hub insights
        if hubs:
            top_hub = hubs[0]
            if top_hub['hub_score'] > 20:
                insights.append(
                    f"⚠️ '{top_hub['path']}' is a super-hub with {top_hub['in_degree']} dependents. "
                    f"Changes here affect many files."
                )

        # Coupling insights
        if coupling.get('coupling_level') == 'very_tight':
            insights.append(
                "🔴 Very tight coupling detected. Consider extracting shared utilities."
            )
        elif coupling.get('coupling_level') == 'tight':
            insights.append(
                "🟡 Tight coupling detected. Review dependency directions."
            )

        # Layer insights
        ui_layer = layers.get('ui')
        if ui_layer and ui_layer.outbound_deps > ui_layer.inbound_deps * 2:
            insights.append(
                "💡 UI layer has many outbound dependencies. Consider using dependency injection."
            )

        # Violations
        if len(violations) > 0:
            insights.append(
                f"🏗️ Found {len(violations)} layer violations. Review architecture boundaries."
            )

        if not insights:
            insights.append("✅ Dependency structure looks healthy!")

        return insights
