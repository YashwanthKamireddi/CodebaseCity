"""
Layout Engine - Generate 2D/3D positions for the city using Voronoi tessellation
"""

import math
import random
from typing import List, Dict, Any, Tuple
import networkx as nx

try:
    from scipy.spatial import Voronoi
    import numpy as np
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


class LayoutEngine:
    """Generate city layout with districts and building positions"""
    
    def __init__(self):
        self.city_size = 500  # Total city dimension
        self.building_spacing = 8  # Min space between buildings
    
    def generate(
        self,
        parsed_files: List[Dict],
        clusters: List[Dict],
        graph: nx.DiGraph
    ) -> Dict[str, Any]:
        """
        Generate complete layout for the city.
        Returns positions, district boundaries, and edge paths.
        """
        # Step 1: Position districts
        district_positions = self._layout_districts(clusters)
        
        # Step 2: Position buildings within districts
        file_positions = self._layout_buildings(parsed_files, clusters, district_positions)
        
        # Step 3: Generate district boundaries using Voronoi
        district_boundaries = self._generate_boundaries(clusters, district_positions)
        
        # Step 4: Bundle edges for roads
        edge_paths = self._bundle_edges(graph, file_positions, clusters)
        
        # Step 5: Map files to clusters
        file_clusters = {}
        for cluster in clusters:
            for file_id in cluster.get('files', []):
                file_clusters[file_id] = cluster['id']
        
        # Update cluster centers and boundaries
        for i, cluster in enumerate(clusters):
            if cluster['id'] in district_positions:
                cluster['center'] = district_positions[cluster['id']]
            if cluster['id'] in district_boundaries:
                cluster['boundary'] = district_boundaries[cluster['id']]
        
        return {
            'positions': file_positions,
            'district_positions': district_positions,
            'district_boundaries': district_boundaries,
            'edge_paths': edge_paths,
            'file_clusters': file_clusters
        }
    
    def _layout_districts(self, clusters: List[Dict]) -> Dict[str, Dict[str, float]]:
        """Position district centers using force-directed layout"""
        positions = {}
        n_clusters = len(clusters)
        
        if n_clusters == 0:
            return positions
        
        if n_clusters == 1:
            positions[clusters[0]['id']] = {'x': 0, 'y': 0}
            return positions
        
        # Arrange in a circle with some randomization
        radius = self.city_size / 3
        angle_step = 2 * math.pi / n_clusters
        
        for i, cluster in enumerate(clusters):
            angle = i * angle_step + random.uniform(-0.2, 0.2)
            
            # Weight by cluster size
            size_factor = min(2.0, 1 + cluster['size'] / 20)
            r = radius * size_factor * 0.7
            
            x = r * math.cos(angle)
            y = r * math.sin(angle)
            
            positions[cluster['id']] = {'x': x, 'y': y}
        
        return positions
    
    def _layout_buildings(
        self,
        parsed_files: List[Dict],
        clusters: List[Dict],
        district_positions: Dict[str, Dict[str, float]]
    ) -> Dict[str, Dict[str, float]]:
        """Position buildings within their districts"""
        positions = {}
        
        # Create a mapping from file to cluster
        file_to_cluster = {}
        for cluster in clusters:
            for file_id in cluster.get('files', []):
                file_to_cluster[file_id] = cluster['id']
        
        # Group files by cluster
        cluster_files: Dict[str, List[Dict]] = {}
        for pf in parsed_files:
            cluster_id = file_to_cluster.get(pf['id'], 'default')
            if cluster_id not in cluster_files:
                cluster_files[cluster_id] = []
            cluster_files[cluster_id].append(pf)
        
        # Position files within each cluster
        for cluster_id, files in cluster_files.items():
            center = district_positions.get(cluster_id, {'x': 0, 'y': 0})
            
            # Calculate grid size for this cluster
            n_files = len(files)
            grid_size = math.ceil(math.sqrt(n_files))
            cell_size = self.building_spacing * 2
            
            # Offset to center the grid
            offset_x = center['x'] - (grid_size * cell_size) / 2
            offset_y = center['y'] - (grid_size * cell_size) / 2
            
            for i, pf in enumerate(files):
                row = i // grid_size
                col = i % grid_size
                
                # Add some jitter for organic look
                jitter_x = random.uniform(-cell_size/4, cell_size/4)
                jitter_y = random.uniform(-cell_size/4, cell_size/4)
                
                positions[pf['id']] = {
                    'x': offset_x + col * cell_size + jitter_x,
                    'y': 0,  # Ground level
                    'z': offset_y + row * cell_size + jitter_y
                }
        
        return positions
    
    def _generate_boundaries(
        self,
        clusters: List[Dict],
        district_positions: Dict[str, Dict[str, float]]
    ) -> Dict[str, List[Dict[str, float]]]:
        """Generate Voronoi boundaries for districts"""
        boundaries = {}
        
        if len(clusters) < 3 or not HAS_SCIPY:
            # Not enough points for Voronoi, use simple squares
            for cluster in clusters:
                center = district_positions.get(cluster['id'], {'x': 0, 'y': 0})
                size = 30 + cluster['size'] * 2
                
                boundaries[cluster['id']] = [
                    {'x': center['x'] - size, 'y': center['y'] - size},
                    {'x': center['x'] + size, 'y': center['y'] - size},
                    {'x': center['x'] + size, 'y': center['y'] + size},
                    {'x': center['x'] - size, 'y': center['y'] + size}
                ]
            return boundaries
        
        # Prepare points for Voronoi
        points = []
        cluster_order = []
        for cluster in clusters:
            pos = district_positions.get(cluster['id'])
            if pos:
                points.append([pos['x'], pos['y']])
                cluster_order.append(cluster['id'])
        
        if len(points) < 3:
            return boundaries
        
        points = np.array(points)
        
        # Add bounding box points
        margin = self.city_size * 2
        bounding = np.array([
            [-margin, -margin],
            [margin, -margin],
            [margin, margin],
            [-margin, margin]
        ])
        extended_points = np.vstack([points, bounding])
        
        try:
            vor = Voronoi(extended_points)
            
            # Extract regions for original points
            for i, cluster_id in enumerate(cluster_order):
                region_idx = vor.point_region[i]
                region = vor.regions[region_idx]
                
                if -1 not in region and len(region) > 0:
                    vertices = [
                        {'x': float(vor.vertices[v][0]), 'y': float(vor.vertices[v][1])}
                        for v in region
                    ]
                    # Clip to city bounds
                    vertices = self._clip_polygon(vertices)
                    boundaries[cluster_id] = vertices
                else:
                    # Fallback for infinite regions
                    center = district_positions.get(cluster_id, {'x': 0, 'y': 0})
                    size = 40
                    boundaries[cluster_id] = [
                        {'x': center['x'] - size, 'y': center['y'] - size},
                        {'x': center['x'] + size, 'y': center['y'] - size},
                        {'x': center['x'] + size, 'y': center['y'] + size},
                        {'x': center['x'] - size, 'y': center['y'] + size}
                    ]
        except Exception as e:
            print(f"Voronoi error: {e}")
        
        return boundaries
    
    def _clip_polygon(self, vertices: List[Dict[str, float]]) -> List[Dict[str, float]]:
        """Clip polygon to city bounds"""
        limit = self.city_size
        clipped = []
        for v in vertices:
            clipped.append({
                'x': max(-limit, min(limit, v['x'])),
                'y': max(-limit, min(limit, v['y']))
            })
        return clipped
    
    def _bundle_edges(
        self,
        graph: nx.DiGraph,
        positions: Dict[str, Dict[str, float]],
        clusters: List[Dict]
    ) -> Dict[Tuple[str, str], List[Dict[str, float]]]:
        """Create bundled edge paths for roads"""
        edge_paths = {}
        
        # Create file to cluster mapping
        file_to_cluster = {}
        for cluster in clusters:
            for file_id in cluster.get('files', []):
                file_to_cluster[file_id] = cluster['id']
        
        for source, target in graph.edges():
            if source not in positions or target not in positions:
                continue
            
            src_pos = positions[source]
            tgt_pos = positions[target]
            
            # Check if cross-district
            src_cluster = file_to_cluster.get(source)
            tgt_cluster = file_to_cluster.get(target)
            is_cross_district = src_cluster != tgt_cluster
            
            if is_cross_district:
                # Add control points for curved path
                mid_x = (src_pos['x'] + tgt_pos['x']) / 2
                mid_z = (src_pos['z'] + tgt_pos['z']) / 2
                
                # Lift cross-district roads
                path = [
                    {'x': src_pos['x'], 'y': 2, 'z': src_pos['z']},
                    {'x': mid_x, 'y': 15, 'z': mid_z},  # Elevated midpoint
                    {'x': tgt_pos['x'], 'y': 2, 'z': tgt_pos['z']}
                ]
            else:
                # Ground-level direct path
                path = [
                    {'x': src_pos['x'], 'y': 0.5, 'z': src_pos['z']},
                    {'x': tgt_pos['x'], 'y': 0.5, 'z': tgt_pos['z']}
                ]
            
            edge_paths[(source, target)] = path
        
        return edge_paths
