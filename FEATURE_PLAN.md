# Codebase City — Feature & Evolution Plan

> World-class features to make this the #1 codebase visualization tool on GitHub.

---

## Phase 1: Polish & Reliability (Week 1-2)

### 1.1 Performance
- [ ] Lazy-load ExplorationMode, DependencyGraph, CodeViewer via `React.lazy()` + Suspense
- [ ] Add `React.memo` to heavy 3D components (InstancedCity, HolographicXRay, BuildingXRay)
- [ ] Virtualize BuildingPanel scrollable lists for 10,000+ file codebases
- [ ] Add FPS counter (dev mode) to detect rendering regressions

### 1.2 Error Resilience
- [ ] Add error toasts for failed API calls (currently silent failures)
- [ ] Graceful fallback UI when WebGL is unsupported
- [ ] Add loading skeletons to BuildingPanel while data fetches

### 1.3 Mobile & Responsive
- [ ] Touch controls for 3D scene (pinch zoom, two-finger orbit)
- [ ] Responsive BuildingPanel (bottom sheet on mobile)
- [ ] Responsive FloatingDock (collapsible on small screens)

---

## Phase 2: Star-Magnet Features (Week 3-5)

### 2.1 GitHub Integration (One-Click Analysis)
- [ ] "Paste GitHub URL → Analyze" flow on landing page (already partially built)
- [ ] Show GitHub stars/forks/language badge on analyzed repos
- [ ] Cache analyzed repos in IndexedDB so revisits are instant
- [ ] Share analysis via URL (encode repo + commit hash in URL path)

### 2.2 Shareable City Screenshots
- [ ] "Share City" button → renders high-res screenshot of the 3D scene
- [ ] Auto-generate Open Graph image for social sharing
- [ ] Export city as `.glb` 3D model for embedding in presentations
- [ ] Embed mode: `?embed=true` URL param renders city fullscreen (for READMEs)

### 2.3 AI City Guide (Gemini/OpenAI)
- [ ] "Ask about this codebase" chat panel (backend already has ChatInterface)
- [ ] AI explains selected building: "This file is a Redux store slice that manages..."
- [ ] AI suggests refactoring: "This god-class should be split into..."
- [ ] Natural language search: "Show me the authentication module"

### 2.4 Diff Mode (Compare Two Commits)
- [ ] Side-by-side city comparison (before/after a PR)
- [ ] Buildings glow green (added), red (deleted), yellow (modified)
- [ ] "What Changed?" overlay showing PR diff summary
- [ ] GitHub PR integration: analyze a PR directly from its URL

---

## Phase 3: Community & Ecosystem (Week 6-8)

### 3.1 VS Code Extension
- [ ] "Open in Codebase City" right-click menu item
- [ ] Bidirectional sync: click building → jumps to file in VS Code
- [ ] Live analysis: city updates as you edit code (useVSCodeSync already scaffolded)

### 3.2 CLI Tool
- [ ] `npx codebase-city ./my-project` → opens browser with analysis
- [ ] CI integration: `codebase-city --report` generates HTML report
- [ ] GitHub Action: auto-comment city screenshot on PRs

### 3.3 Plugin System
- [ ] Custom color modes (e.g., test coverage from lcov)
- [ ] Custom building shapes (e.g., hexagons for services, cylinders for tests)
- [ ] Custom analysis plugins (e.g., security vulnerability scanner)

---

## Phase 4: Visual Spectacle (Ongoing)

### 4.1 City Atmosphere
- [ ] Day/night cycle with dynamic lighting
- [ ] Rain particles on high-churn files (WeatherLayer enhanced)
- [ ] Traffic animations on dependency roads (cars = API calls)
- [ ] Neon signs showing file names on building facades

### 4.2 Advanced Visualizations
- [ ] Dependency arc overlay (curved lines between connected buildings)
- [ ] Heatmap ground layer (red = complex area, blue = simple)
- [ ] "Code Earthquake" animation when analyzing large diffs
- [ ] Minimap with real-time camera position indicator

### 4.3 Exploration Mode Enhancements
- [ ] NPC characters walking the city (representing contributors)
- [ ] Building interiors (zoom into a file to see functions as rooms)
- [ ] Multiplayer: share a room code to explore together

---

## Metrics That Matter

| Metric | Current | Target |
|--------|---------|--------|
| Prod build size (gzipped) | 547KB app + 353KB 3D libs | < 500KB app |
| Build time | ~17s | < 15s |
| Lighthouse Performance | TBD | > 90 |
| Time to Interactive | TBD | < 3s |
| Max supported files | ~5,000 | 50,000+ |
| GitHub Stars | — | 1,000+ |

---

## Architecture Principles

1. **Client-first**: All analysis can run in-browser (Web Worker + regex parser). Backend is optional enhancement.
2. **Zero config**: Paste a URL or drop a folder. No setup required.
3. **Performance budget**: Never ship > 200KB of app code (excluding 3D libs).
4. **Accessible**: Keyboard navigable, screen reader labels, reduced motion support.
5. **Open core**: Core visualization is MIT. Premium features (team dashboards, CI integration) can be monetized later.
