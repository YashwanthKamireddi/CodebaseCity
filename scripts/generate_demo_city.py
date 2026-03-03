import json
import random
import math

def generate_demo_city():
    districts = [
        "src/core/auth", "src/core/db", "src/core/network", "src/core/crypto",
        "src/api/routes", "src/api/middleware", "src/api/controllers",
        "src/ui/components", "src/ui/hooks", "src/ui/styles", "src/ui/pages",
        "src/utils/math", "src/utils/format", "src/utils/validation",
        "src/workers/background", "src/workers/queue", "src/workers/cache",
        "tests/unit", "tests/integration", "tests/e2e", "scripts/deploy"
    ]

    languages = ['javascript', 'typescript', 'python', 'go', 'rust', 'css', 'json']
    authors = ['Yash Kamireddi', 'Alex Chen', 'Sarah Jenkins', 'Miguel Santos', 'Bot-Auto', 'Emma Watson']

    buildings = []
    edges = []

    file_id_counter = 1

    # 1. Generate Buildings
    for district in districts:
        num_buildings = random.randint(4, 12)
        lang = random.choice(languages)

        # Determine district center in a wide spiral layout
        d_idx = districts.index(district)
        phi = (1 + math.sqrt(5)) / 2
        r = 30 * math.sqrt(d_idx * 5)
        theta = d_idx * 2 * math.pi / (phi * phi)
        cx = r * math.cos(theta)
        cz = r * math.sin(theta)

        for i in range(num_buildings):
            fid = f"b_{file_id_counter}"
            file_id_counter += 1

            # Organic building positions within district
            bx = cx + random.uniform(-15, 15)
            bz = cz + random.uniform(-15, 15)

            complexity = random.randint(2, 50)
            deps_in = random.randint(0, 15)
            deps_out = random.randint(0, 8)

            # Dimensions logic from the fixed analyzer
            height = max(2, min(40, 3 + 8 * math.log2(1 + complexity)))
            girth = max(3, min(12, 3 + math.log2(1 + deps_in) * 3))

            buildings.append({
                "id": fid,
                "name": f"Module_{fid}.{lang[:2]}",
                "path": f"{district}/Module_{fid}.{lang[:2]}",
                "district_id": district,
                "position": {"x": bx, "y": 0, "z": bz},
                "dimensions": {"width": girth, "height": height, "depth": girth},
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
                "last_modified": "2023-10-25T14:32:00Z"
            })

    # 2. Generate Dependencies (Edges)
    # Give it a realistic shape: UI depends on Core/API, Core depends on DB
    core_files = [b['id'] for b in buildings if 'core' in b['district_id']]
    api_files = [b['id'] for b in buildings if 'api' in b['district_id']]
    ui_files = [b['id'] for b in buildings if 'ui' in b['district_id']]
    other_files = [b['id'] for b in buildings if b['id'] not in core_files + api_files + ui_files]

    # UI -> API
    for uf in ui_files:
        if random.random() > 0.3 and api_files:
            target = random.choice(api_files)
            edges.append({"source": uf, "target": target, "type": "imports"})

    # API -> Core
    for af in api_files:
        if random.random() > 0.2 and core_files:
            target = random.choice(core_files)
            edges.append({"source": af, "target": target, "type": "imports"})

    # Random across all
    for b in buildings:
        if random.random() > 0.8:
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

    with open('/home/yash/Projects/Code_City/frontend/public/demo-city.json', 'w') as f:
        json.dump(city_data, f, indent=2)

    print(f"✅ Generated demo city with {len(buildings)} buildings and {len(edges)} roads")

if __name__ == '__main__':
    generate_demo_city()
