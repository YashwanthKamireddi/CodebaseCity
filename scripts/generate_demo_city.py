import json
import random
import math
import os
import sys

def generate_demo_city():
    """
    Generate demo city matching the backend LayoutEngine's output structure.

    Real repos analyzed by the backend typically produce:
    - Many districts (30-80), most with 1-3 files, a few with 4-6
    - District centers on golden-ratio spiral at spacing 25 * sqrt(i)
    - Buildings within districts on spiral at spacing 18 * sqrt(i)
    - Total city span ~400-500 units
    """

    # Realistic directory structure (each becomes a Leiden cluster / district)
    # Mirrors what the backend clustering produces: many small clusters
    district_templates = [
        # Core (few files each — typical isolated modules)
        ("src/core/auth", 3),
        ("src/core/db", 2),
        ("src/core/network", 4),
        ("src/core/crypto", 2),
        ("src/core/config", 1),
        ("src/core/logger", 1),
        ("src/core/events", 2),
        ("src/core/cache", 1),
        # API (small controllers)
        ("src/api/routes", 5),
        ("src/api/middleware", 3),
        ("src/api/controllers", 4),
        ("src/api/validators", 2),
        ("src/api/errors", 1),
        # UI (components tend to cluster in small groups)
        ("src/ui/components/layout", 3),
        ("src/ui/components/forms", 4),
        ("src/ui/components/cards", 2),
        ("src/ui/components/modals", 2),
        ("src/ui/hooks", 3),
        ("src/ui/styles", 1),
        ("src/ui/pages/home", 2),
        ("src/ui/pages/dashboard", 3),
        ("src/ui/pages/settings", 2),
        ("src/ui/pages/auth", 2),
        # Utils (mostly singletons)
        ("src/utils/math", 1),
        ("src/utils/format", 1),
        ("src/utils/validation", 2),
        ("src/utils/helpers", 1),
        ("src/utils/constants", 1),
        # Services
        ("src/services/user", 2),
        ("src/services/payment", 3),
        ("src/services/email", 1),
        ("src/services/analytics", 2),
        ("src/services/storage", 1),
        # Workers
        ("src/workers/queue", 2),
        ("src/workers/scheduler", 1),
        ("src/workers/cache", 1),
        # Tests (small clusters)
        ("tests/unit/core", 2),
        ("tests/unit/api", 3),
        ("tests/unit/ui", 2),
        ("tests/integration", 2),
        ("tests/e2e", 1),
        # Config / Root files (singletons typical in real repos)
        ("config", 1),
        ("scripts/deploy", 1),
        ("scripts/build", 1),
        ("docs", 1),
    ]

    languages = ['javascript', 'typescript', 'python', 'go', 'rust', 'css', 'json']
    authors = ['Yash Kamireddi', 'Alex Chen', 'Sarah Jenkins', 'Miguel Santos', 'Bot-Auto', 'Emma Watson']

    buildings = []
    edges = []

    file_id_counter = 1
    phi = (1 + math.sqrt(5)) / 2

    # Sort by size descending (largest cluster in center — matches backend)
    sorted_districts = sorted(district_templates, key=lambda d: d[1], reverse=True)

    # 1. Generate Buildings
    for d_idx, (district, num_buildings) in enumerate(sorted_districts):
        lang = random.choice(languages)

        # District center: golden-ratio spiral — exact same as backend LayoutEngine
        r = 35 * math.sqrt(d_idx)
        theta = d_idx * 2 * math.pi / (phi * phi)
        noise_r = random.uniform(-3, 3)
        noise_theta = random.uniform(-0.1, 0.1)
        cx = (r + noise_r) * math.cos(theta + noise_theta)
        cz = (r + noise_r) * math.sin(theta + noise_theta)

        for i in range(num_buildings):
            fid = f"b_{file_id_counter}"
            file_id_counter += 1

            # Building position: spiral within district — exact same as backend
            local_r = 24 * math.sqrt(i)
            local_theta = i * 2 * math.pi / (phi * phi)
            jitter = random.uniform(-1, 1)
            bx = cx + local_r * math.cos(local_theta) + jitter
            bz = cz + local_r * math.sin(local_theta) + jitter

            # Distribution: 5% massive monoliths, 15% mid-sized services, 80% tiny utilities
            roll = random.random()
            if roll < 0.05:
                complexity = random.randint(150, 400)
                deps_in = random.randint(30, 100)
                churn = random.randint(70, 100)
                age_days = random.randint(1000, 3000)
            elif roll < 0.20:
                complexity = random.randint(30, 100)
                deps_in = random.randint(10, 35)
                churn = random.randint(30, 80)
                age_days = random.randint(300, 1500)
            else:
                complexity = random.randint(2, 25)
                deps_in = random.randint(0, 8)
                churn = random.randint(0, 40)
                age_days = random.randint(10, 500)

            deps_out = random.randint(0, 8)

            # Dimensions — exponential scaling for epic skyline contrasts
            height = max(2, min(90, 4 + math.log2(1 + complexity) * 10))
            girth = max(3, min(20, 3 + math.log2(1 + deps_in) * 4))

            classes = []
            if lang in ['typescript', 'python', 'javascript']:
                for c in range(random.randint(0, 3)):
                    classes.append({"name": f"Class_{fid}_{c}", "line": random.randint(10, 100)})

            functions = []
            if lang in ['typescript', 'python', 'javascript', 'go', 'rust']:
                for f_idx in range(random.randint(1, 8)):
                    functions.append({"name": f"handle_{fid}_{f_idx}", "line": random.randint(10, 200)})

            exports = [f"export_{fid}_{x}" for x in range(random.randint(0, 4))]

            buildings.append({
                "id": fid,
                "name": f"Module_{fid}.{lang[:2]}",
                "path": f"{district}/Module_{fid}.{lang[:2]}",
                "district_id": f"district_{d_idx}",
                "position": {"x": round(bx, 1), "y": 0, "z": round(bz, 1)},
                "dimensions": {"width": round(girth, 1), "height": round(height, 1), "depth": round(girth, 1)},
                "metrics": {
                    "loc": random.randint(50, 1500),
                    "complexity": complexity,
                    "churn": random.randint(0, 100),
                    "age_days": random.randint(1, 1000),
                    "dependencies_in": deps_in,
                    "dependencies_out": deps_out,
                    "size_bytes": random.randint(1000, 50000)
                },
                "language": lang,
                "author": random.choice(authors),
                "email": "dev@codebase.city",
                "last_modified": "2023-10-25T14:32:00Z",
                "classes": classes,
                "functions": functions,
                "exports": exports
            })

    # 2. Generate Dependencies (Edges) — realistic dependency flow
    core_files = [b['id'] for b in buildings if 'core' in b['path']]
    api_files = [b['id'] for b in buildings if 'api' in b['path']]
    ui_files = [b['id'] for b in buildings if 'ui' in b['path']]
    service_files = [b['id'] for b in buildings if 'services' in b['path']]

    # UI -> API
    for uf in ui_files:
        if random.random() > 0.4 and api_files:
            edges.append({"source": uf, "target": random.choice(api_files), "type": "imports"})

    # API -> Services
    for af in api_files:
        if random.random() > 0.3 and service_files:
            edges.append({"source": af, "target": random.choice(service_files), "type": "imports"})

    # Services -> Core
    for sf in service_files:
        if random.random() > 0.3 and core_files:
            edges.append({"source": sf, "target": random.choice(core_files), "type": "imports"})

    # API -> Core
    for af in api_files:
        if random.random() > 0.4 and core_files:
            edges.append({"source": af, "target": random.choice(core_files), "type": "imports"})

    # Random sparse cross-dependencies
    for b in buildings:
        if random.random() > 0.85:
            target = random.choice(buildings)['id']
            if target != b['id']:
                edges.append({"source": b['id'], "target": target, "type": "imports"})

    city_data = {
        "id": "demo_react_app",
        "name": "Codebase City Engine DEMO",
        "path": "demo/react-starter",
        "status": "ready",
        "git_metadata": {
            "branch": "main",
            "last_commit": "abcdef1234567890",
            "commit_msg": "Initial demo city commit"
        },
        "buildings": buildings,
        "roads": edges,
        "metadata": {
            "total_files": len(buildings),
            "total_loc": sum(b['metrics']['loc'] for b in buildings),
            "dominant_language": "javascript",
            "issues": {
                "god_objects": [random.choice(buildings)['id'] for _ in range(3)],
                "circular_dependencies": [[random.choice(buildings)['id'], random.choice(buildings)['id']]]
            }
        }
    }

    # Get the directory of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_path = os.path.join(project_root, 'frontend', 'public', 'demo-city.json')

    with open(output_path, 'w') as f:
        json.dump(city_data, f, indent=2)

    sys.stderr.write(f"✅ Generated demo city with {len(buildings)} buildings and {len(edges)} roads\n")

if __name__ == '__main__':
    generate_demo_city()
