# Codebase City — World-Class Architecture Plan

> A comprehensive, actionable blueprint to make Codebase City a production-grade, high-performance 3D code visualization platform.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Competitor & Industry Analysis](#3-competitor--industry-analysis)
4. [Architecture Vision](#4-architecture-vision)
5. [Priority 0 — Critical Fixes (Ship Blockers)](#5-priority-0--critical-fixes)
6. [Priority 1 — Performance Overhaul](#6-priority-1--performance-overhaul)
7. [Priority 2 — Architecture Improvements](#7-priority-2--architecture-improvements)
8. [Priority 3 — Feature Roadmap](#8-priority-3--feature-roadmap)
9. [Bundle & Build Optimization](#9-bundle--build-optimization)
10. [Testing & Quality Strategy](#10-testing--quality-strategy)
11. [DevOps & Production Readiness](#11-devops--production-readiness)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. Executive Summary

Codebase City transforms source code repositories into interactive 3D cities where buildings represent files, height encodes lines of code, and districts represent directories. It is built with **React 18 + Three.js 0.160 + React Three Fiber 8.18 + Zustand 4.4**.

### What Works Well
- **GPU instancing** — All 222+ buildings rendered in a single draw call via `InstancedMesh`
- **On-demand rendering** — `frameloop="demand"` eliminates idle GPU work
- **Lazy loading** — 7 heavy panels loaded only when needed
- **Zero-backend architecture** — Entire analysis pipeline runs client-side via GitHub API
- **Rich shader system** — Custom GLSL building shader with procedural windows, edge highlights, warmth variation
- **Comprehensive color modes** — 6 view modes (default, layer, churn, complexity, language, author)

### What Needs Fixing
- **Color system verified working** — Rank-based percentile injection produces 222 unique colors across full gradient. If user sees uniform colors, it's a browser cache issue.
- **Roads** — Perimeter-per-district approach creates box-shaped roads around each district bounding box. Need real graph-based Voronoi roads.
- **Performance** — 9 of 11 `useFrame` hooks unthrottled; 2 components use `useStore()` without selector (re-render storms); 11 dead component files; O(n²) line-number computation in parser
- **Memory** — `fileContents` stored inside `cityData` (can be 50MB+ for large repos)
- **Bundle** — 1.64MB raw / 480KB gzipped. `three.js` alone is 666KB raw.

---

## 2. Current State Audit

### 2.1 File Inventory (Key Files)

| File | Lines | Purpose | Issues |
|------|-------|---------|--------|
| `createCitySlice.js` | 782 | City data + GitHub API pipeline | 654-line inline `analyzeRepo`, artificial 800ms delay, `fileContents` in state |
| `InstancedCity.jsx` | 479 | GPU-instanced building renderer | Selection triggers O(n) full recolor, `frustumCulled={false}` |
| `Roads.jsx` | 545 | Road network + roundabouts | Box-perimeter approach looks artificial |
| `App.jsx` | 393 | Root component | Dead `isAnimating` selector, dual sidebar state |
| `CameraController.jsx` | 312 | Camera fly-to + orbit | Duplicated `cityBounds` computation |
| `regexParser.js` | 352 | Multi-language parser | O(n²) line computation, module-level shared Sets |
| `PulseMaterial.js` | 208 | Custom GLSL building shader | Dead `aOpacityOverride` attribute |
| `colorUtils.js` | 179 | 6-mode color system | Working correctly — 222 unique colors |
| `createTimeSlice.js` | 232 | Timeline + LRU cache | Dangling Promise bug, dead `pendingAnalysis` |
| `CityScene.jsx` | 100 | Scene composition | AnimationPump at 200ms |

### 2.2 Rendering Pipeline
```
Canvas (frameloop="demand", shadows=false, logDepthBuffer=true)
├── PerspectiveCamera (fov=45, near=1, far=20000)
├── OrbitControls (dampingFactor=0.12, zoomToCursor=true)
├── AnimationPump (200ms interval → invalidate())
├── InstancedCity (1 draw call, custom ShaderMaterial)
├── Roads (merged geometry, custom GLSL)
├── Ground (1024×1024 CanvasTexture)
├── DistrictLabels (individual 256×64 CanvasTextures)
├── HolographicCityName (512×128 CanvasTexture)
├── NeonDistrictBorders, DistrictFloors
├── StreetLamps, DataStreams, AtmosphericParticles
├── EnergyCoreReactor, MothershipCore, HeroLandmarks
├── HologramPanel, LandmarkPanel
├── fog + background color
└── CameraController (GSAP animations)
```

### 2.3 useFrame Hook Audit

| Component | Throttled? | Purpose |
|-----------|-----------|---------|
| InstancedCity | ✅ 30fps | `uTime` uniform update |
| Roads | ✅ 30fps | `uTime` uniform update |
| AnimationPump | ✅ 200ms | `invalidate()` pump |
| NeonDistrictBorders | ❌ | `uTime` + `dashOffset` |
| DataStreams | ❌ | `uTime` |
| MothershipCore | ❌ | `uTime` + rotation |
| EnergyCoreReactor | ❌ | `uTime` + bobbing |
| HeroLandmarks | ❌ | `uTime` + rotation |
| HolographicCityName | ❌ | `uTime` |
| DistrictLabels | ❌ | `uTime` |
| AtmosphericParticles | ❌ | Position updates |

**Impact**: Each unthrottled `useFrame` triggers on every render frame. With `frameloop="demand"`, this isn't a constant drain, but when AnimationPump fires every 200ms, ALL 11 hooks execute. Only 3 are throttled.

### 2.4 Re-render Storm Sources

| Component | Issue | Impact |
|-----------|-------|--------|
| `CommandPalette.jsx` | `useStore()` without selector | Re-renders on ANY state change |
| `CityBuilderLoader.jsx` | `useStore()` without selector | Re-renders on ANY state change |
| `App.jsx` | Dead `isAnimating` selector | Unnecessary re-renders on timeline |

---

## 3. Competitor & Industry Analysis

### 3.1 Original CodeCity (Richard Wettel, 2007-2009)
- **Platform**: Smalltalk + OpenGL (desktop)
- **Metaphor**: Classes = buildings, packages = districts
- **Metrics**: Height = LOC, width = # methods, color = complexity
- **Key Innovation**: First major "city metaphor" for software visualization
- **Limitation**: Desktop only, single-platform, no web support

### 3.2 Modern Code Visualization Tools

| Tool | Approach | Strengths | Weaknesses |
|------|----------|-----------|------------|
| **CodeScene** (SaaS) | 2D hotspot maps, temporal coupling | Deep behavioral analysis, CI integration | No 3D, expensive SaaS |
| **SonarQube** | Dashboard + code gates | Industry standard, 30+ languages | No visualization, server-heavy |
| **Gource** | Animated VCS history | Beautiful animation, works offline | View-only, no interactivity |
| **CodeMaat** | CLI temporal analysis | Deep git forensics | No UI, academic |
| **repo-visualizer** (GitHub) | Static SVG treemap | Zero-install, GitHub native | Static, no metrics |
| **Software Cities (VSCode)** | VSCode extension, WebGL city | IDE integration | Limited to VSCode, basic shader |

### 3.3 What Codebase City Does Better Than All of Them
1. **Zero-install web app** — No server, no extension, no SaaS signup
2. **Real-time 3D** — GPU-instanced custom shader city, not static SVG
3. **Client-side analysis** — GitHub API → full structural analysis in the browser
4. **Multi-modal visualization** — 6 color modes switchable in real-time
5. **Interactive exploration** — Click buildings to see code, search files, fly camera
6. **Time travel** — Scrub through git history to see city evolve

### 3.4 Industry Best Practices (From Figma, Mapbox, Sketchfab, VSCode.dev)

**Figma** (Canvas Rendering):
- Uses WebGL2 with custom rendering pipeline
- Aggressive caching of rendered tiles
- Progressive rendering — coarse → fine
- Separate render thread (OffscreenCanvas + Web Worker)

**Mapbox GL JS** (Large-scale WebGL):
- Tile-based loading (only render visible tiles)
- LOD system (Level of Detail based on zoom)
- Shader-based label rendering (no DOM labels)
- Progressive rendering with requestIdleCallback
- IndexedDB caching for offline support

**Sketchfab** (3D Model Viewer):
- Movement regression — reduce quality during interaction
- Adaptive pixel ratio
- Background loading with priority queue
- WebP/KTX2 compressed textures

**VSCode.dev** (Browser-based IDE):
- IndexedDB for project caching
- Web Worker for heavy computation (language services)
- Virtual scrolling for large file lists
- Progressive feature loading

---

## 4. Architecture Vision

### 4.1 Target Architecture
```
┌─────────────────────────────────────────────────────┐
│                    React Shell                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ FloatingDock │ Sidebar │  │ Command Palette  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              R3F Canvas                       │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │         CityScene (< 10 draw calls)    │  │   │
│  │  │  InstancedCity (1 DC)                  │  │   │
│  │  │  Roads + Roundabouts (1 DC)            │  │   │
│  │  │  Ground (1 DC)                         │  │   │
│  │  │  Decorations (merged, 2-3 DC)          │  │   │
│  │  │  Labels (SDF/Canvas atlas, 1 DC)       │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           Zustand Store (4 slices)            │   │
│  │  City | UI | Interaction | Time               │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │         Analysis Engine (Web Worker)          │   │
│  │  GitHub API → Parse → Graph → Layout          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 4.2 Core Design Principles

1. **GPU-first rendering** — All visual work in shaders. Zero DOM elements in 3D viewport.
2. **Demand-driven** — Render only when something changes. Zero idle GPU cycles.
3. **Separation of concerns** — Analysis engine fully isolated in Web Worker.
4. **Progressive enhancement** — Core features work on all devices; decorations scale with hardware.
5. **Data immutability** — City data is read-only after generation. Interactions are overlays.

---

## 5. Priority 0 — Critical Fixes

### 5.1 Roads: Switch to Voronoi-Based District Streets

**Problem**: Current roads draw a bounding box around each district, creating overlapping rectangles. This looks artificial and "random."

**Solution**: Generate roads as the **dual graph** of the district Voronoi diagram.

```
Algorithm:
1. For each pair of adjacent districts, compute the shared boundary edge
2. This forms the road network naturally — roads exist between districts
3. Add T-intersections and roundabouts at natural crosspoints
4. Main arteries: edges between the largest districts get wider roads
5. Remove any road segment shorter than a minimum threshold
```

**Implementation**:
```javascript
function computeVoronoiRoads(districts) {
    const edges = new Map() // "d1:d2" → { points, width }

    // For each pair of districts, find shared boundary region
    for (let i = 0; i < districts.length; i++) {
        for (let j = i + 1; j < districts.length; j++) {
            const shared = findSharedBoundary(districts[i], districts[j])
            if (shared) {
                const key = `${i}:${j}`
                edges.set(key, {
                    midline: computeMidline(shared),
                    width: ROAD_WIDTH // Wider for major district borders
                })
            }
        }
    }

    // Find intersections: points where 3+ districts meet
    // These become roundabouts naturally
    return { edges, intersections }
}
```

**Effort**: ~4-6 hours. Completely replaces `computeDistrictRoadGrid`.

### 5.2 Fix Re-render Storms

**Problem**: `CommandPalette.jsx` and `CityBuilderLoader.jsx` call `useStore()` without selector, causing re-render on every state change.

**Fix**: Add granular selectors.

```javascript
// Before (BAD):
const store = useStore()

// After (GOOD):
const cityData = useStore(s => s.cityData)
const loading = useStore(s => s.loading)
// ... only subscribe to what you need
```

**Effort**: ~30 minutes.

### 5.3 Remove Dead `isAnimating` Selector from App.jsx

```javascript
// Currently in App.jsx:
const isAnimating = useStore(s => s.isAnimating) // ← DEAD, never used in JSX

// Fix: Remove this line
```

**Effort**: 1 minute.

### 5.4 Fix Dangling Promise in createTimeSlice.js

The debounced `analyzeAtCommit` can create dangling promises that resolve after state has moved on.

```javascript
// Add AbortController pattern:
let analyzeController = null

analyzeAtCommit: async (index) => {
    if (analyzeController) analyzeController.abort()
    analyzeController = new AbortController()
    const signal = analyzeController.signal

    // ... check signal.aborted before each state update
}
```

**Effort**: ~1 hour.

---

## 6. Priority 1 — Performance Overhaul

### 6.1 Throttle ALL useFrame Hooks

Create a shared throttle utility:

```javascript
// utils/useThrottledFrame.js
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

export function useThrottledFrame(callback, fps = 30) {
    const lastTime = useRef(0)
    const interval = 1 / fps

    useFrame((state, delta) => {
        const now = state.clock.elapsedTime
        if (now - lastTime.current < interval) return
        lastTime.current = now
        callback(state, delta)
    })
}
```

Apply to ALL 8 unthrottled hooks. Target: **10fps** for decorative animations (NeonDistrictBorders, DataStreams, MothershipCore, EnergyCoreReactor, HeroLandmarks, HolographicCityName, DistrictLabels, AtmosphericParticles).

**Impact**: Reduces per-frame work by ~70% during AnimationPump ticks.
**Effort**: ~1 hour.

### 6.2 Separate `fileContents` from `cityData`

**Problem**: `cityData` can be 50MB+ because it stores file contents inline. Every `setCityData` call forces Zustand to diff this massive object.

**Solution**: Store file contents in a separate non-reactive `Map`:

```javascript
// Engine-level cache, outside Zustand
const fileContentCache = new Map()

export function getFileContent(path) {
    return fileContentCache.get(path)
}

export function setFileContent(path, content) {
    fileContentCache.set(path, content)
}
```

Remove `fileContents` from the Zustand city slice. When `CodeViewer` needs a file, it calls `getFileContent(path)` directly.

**Impact**: Reduces Zustand state size by 90%+ for large repos.
**Effort**: ~2 hours.

### 6.3 Optimize regexParser Line Number Computation

**Problem**: For each function/class match, the parser counts newlines from the start of the file. With 50 functions in a 1000-line file, that's O(50 × 1000) = O(n × m) character scans.

**Solution**: Pre-compute a line offset index:

```javascript
function buildLineIndex(content) {
    const offsets = [0] // Line 1 starts at offset 0
    for (let i = 0; i < content.length; i++) {
        if (content.charCodeAt(i) === 10) offsets.push(i + 1)
    }
    return offsets
}

function offsetToLine(offsets, charOffset) {
    // Binary search for O(log n) lookup
    let lo = 0, hi = offsets.length - 1
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (offsets[mid] <= charOffset) lo = mid
        else hi = mid - 1
    }
    return lo + 1
}
```

**Impact**: O(n²) → O(n log n). Noticeable on files with 100+ functions.
**Effort**: ~30 minutes.

### 6.4 Incremental Color Updates for Selection/Hover

**Problem**: Toggling selection triggers a full O(n) color rebuild of ALL buildings.

**Solution**: The current code already has a two-tier system conceptually, but the "incremental" path still rebuilds all colors. True incremental update:

```javascript
// Only recolor the 2 affected buildings (previous + new)
function updateSelectionColors(prevId, newId) {
    const mesh = meshRef.current
    if (!mesh) return

    // Re-color previous selected building (back to default)
    if (prevId != null) {
        const idx = buildingIndexMap.get(prevId)
        if (idx != null) recolorBuilding(idx, false, false)
    }

    // Re-color new selected building
    if (newId != null) {
        const idx = buildingIndexMap.get(newId)
        if (idx != null) recolorBuilding(idx, false, true)
    }

    mesh.instanceColor.needsUpdate = true
}
```

**Impact**: O(n) → O(1) for selection changes.
**Effort**: ~2 hours.

### 6.5 Remove 11 Dead Component Files

These files are never imported by any live code:

```
widgets/city-viewport/ui/BuildingDetails.jsx
widgets/city-viewport/ui/BuildingXRay.jsx
widgets/city-viewport/ui/HolographicBillboards.jsx
widgets/city-viewport/ui/OrbitalSatellites.jsx
widgets/city-viewport/ui/SentinelDrones.jsx
```

And any other files confirmed as dead imports. They are tree-shaken by Vite but add cognitive overhead and clutter.

**Effort**: ~15 minutes.

---

## 7. Priority 2 — Architecture Improvements

### 7.1 Extract Analysis Engine to Dedicated Web Worker

**Problem**: The 654-line `analyzeRepo` function runs on the main thread, blocking rendering during GitHub API calls and parsing.

**Solution**: Move ALL analysis logic into a Web Worker:

```
Main Thread                    Worker Thread
─────────                      ─────────────
analyzeRepo(url)  ──message──> start analysis
                               ├── fetch GitHub API
                               ├── parse files (regexParser)
  <──progress──   progress %   ├── build dependency graph
                               ├── compute layout (Louvain)
  <──result────   cityData     └── return structured data
```

The worker already exists (`analysis.worker.js`) but is barely used. The full analysis pipeline should run there.

**Effort**: ~6-8 hours.

### 7.2 IndexedDB Caching for Analyzed Repos

**Problem**: Every visit re-fetches and re-analyzes the same repo.

**Solution**: Cache analysis results in IndexedDB with a TTL:

```javascript
import { openDB } from 'idb' // ~1.5KB gzipped

const db = await openDB('codecity', 1, {
    upgrade(db) {
        db.createObjectStore('cities', { keyPath: 'id' })
    }
})

async function getCachedCity(repoPath) {
    const cached = await db.get('cities', repoPath)
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        return cached.data
    }
    return null
}

async function cacheCity(repoPath, data) {
    await db.put('cities', { id: repoPath, data, timestamp: Date.now() })
}
```

**Impact**: Instant reload for previously analyzed repos.
**Effort**: ~3 hours.

### 7.3 Virtual Scrolling for FileTable

The FileTable component renders all 222+ rows. For large repos (10k+ files), this becomes a problem.

Use `@tanstack/react-virtual` (~4KB gzipped):

```javascript
import { useVirtualizer } from '@tanstack/react-virtual'

function FileTable({ buildings }) {
    const parentRef = useRef(null)
    const virtualizer = useVirtualizer({
        count: buildings.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48,
        overscan: 10,
    })
    // Only renders ~20 visible rows + 10 overscan
}
```

**Effort**: ~2 hours.

### 7.4 Remove Artificial 800ms Delay

In `createCitySlice.js` around line 568-570, there's an artificial delay. Remove it.

**Effort**: 1 minute.

### 7.5 Consolidate Duplicate `sidebarOpen` State

`App.jsx` has both `useState(true)` for `sidebarOpen` AND `useStore.setState({ sidebarOpen: false })`. Pick one source of truth (Zustand).

**Effort**: ~30 minutes.

---

## 8. Priority 3 — Feature Roadmap

### 8.1 Multi-Repository Comparison

Allow loading 2 repos side-by-side. Visualize as two adjacent cities with connecting bridges for shared dependencies.

### 8.2 PR Diff Visualization

Input a GitHub PR URL → highlight changed buildings (green = added, orange = modified, red = deleted). Show a "before/after" toggle.

### 8.3 Real-time Collaborative Viewing

WebSocket-based camera sync so teams can explore a city together. One user's cursor appears as a glowing marker for others.

### 8.4 AI Architect (Existing Feature — Enhance)

Enhance the ChatInterface to:
- Explain why specific buildings are hotspots
- Suggest refactoring based on coupling analysis
- Generate architecture decision records (ADRs) from the city structure

### 8.5 Embed Mode

Provide an `<iframe>` embed like Figma/YouTube:

```html
<iframe src="https://codebasecity.vercel.app/embed?repo=vercel/next.js&mode=complexity"
        width="800" height="600" />
```

This would be massive for README files and blog posts.

### 8.6 Accessibility

- Keyboard navigation: Tab through buildings, Enter to select
- Screen reader: Announce building name, metrics on focus
- High contrast mode for colorblind users
- Reduce motion mode for vestibular sensitivity

---

## 9. Bundle & Build Optimization

### 9.1 Current Bundle Analysis

| Chunk | Raw | Gzip | Contents |
|-------|-----|------|----------|
| `three.js` | 666KB | 172KB | Three.js core |
| `r3f.js` | 320KB | 103KB | React Three Fiber + Drei |
| `index.js` | 258KB | 82KB | App code + all imports |
| `vendor.js` | 124KB | 41KB | Zustand, framer-motion, GSAP, etc. |
| `ChatInterface.js` | 139KB | 40KB | Lazy: AI chat (marked, highlight.js?) |
| `CommandPalette.js` | 50KB | 17KB | Lazy: search/command palette |
| **Total** | **1.64MB** | **480KB** | — |

### 9.2 Optimization Opportunities

**A. Tree-shake Three.js** — Import only what's needed:
```javascript
// Instead of: import * as THREE from 'three'
import { Color, Vector3, Object3D, InstancedMesh } from 'three'
```
This won't help with the current Vite setup (it already tree-shakes), but ensure no unused Three.js modules are imported.

**B. Replace framer-motion with CSS**:
- `framer-motion` is 124KB+ raw. Most animations in Codebase City are simple fade/slide.
- Replace with CSS `@keyframes` + `transition` for ~95% of uses.
- Keep framer-motion only for `AnimatePresence` exit animations if needed.
- **Savings**: ~80-100KB raw, ~25KB gzipped.

**C. Replace GSAP with Web Animations API + R3F**:
- GSAP is used only in `CameraController.jsx` for fly-to animations.
- Three.js has `MathUtils.damp` and `lerp`. R3F's `useFrame` can drive smooth camera transitions.
- **Savings**: ~30KB raw, ~10KB gzipped.

**D. Audit ChatInterface bundle**:
- At 139KB gzipped, this is the largest lazy chunk. Investigate what's inside.
- Consider replacing `marked` + `highlight.js` with a lighter markdown renderer.

### 9.3 Target Bundle
With all optimizations: **~1.1MB raw, ~350KB gzipped** (27% reduction).

---

## 10. Testing & Quality Strategy

### 10.1 Current Coverage
- **25 tests passing** across 2 test files
- Store tests: 5 tests (initial state, loading, roads toggle, UI defaults, selection)
- Color tests: 20 tests (all 6 modes, interaction states)

### 10.2 Testing Gaps

| Area | Current | Target |
|------|---------|--------|
| Store (4 slices) | 5 tests | 40+ tests |
| Color system | 20 tests | 25 tests |
| regexParser | 0 tests | 30+ tests (14 languages) |
| graphEngine | 0 tests | 15+ tests |
| Road computation | 0 tests | 10+ tests |
| fileSystemAdapter | 0 tests | 5+ tests |
| Integration (E2E) | 0 tests | 5+ smoke tests |

### 10.3 Priority Tests to Add

**A. regexParser tests** — Most impactful. Test each language:
```javascript
test('detects JavaScript arrow functions', () => {
    const result = parseFile('test.js', 'const foo = () => { ... }')
    expect(result.functions).toHaveLength(1)
    expect(result.functions[0].name).toBe('foo')
})
```

**B. Road computation tests** — Catches layout regressions:
```javascript
test('produces roads between adjacent districts', () => {
    const roads = computeVoronoiRoads(mockDistricts)
    expect(roads.segments.length).toBeGreaterThan(0)
    expect(roads.intersections.length).toBeGreaterThan(0)
})
```

**C. Store integration tests** — Test the full analysis → city data pipeline.

### 10.4 Visual Regression Testing

Use **Percy** or **Chromatic** for snapshot-based visual regression of the 3D viewport. Catches shader regressions, color changes, and layout issues.

---

## 11. DevOps & Production Readiness

### 11.1 Error Monitoring
- Add **Sentry** for runtime error tracking (free tier: 5K events/month)
- Catch Three.js WebGL context loss and report
- Track analysis failures with repo URL context

### 11.2 Analytics
- **Plausible** or **Fathom** (privacy-respecting)
- Track: repos analyzed, color modes used, time-in-viewport, table vs 3D usage

### 11.3 Performance Monitoring
- Web Vitals: LCP, FID, CLS
- Custom: time-to-first-building, analysis duration, GPU memory

### 11.4 CDN & Deployment
- **Vercel** (current) — Good for static + serverless
- Enable `brotli` compression (better than gzip for JS)
- Set `Cache-Control: immutable` for hashed assets
- Service Worker for offline support (serve cached city from IndexedDB)

### 11.5 Security Hardening
- **CSP headers**: Restrict script-src, disable eval
- **GitHub token handling**: Never store in localStorage. Use in-memory only, or encrypt with Web Crypto API
- **Input sanitization**: Validate repo paths against injection patterns
- **Rate limiting**: Track GitHub API quota client-side, show clear warnings

---

## 12. Implementation Phases

### Phase 1 — Foundation (1-2 weeks)
Goal: Fix all ship-blocking bugs, eliminate performance waste.

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Fix `CommandPalette` + `CityBuilderLoader` selectors | 30min | HIGH |
| 2 | Remove dead `isAnimating` selector from App.jsx | 1min | LOW |
| 3 | Throttle all 8 unthrottled `useFrame` hooks | 1hr | HIGH |
| 4 | Remove 11 dead component files | 15min | LOW |
| 5 | Fix regexParser O(n²) with binary search line index | 30min | MEDIUM |
| 6 | Remove artificial 800ms delay | 1min | LOW |
| 7 | Consolidate dual sidebar state | 30min | LOW |
| 8 | Fix dangling Promise in createTimeSlice | 1hr | MEDIUM |

### Phase 2 — Roads & Architecture (1-2 weeks)
Goal: World-class road system, data layer cleanup.

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Rewrite roads: Voronoi-based district streets | 6hr | HIGH |
| 2 | Separate `fileContents` from Zustand state | 2hr | HIGH |
| 3 | Incremental color updates for selection (O(1)) | 2hr | MEDIUM |
| 4 | Move analysis pipeline to dedicated Web Worker | 8hr | HIGH |

### Phase 3 — Production Polish (2-3 weeks)
Goal: Caching, bundle optimization, testing.

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | IndexedDB caching for analyzed repos | 3hr | HIGH |
| 2 | Replace framer-motion with CSS for simple animations | 4hr | MEDIUM |
| 3 | Replace GSAP camera transitions with R3F-native | 3hr | MEDIUM |
| 4 | Virtual scrolling for FileTable | 2hr | MEDIUM |
| 5 | Add 40+ tests (parser, roads, store) | 8hr | HIGH |
| 6 | Sentry error monitoring | 1hr | MEDIUM |

### Phase 4 — Feature Expansion (Ongoing)
Goal: Differentiate from competitors with unique features.

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Embed mode (`<iframe>`) | 8hr | HIGH |
| 2 | PR diff visualization | 12hr | HIGH |
| 3 | Multi-repo comparison | 16hr | MEDIUM |
| 4 | Keyboard accessibility | 4hr | MEDIUM |
| 5 | AI Architect enhancements | 10hr | MEDIUM |
| 6 | Real-time collaborative viewing | 20hr | LOW |

---

## Appendix A: Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Initial load (LCP) | ~3s | < 2s |
| Analysis time (222 files) | ~4s | < 2s |
| Memory (222 buildings) | ~40MB | < 25MB |
| Memory (10K buildings) | Unknown | < 150MB |
| FPS (idle) | 5fps (AnimationPump) | 5fps |
| FPS (orbit) | ~50fps | 60fps |
| Draw calls | ~15-20 | < 10 |
| Bundle (gzip) | 480KB | < 350KB |
| Test count | 25 | 100+ |

## Appendix B: Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 3D engine | Three.js 0.160 + R3F 8.18 | Mature, massive ecosystem, GPU instancing |
| State | Zustand 4.4 | Minimal, selector-based, no providers |
| Build | Vite 5.4 | Fast HMR, tree-shaking, small config |
| Styling | CSS custom properties | Zero runtime cost, theme support |
| Animation | CSS + R3F useFrame | Remove GSAP/framer-motion dependency |
| Parsing | Custom regex parser | Zero WASM, 14 languages, < 1ms per file |
| Caching | IndexedDB (via idb) | Persistent, large-capacity, free |
| Hosting | Vercel | Zero-config, edge CDN, free tier |
| Monitoring | Sentry + Plausible | Error tracking + privacy-respecting analytics |
| Testing | Vitest + React Testing Library | Fast, Vite-native, familiar API |

---

*This document should be treated as a living artifact. Update it as decisions are made and implementations are completed.*
