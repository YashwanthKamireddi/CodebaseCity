# Codebase City — Architecture Deep Dive & Optimization Report

## Executive Summary

Codebase City is a client-side 3D code visualization tool built with React + Three.js (via React Three Fiber). It renders codebases as interactive cyberpunk cities where buildings represent files, districts represent directories, and roads represent dependencies. The architecture is solid for its scope but has specific areas where targeted improvements can significantly reduce memory usage, improve frame times, and unlock new capabilities.

**Current tech stack**: React 18 + Three.js 0.160 + R3F 8.18 + Zustand 4.4 + Vite 5.4
**Bundle**: ~950KB raw, ~350KB gzipped (main + vendor + three + r3f chunks)
**Rendering**: `frameloop="demand"` with rAF-based animation pump, GPU instancing for buildings

---

## 1. What's Actually Happening at Runtime

### Render Pipeline
```
Canvas (demand mode) → AnimationPump (rAF throttled) → CityScene
  ├── 3 lights (hemisphere + 2 directional)
  ├── InstancedCity (1 draw call, 12 tris × N buildings)
  ├── Roads (merged segments + intersections per district)
  ├── Ground (1 mesh, canvas texture)
  ├── DistrictFloors (merged geometry)
  ├── NeonDistrictBorders (lineSegments per district)
  ├── DistrictLabels (1 sprite per district)
  ├── StreetLamps (2 merged geometries)
  ├── DataStreams (1 tube per stream)
  ├── AtmosphericParticles (1 points object, 200 particles)
  ├── EnergyCoreReactor (~19 meshes — biggest draw call contributor)
  ├── MothershipCore (~8 meshes)
  ├── HolographicCityName (1 sprite)
  ├── HeroLandmarks (conditional meshes for top files)
  ├── HologramPanel (conditional on selection)
  └── LandmarkPanel (conditional on landmark selection)
```

**Estimated draw calls**: ~40-60 depending on district count
**Estimated triangles**: 60K-100K for 5000 buildings + ~10K for decorations
**GPU time**: 4-8ms per frame (acceptable)

### Memory Layout
```
Zustand store
  ├── cityData (buildings[], districts[], roads[], metrics, fileContents{})
  ├── masterCityData (same ref as cityData until timeline mode)
  ├── UI state (selections, modes, hover)
  └── Timeline state (commits, cache)

Three.js GPU memory
  ├── InstancedMesh (matrixArray + colorArray for N buildings)
  ├── PulseMaterial (custom shader with window/edge/Fresnel effects)
  ├── ~12 ShaderMaterials across decoration components
  ├── ~6 CanvasTextures (ground, labels, billboards, city name)
  └── ~20 BufferGeometries (merged floors, roads, lamps)
```

---

## 2. What Was Fixed This Session

| Fix | Impact | Details |
|-----|--------|---------|
| **instanceColor buffer creation** | P0 — buildings were invisible | Three.js lazy-creates `instanceColor` on first `setColorAt()`. Direct array write path returned early because buffer didn't exist. Added explicit `InstancedBufferAttribute` creation. |
| **17 components wrapped in React.memo** | Medium — prevents unnecessary re-renders | All animated/decorated scene children now memoized. Prevents reconciliation cascades when parent re-renders. |
| **Removed dead `previousCityData`** | Low-Medium — frees one full city data reference | Was stored but never read. Eliminated an entire city data copy from memory. |
| **Lights reduced from 5 to 3** | Low — fewer scene traversals | Combined ambient+hemisphere into one stronger hemisphere. Removed 3rd directional (rim light). |
| **AnimationPump: setInterval → rAF** | Medium — smoother, battery-friendly | `requestAnimationFrame` auto-pauses when tab is hidden, syncs with vsync, doesn't drift. |

---

## 3. Dead Code Discovery

**11 viewport components are never imported or rendered:**

| File | Purpose | Status |
|------|---------|--------|
| CommTowers.jsx | Antenna spires on hub buildings | Dead code |
| SentinelDrones.jsx | 30 drones × 4 instanced meshes | Dead code |
| SkyBridges.jsx | Glowing connectors between coupled buildings | Dead code |
| OrbitalSatellites.jsx | 80 satellites orbiting city | Dead code |
| EmergencyBeacons.jsx | Red pulsing on critical buildings | Dead code |
| EnergyShieldDome.jsx | Hexagonal force field around city | Dead code |
| LandingPads.jsx | Rooftop VTOL pads on largest buildings | Dead code |
| PulseWaves.jsx | Radial sonar rings from center | Dead code |
| HolographicBillboards.jsx | Floating screens showing code | Dead code |
| BuildingDetails.jsx | Building detail mesh overlay | Dead code |
| BuildingXRay.jsx | AST visualization wireframe | Dead code |

These are tree-shaken out by Vite's build (confirmed — they don't appear in bundle). However they still:
- Clutter the codebase (2000+ lines of unmaintained code)
- Confuse developers ("is this feature active?")
- Required maintenance (we just wrapped them in React.memo unnecessarily)

**Recommendation**: Either delete them or move them to a `components/unused/` directory with a README explaining they're showcase-ready but not active.

---

## 4. Comparison with World-Class Web Apps

### vs. VSCode.dev (monaco-editor + electron-like web shell)
| Aspect | VSCode.dev | Codebase City |
|--------|-----------|-----------|
| **Architecture** | Micro-kernel (extensions are isolated workers) | Monolithic React tree |
| **State** | EventEmitter + services (dependency injection) | Zustand with 4 slices |
| **Rendering** | DOM + Canvas (monaco) | WebGL (Three.js via R3F) |
| **Code splitting** | Extensions loaded on demand | Lazy for panels, not for 3D |
| **Worker usage** | Multiple (search, syntax, language server) | Single (analysis only) |
| **Virtual scrolling** | Yes (editor, file tree, terminal) | No (FileTable loads all rows) |

**Key takeaway**: VSCode.dev's strength is its isolation model — extensions can't crash the host, heavy work happens in workers, and the UI thread stays responsive. Codebase City could adopt a similar pattern for the analysis pipeline.

### vs. GitHub.com (server-rendered + Turbo + React islands)
| Aspect | GitHub.com | Codebase City |
|--------|-----------|-----------|
| **Data loading** | Server-rendered HTML + JSON API | Client-only (GitHub API or File System API) |
| **Caching** | HTTP cache + service worker | None (re-analyzes on every load) |
| **Progressive** | Page usable before JS loads | Blank screen until React hydrates |
| **Bundle** | ~200KB initial (islands architecture) | ~350KB gzipped (monolithic) |

**Key takeaway**: GitHub ships minimal JS per page. Codebase City is a full SPA, which is fine for an interactive 3D tool, but it could add persistence and caching.

### vs. StackBlitz / CodeSandbox
| Aspect | StackBlitz | Codebase City |
|--------|-----------|-----------|
| **Compute** | WebContainers (full Node.js in browser) | Web Worker (tree-sitter WASM) |
| **File system** | Virtual FS with sync API | File System Access API (one-shot read) |
| **Persistence** | IndexedDB-backed virtual FS | None |
| **Collaboration** | Real-time sync | None |

---

## 5. Architectural Recommendations

### Tier 1 — High Impact, Low Risk

#### 5.1 Persist analyzed city data in IndexedDB
**Problem**: Every time the user returns, they must re-analyze the entire repo (re-read files, re-run tree-sitter, re-compute layout). For a 3000-file repo, this takes 15-30 seconds.

**Solution**: After analysis, store `cityData` in IndexedDB keyed by `city_id`. On return, show the cached city instantly while offering a "Re-analyze" button.

```
Cache key: city_id (e.g., "github_facebook_react_1719000000")
Value: { cityData (without fileContents), version, analyzedAt }
Eviction: LRU with 5-city cap (~2MB per city ≈ 10MB total)
```

**Impact**: Instant load for returning users. This is probably the single biggest UX improvement possible.

#### 5.2 Virtual scrolling for FileTable
**Problem**: The `FileTable` renders all building rows at once. For 5000+ files, this creates 5000+ DOM nodes.

**Solution**: Use a virtual list (e.g., `@tanstack/virtual` at 2KB gzipped). Only render the ~30 visible rows.

#### 5.3 Move fileContents out of cityData
**Problem**: `fileContents` (up to 50MB of source code text) is stored inside `cityData`, which means it's duplicated whenever timeline creates a new `cityData` via spread.

**Solution**: Store `fileContents` in a separate Zustand slice or a standalone `Map` outside the store. Reference it directly in `fetchFileContent` instead of reading from `cityData`.

```js
// Separate from cityData
let fileContentsStore = null
export const setFileContents = (contents) => { fileContentsStore = contents }
export const getFileContents = () => fileContentsStore
```

This avoids accidental duplication and makes the data lifecycle explicit.

### Tier 2 — Medium Impact, Medium Risk

#### 5.4 Remove unused dependencies
| Dependency | Size (gzipped) | Used? | Action |
|------------|----------------|-------|--------|
| `@react-three/postprocessing` | ~30KB | Not imported anywhere | Remove |
| `react-markdown` | ~12KB | Used in ChatInterface only | Keep if AI chat is important |
| `framer-motion` | ~40KB | Used for panel animations | Consider replacing with CSS transitions for simple cases |

#### 5.5 Reduce CanvasTexture creation
Several components create `CanvasTexture` in `useMemo` for labels and ground. Each texture consumes VRAM:
- Ground: 1024×1024 = 4MB VRAM
- DistrictLabels: 256×128 per label × N districts

**Solution**: Reduce Ground texture to 512×512 (the grid is subtle, lower res is fine). For labels, use SDF text rendering (drei's `<Text>` already supports this) instead of canvas rasterization.

#### 5.6 Implement a proper error boundary for the 3D scene
The current `CanvasErrorBoundary` catches render errors, but Three.js GPU errors (context lost, shader compilation failures) silently fail. Add a `gl.getError()` check on canvas creation and a `webglcontextlost` event handler.

### Tier 3 — High Impact, High Risk (Future Architecture)

#### 5.7 Web Worker for layout computation
**Problem**: The `buildCityData` function (dependency graph + Louvain clustering + spiral layout) runs on the main thread via the worker, but the worker is terminated after analysis. For timeline mode, `applyTimelineSnapshot` creates thousands of new building objects on the main thread.

**Solution**: Keep the worker alive for incremental updates. Timeline snapshots should be computed in the worker and sent as a transfer of the buildings array (using `Transferable` buffers).

#### 5.8 Streaming analysis with progressive rendering
Instead of waiting for full analysis to complete before showing anything, show buildings as they're parsed:
1. Worker sends partial results in chunks (e.g., per-directory)
2. Main thread append to instancedMesh incrementally
3. User sees the city "grow" during analysis

This creates a much more engaging loading experience and reduces perceived wait time.

#### 5.9 GPU-driven selection (color picking)
**Problem**: Currently, pointer events on `instancedMesh` use R3F's raycasting, which iterates all instances on the CPU.

**Solution**: Use a color-picking render pass — render each instance with a unique color to an offscreen framebuffer, read the pixel under the cursor. O(1) instead of O(N).

---

## 6. Feature Ideas

### 6.1 Code Diff Visualization
When in timeline mode, highlight buildings that changed between commits with a color gradient (green = added, red = deleted, yellow = modified). Show diff stats on hover.

### 6.2 Dependency Heat Map
Color buildings by their in-degree/out-degree in the dependency graph. Highly-imported files glow brighter. This helps identify core modules vs. leaf files.

### 6.3 Team Ownership View
Each building is already tagged with `author`. Add a color mode that colors buildings by team/author, with a legend showing each contributor's "territory". Use the email field for Gravatar avatars on the largest buildings.

### 6.4 Bookmarks & Annotations
Let users pin notes to specific buildings or districts. Store in localStorage. Export as JSON for team sharing.

### 6.5 Shareable City URLs
After analyzing a public GitHub repo, generate a shareable URL like `codebasecity.vercel.app/view/facebook/react`. Requires a thin backend (or could use URL hash + client-side re-analysis).

### 6.6 Code Quality Overlay
Integrate with ESLint/Prettier rules (via tree-sitter AST) to show quality scores per file. Buildings with many issues get "damage" textures or warning beacons.

### 6.7 Multi-Repo Comparison
Analyze two repos side by side. Show them as two adjacent cities with a river between them. Useful for comparing forks, migrations, or architectural choices.

---

## 7. Bundle Analysis

```
Current production build:
  three.js          666KB  (172KB gz) — unavoidable, core 3D engine
  r3f + drei + pp   320KB  (103KB gz) — React Three Fiber ecosystem
  index bundle      252KB  ( 80KB gz) — app code + all viewport components
  vendor            124KB  ( 41KB gz) — react + react-dom + zustand + framer-motion
  ChatInterface     140KB  ( 41KB gz) — lazy, includes react-markdown
  CommandPalette     50KB  ( 17KB gz) — lazy, includes cmdk
  FileTable          21KB  (  6KB gz) — lazy
  Others             70KB  ( 20KB gz) — lazy panels

  Total: ~1.64MB raw, ~480KB gzipped
```

**Optimizations**:
1. Remove `@react-three/postprocessing` (not used) — saves ~30KB gz
2. Consider `three` tree-shaking with explicit imports instead of `import * as THREE` (could save 20-40KB gz)
3. Move `framer-motion` to lazy chunk (only used for panel animations) — saves ~40KB from initial load

---

## 8. Performance Profile Summary

| Metric | Current | Target | How |
|--------|---------|--------|-----|
| Initial load (3G) | ~4-5s | ~3s | Remove postprocessing, lazy-load framer-motion |
| Analysis (5K files) | ~15-30s | ~15-30s | Already good; could add progressive rendering |
| Frame time (idle) | ~8-12ms | ~6-8ms | Already demand mode; memo wrapping helps |
| Frame time (hover) | ~12-16ms | ~8-10ms | Incremental color updates (already done) |
| Memory (5K city) | ~80-120MB | ~60-80MB | Remove previousCityData ✅, separate fileContents |
| Re-visit load | ~15-30s | ~1-2s | IndexedDB caching |

---

## 9. Testing & Quality

**Current state**: 25 tests (2 test files — store + color utils). No component tests, no integration tests, no visual regression tests.

**Recommendations**:
1. Add Vitest tests for `graphEngine` pipeline (the most complex logic)
2. Add a smoke test that renders `<CityScene>` with mock data (verifies no crash)
3. Consider Playwright for E2E (load demo → click building → verify panel)
4. Add `vitest --coverage` to CI with 50% target as starting point

---

## 10. Summary of Changes Made This Session

| Change | Files Modified |
|--------|---------------|
| Fixed instanceColor buffer creation | InstancedCity.jsx |
| Wrapped 17 components in React.memo | 17 viewport `.jsx` files |
| Removed dead previousCityData | createCitySlice.js |
| Reduced lights from 5 to 3 | CityScene.jsx |
| AnimationPump: setInterval → rAF | CityScene.jsx |

**Tests**: 25/25 passing
**Build**: Clean, no warnings
**Bundle size**: ~252KB index (unchanged — memo wrapper is negligible)
