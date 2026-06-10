/**
 * buildingTypes — the city's zoning grammar.
 *
 * Every building maps to one of six TYPES based on its file character.
 * Each type has its own visible silhouette (set in InstancedCity Phase 2)
 * and its own dimension band (enforced by `dimsFor`).
 *
 * The taxonomy IS the city policy: a townhouse cannot become a tower
 * just because the file is large — its category caps its height.
 *
 * Type → numeric id (used by the PulseMaterial shader's `aBuildingType`
 * attribute and by per-type accent meshes):
 *   0  tower     — very large source files, hero silhouettes
 *   1  office    — regular source files, the city's bulk
 *   2  civic     — README, LICENSE, top-level docs
 *   3  mall      — UI/markup/style files, low and wide
 *   4  workshop  — build/script/config files, industrial
 *   5  townhouse — small source files, residential cluster
 */

export const TYPE_NAMES = [
    'tower',
    'office',
    'civic',
    'mall',
    'workshop',
    'townhouse',
]

export const TYPE_TOWER = 0
export const TYPE_OFFICE = 1
export const TYPE_CIVIC = 2
export const TYPE_MALL = 3
export const TYPE_WORKSHOP = 4
export const TYPE_TOWNHOUSE = 5

const NAME_TO_ID = Object.fromEntries(TYPE_NAMES.map((n, i) => [n, i]))

export function typeNameToId(name) {
    return NAME_TO_ID[name] ?? TYPE_OFFICE
}

// File-extension classification. Extension → preferred type, regardless
// of size. Unmatched extensions fall back to the size-band classifier.
const MALL_EXTS = new Set([
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.vue', '.svelte', '.astro', '.jsx', '.tsx',
])
const WORKSHOP_EXTS = new Set([
    '.sh', '.bash', '.zsh', '.fish',
    '.yml', '.yaml', '.toml', '.ini', '.env',
    '.gradle', '.cmake', '.mk', '.bzl',
    '.dockerfile',
])
const WORKSHOP_NAMES = new Set([
    'dockerfile', 'makefile', 'rakefile', 'gemfile',
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'cargo.toml', 'cargo.lock', 'pyproject.toml', 'poetry.lock',
    'go.mod', 'go.sum', 'pom.xml', 'build.gradle',
    '.gitignore', '.dockerignore', '.eslintrc', '.prettierrc',
    'vite.config.js', 'vite.config.ts', 'webpack.config.js',
    'rollup.config.js', 'tsconfig.json', 'jsconfig.json',
])
const CIVIC_NAMES = new Set([
    'readme.md', 'readme', 'readme.txt',
    'license', 'license.md', 'license.txt',
    'changelog.md', 'changelog', 'contributing.md',
    'code_of_conduct.md', 'security.md', 'authors',
])

/**
 * Classify a file into one of the six building types.
 *
 * @param {{path: string, size?: number}} file
 * @param {number} sizeNorm  log-normalized size in [0,1] across the city
 * @returns {string} one of TYPE_NAMES
 */
export function classify(file, sizeNorm) {
    const path = (file?.path || '').toLowerCase()
    const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''

    // Civic — README / LICENSE / top-level docs override everything,
    // so the most "official" files always carry the dome.
    if (CIVIC_NAMES.has(name)) return 'civic'

    // Workshop — build / config / script files.
    if (WORKSHOP_NAMES.has(name)) return 'workshop'
    if (WORKSHOP_EXTS.has(ext)) return 'workshop'

    // Mall — UI / markup / styling files.
    if (MALL_EXTS.has(ext)) return 'mall'

    // Size-band classification for everything else.
    // The thresholds are tuned so a typical repo gets a healthy mix
    // (no district reads as 100% one type).
    if (sizeNorm >= 0.85) return 'tower'
    if (sizeNorm <= 0.20) return 'townhouse'
    return 'office'
}

/**
 * Compute building dimensions for a given type + sizeNorm.
 *
 * Per-type height bands enforce zoning: a townhouse cannot exceed 24
 * units even for a huge file — it would be re-classified as office or
 * tower long before reaching that size. Width is keyed off the type's
 * footprint character (towers narrow, malls wide, civic wide).
 *
 * @param {string} type — one of TYPE_NAMES
 * @param {number} sizeNorm — 0..1
 * @returns {{width:number, height:number, depth:number}}
 */
export function dimsFor(type, sizeNorm) {
    const t = Math.max(0, Math.min(1, sizeNorm))
    switch (type) {
        case 'tower': {
            // Hero skyscrapers. Aspect capped near 6:1 — the previous
            // 18-wide × 310-tall ratio (17:1) is why towers read as
            // "sticks", not buildings. Real game towers are massive.
            const width = 26 + 14 * t        // 26 .. 40
            const height = 110 + 130 * t     // 110 .. 240
            return { width, height, depth: width }
        }
        case 'office': {
            // The city's bulk — chunky mid-rises, ~3-4:1 aspect.
            const width = 24 + 12 * t        // 24 .. 36
            const height = 55 + 75 * t       // 55 .. 130
            return { width, height, depth: width }
        }
        case 'civic': {
            // Substantial civic anchors with dome cap.
            const width = 30 + 14 * t        // 30 .. 44
            const height = 40 + 40 * t       // 40 .. 80
            return { width, height, depth: width }
        }
        case 'mall': {
            // Big-box stores — wide footprint, moderate height.
            const width = 34 + 16 * t        // 34 .. 50
            const height = 24 + 24 * t       // 24 .. 48
            const depth = width * 0.85
            return { width, height, depth }
        }
        case 'workshop': {
            // Factories / industrial — broad sheds, not poles.
            const width = 24 + 12 * t        // 24 .. 36
            const height = 35 + 45 * t       // 35 .. 80
            return { width, height, depth: width }
        }
        case 'townhouse':
        default: {
            // Residential — squat row-houses, ~2:1 aspect.
            const width = 16 + 8 * t         // 16 .. 24
            const height = 26 + 22 * t       // 26 .. 48
            return { width, height, depth: width }
        }
    }
}
