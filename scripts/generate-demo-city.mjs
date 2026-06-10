/**
 * generate-demo-city.mjs — produces a procedural demo city ~50x larger
 * than the previous static fixture, using the live `buildingTypes` and
 * `colorUtils` so the demo stays in sync with the rendering pipeline.
 *
 * Usage (one-shot):
 *   node scripts/generate-demo-city.mjs
 *
 * Output: /public/demo-city.json
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { classify, dimsFor, typeNameToId } from '../src/widgets/city-viewport/ui/buildingTypes.js'
import { layoutDistricts } from '../src/widgets/city-viewport/ui/cityLayout.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUT = resolve(__dirname, '../public/demo-city.json')

// ── Synthetic file tree ──────────────────────────────────────────────
// 30 directories, each with 100–200 files. ~4500 buildings total.
const DIR_TEMPLATES = [
    { name: 'apps/web/src', files: 220, exts: ['.tsx', '.ts', '.css'] },
    { name: 'apps/api/src/routes', files: 180, exts: ['.ts', '.js'] },
    { name: 'apps/api/src/services', files: 160, exts: ['.ts'] },
    { name: 'apps/api/src/models', files: 130, exts: ['.ts'] },
    { name: 'apps/mobile/src', files: 200, exts: ['.tsx', '.ts'] },
    { name: 'apps/admin/src', files: 140, exts: ['.tsx', '.css'] },
    { name: 'packages/ui/src', files: 180, exts: ['.tsx', '.css'] },
    { name: 'packages/core/src', files: 160, exts: ['.ts'] },
    { name: 'packages/utils/src', files: 110, exts: ['.ts'] },
    { name: 'packages/config/src', files: 90,  exts: ['.ts', '.json', '.yaml'] },
    { name: 'services/auth/src', files: 120, exts: ['.go'] },
    { name: 'services/billing/src', files: 140, exts: ['.go', '.sql'] },
    { name: 'services/notifications/src', files: 100, exts: ['.go'] },
    { name: 'services/analytics/src', files: 130, exts: ['.py'] },
    { name: 'services/search/src', files: 110, exts: ['.rs'] },
    { name: 'services/feed/src', files: 150, exts: ['.go'] },
    { name: 'docs', files: 80, exts: ['.md'] },
    { name: 'scripts', files: 60, exts: ['.sh', '.py'] },
    { name: 'infra/terraform', files: 70, exts: ['.tf', '.yml'] },
    { name: 'infra/k8s', files: 90, exts: ['.yaml'] },
    { name: 'infra/docker', files: 30, exts: ['.dockerfile', '.sh'] },
    { name: 'tests/integration', files: 180, exts: ['.ts', '.js'] },
    { name: 'tests/e2e', files: 120, exts: ['.ts'] },
    { name: 'tests/unit', files: 220, exts: ['.ts', '.js'] },
    { name: 'tools/cli', files: 90, exts: ['.ts', '.go'] },
    { name: 'tools/codegen', files: 70, exts: ['.ts', '.py'] },
    { name: 'libs/database', files: 100, exts: ['.ts', '.sql'] },
    { name: 'libs/cache', files: 80, exts: ['.ts'] },
    { name: 'libs/queue', files: 90, exts: ['.ts', '.go'] },
    { name: 'libs/observability', files: 110, exts: ['.ts', '.go'] },
]

const ROOT_FILES = [
    'README.md', 'LICENSE', 'CONTRIBUTING.md', 'CHANGELOG.md',
    'package.json', 'pnpm-workspace.yaml', '.gitignore',
    'Dockerfile', 'docker-compose.yml', 'tsconfig.json',
    'vite.config.ts', '.eslintrc', '.prettierrc',
]

const AUTHORS = [
    'James Wilson', 'Priya Sharma', 'Diego Garcia', 'Mei Chen', 'Aisha Khan',
    'Liam O\'Connor', 'Sofia Rossi', 'Yuki Tanaka', 'Olu Adeyemi', 'Eva Hansen',
]

const LANG_BY_EXT = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript', '.cjs': 'javascript', '.mjs': 'javascript',
    '.py': 'python', '.go': 'go', '.rs': 'rust',
    '.css': 'css', '.scss': 'css', '.html': 'html',
    '.md': 'markdown', '.yml': 'yaml', '.yaml': 'yaml',
    '.json': 'json', '.sh': 'shell', '.sql': 'sql',
    '.tf': 'terraform', '.dockerfile': 'docker',
}

// Deterministic-ish RNG so successive runs produce the same demo.
let _seed = 1234567
function rand() { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280 }

function logSize() {
    // log-distributed file size: most small (~1-5 KB), some mid, few big.
    return Math.floor(Math.exp(rand() * 9) + 200)
}

// ── Generate flat file list ──────────────────────────────────────────
const sourceFiles = []
for (const f of ROOT_FILES) {
    sourceFiles.push({ path: f, size: 1500 + Math.floor(rand() * 8000) })
}
for (const tpl of DIR_TEMPLATES) {
    for (let i = 0; i < tpl.files; i++) {
        const ext = tpl.exts[i % tpl.exts.length]
        const size = logSize()
        sourceFiles.push({ path: `${tpl.name}/file_${i}${ext}`, size })
    }
}

// ── Group by directory ───────────────────────────────────────────────
const dirGroups = {}
for (const f of sourceFiles) {
    const dir = f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : '(root)'
    if (!dirGroups[dir]) dirGroups[dir] = []
    dirGroups[dir].push(f)
}

// ── Zoned, contiguous layout — shared with the live analyzer ────────
const placements = layoutDistricts(dirGroups)
const dirNames = placements.map(p => p.dir)
const districtCellSizes = placements.map(p => p.cellSize)

const DISTRICT_COLORS = [
    '#5aa8ff', '#ff8b5a', '#5affb4', '#ffd85a', '#b35aff',
    '#ff5aa0', '#5affff', '#ff5a5a', '#a0ff5a', '#5a8aff',
    '#ff5ae0', '#70ff5a', '#5affaa', '#ff9a5a', '#5accff',
]

// ── Build districts ──────────────────────────────────────────────────
const districts = []
const districtMap = {}
placements.forEach((p, idx) => {
    const districtId = `district_${idx}`
    const half = p.cellSize / 2
    districts.push({
        id: districtId,
        name: p.dir,
        color: DISTRICT_COLORS[idx % DISTRICT_COLORS.length],
        center: { x: p.cx, y: p.cz },
        boundary: [
            { x: p.cx - half, y: p.cz - half },
            { x: p.cx + half, y: p.cz - half },
            { x: p.cx + half, y: p.cz + half },
            { x: p.cx - half, y: p.cz + half },
        ],
        building_count: dirGroups[p.dir].length,
    })
    districtMap[p.dir] = districtId
})

// ── Build buildings ──────────────────────────────────────────────────
const maxFileSize = Math.max(...sourceFiles.map(f => f.size))
const buildings = []
const languageCounts = {}

for (let di = 0; di < dirNames.length; di++) {
    const dir = dirNames[di]
    const files = dirGroups[dir]
    const districtId = districtMap[dir]
    const district = districts[di]
    const cellSize = districtCellSizes[di]
    const bcols = Math.ceil(Math.sqrt(files.length))
    const brows = Math.ceil(files.length / bcols)
    const usableSize = cellSize - 36
    const rawSpacing = usableSize / Math.max(bcols, brows)
    const spacing = Math.max(64, rawSpacing)

    files.forEach((file, i) => {
        const ext = file.path.includes('.') ? file.path.slice(file.path.lastIndexOf('.')) : ''
        const lang = LANG_BY_EXT[ext.toLowerCase()] || 'unknown'
        languageCounts[lang] = (languageCounts[lang] || 0) + 1

        const sizeNorm = Math.log2(file.size + 1) / Math.log2(maxFileSize + 1)
        const buildingType = classify(file, sizeNorm)
        const { width, height, depth } = dimsFor(buildingType, sizeNorm)
        const buildingTypeId = typeNameToId(buildingType)

        const fcol = i % bcols
        const frow = Math.floor(i / bcols)
        const x = district.center.x + (fcol - (bcols - 1) / 2) * spacing
        const z = district.center.y + (frow - (brows - 1) / 2) * spacing

        const name = file.path.includes('/') ? file.path.slice(file.path.lastIndexOf('/') + 1) : file.path
        const author = AUTHORS[Math.floor(rand() * AUTHORS.length)]
        const complexity = Math.ceil(1 + file.size / 500)
        const churn = Math.floor(rand() * 12)

        buildings.push({
            id: file.path,
            name,
            path: file.path,
            file_path: file.path,
            language: lang,
            author,
            email: null,
            district_id: districtId,
            directory: dir,
            position: { x, y: 0, z },
            dimensions: { width, height, depth },
            building_type: buildingType,
            building_type_id: buildingTypeId,
            color_metric: sizeNorm,
            coupling_score: 0,
            lines_of_code: Math.ceil(file.size / 40),
            complexity,
            in_degree: 0,
            functions: [],
            classes: [],
            imports: [],
            metrics: {
                size_bytes: file.size,
                loc: Math.ceil(file.size / 40),
                complexity,
                churn,
                commits: Math.floor(rand() * 30),
                age_days: Math.floor(rand() * 400),
                dependencies_in: 0,
                debt: sizeNorm > 0.7 ? sizeNorm : 0,
            },
        })
    })
}

const cityData = {
    id: 'demo_aurora',
    name: 'Aurora — Demo Metropolis',
    path: 'aurora/metropolis',
    status: 'ready',
    source: 'demo',
    branch: 'main',
    buildings,
    districts,
    metrics: {
        total_files: buildings.length,
        total_lines: buildings.reduce((s, b) => s + (b.metrics?.loc || 0), 0),
        languages: languageCounts,
        contributors: AUTHORS.length,
    },
}

writeFileSync(OUT, JSON.stringify(cityData))
console.log(`Wrote ${buildings.length} buildings across ${districts.length} districts → ${OUT}`)
console.log(`File size: ${(JSON.stringify(cityData).length / 1024 / 1024).toFixed(2)} MB`)
