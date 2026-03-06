<div align="center">

# Codebase City

### See your code. Like never before.

**The open-source 3D architecture visualization engine that transforms any codebase into an explorable city.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Try_Now-blue?style=for-the-badge)](https://codebasecity.vercel.app)
[![GitHub Stars](https://img.shields.io/github/stars/YashwanthKamireddi/CodebaseCity?style=for-the-badge&logo=github&color=yellow)](https://github.com/YashwanthKamireddi/CodebaseCity)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[![React](https://img.shields.io/badge/React_18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-black?logo=threedotjs)](https://threejs.org)

<br />

**Files become buildings. Folders become districts. Dependencies become roads.**<br />
Height = complexity. Color = health. You don't read the architecture — you *walk through it*.

<br />

[Try Live Demo](https://codebasecity.vercel.app) · [Report Bug](https://github.com/YashwanthKamireddi/CodebaseCity/issues) · [Request Feature](https://github.com/YashwanthKamireddi/CodebaseCity/issues)

</div>

<br />

---

## Why Codebase City?

Static analysis tools give you numbers. Code review gives you diffs. **Codebase City gives you spatial understanding.**

Instead of reading a report that says *"auth.py has cyclomatic complexity 47"*, you see a towering red skyscraper in the center of the city and immediately understand:
- It's coupled to everything (roads everywhere)
- It's the oldest building (dark color)
- Changing it affects half the city

> **"The best way to understand a codebase is to see it."**

### Who is this for?

| Role | Use Case |
|------|----------|
| **Tech Leads** | Spot god-objects, circular dependencies, and tech debt at a glance |
| **New Engineers** | Spatially explore unfamiliar codebases during onboarding |
| **Architects** | Visualize impact before refactoring |
| **Open Source Maintainers** | Understand contribution patterns and codebase evolution |

---

## Features

### 🏙️ 3D Code Visualization
- **Complexity Mapping** — Building height = cyclomatic complexity, width = dependency count
- **Health Coloring** — Green (healthy) → Yellow (warning) → Red (critical) gradient
- **District Clustering** — Louvain algorithm groups related files into organic neighborhoods
- **GPU Instanced Rendering** — Handles 10,000+ files at 60 FPS

### 🔬 Building Inspection
- **Click any building** → See classes, functions, imports, exports, LOC, complexity
- **Impact Analysis** → Select a file and see which modules are affected by changes
- **Dependency Tracing** → Glowing neon roads between imports/exports
- **Inline Code Viewer** → Read source code without leaving the city

### ⏰ Git Time Travel
- **Timeline scrubber** — Slide through commit history and watch the architecture evolve
- **Churn Detection** — High-churn files glow as hotspots

### 🤖 AI Architect (Gemini)
- Ask *"What are the most coupled modules?"* → Get an instant visual answer
- Ask *"Is this codebase well-structured?"* → Get AI-powered architecture review
- Context-aware — knows which building you're looking at
- **Bring your own API key** — runs directly in your browser, no server needed

### 🎮 Exploration Mode
- **WASD fly-through** — Navigate the city with a robot character
- **Slide collision** — Smooth building avoidance
- **First-person zoom** — Scroll in for FPS view
- Press **F** to enter, **Esc** to exit

### 🔍 Command Palette
- **⌘K / Ctrl+K** → Search files, symbols, and commands instantly

### 📊 Developer Intelligence
- **Health Reports** — Aggregate code health scoring by district and project
- **Dead Code Detection** — Find unreferenced files
- **Quality Analysis** — Maintainability index, complexity hotspots
- **Critical Path Analysis** — Identify the most central files by dependency graph centrality

### 📥 Input Methods
- **GitHub URL** — Paste any public repo URL, analyzed via ZIP download
- **Local Folder** — Use the File System Access API to analyze local projects (Chrome/Edge)
- **Demo City** — Built-in demo to explore immediately

---

## Quick Start

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/YashwanthKamireddi/CodebaseCity.git
cd CodebaseCity/frontend
npm install
npm run dev
```

Open **http://localhost:5173** → Paste any GitHub URL or pick a local folder → Explore.

**No backend required.** Everything runs in your browser.

---

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│  YOUR CODEBASE                                                │
│  (GitHub URL or local folder via File System Access API)      │
└─────────────────────────┬────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐  ┌──────▼──────┐ ┌──────▼──────┐
    │   Regex    │  │   Graph     │ │  GitHub     │
    │  Parser    │  │   Engine    │ │  REST API   │
    │ (14+ langs)│  │ (deps/layout│ │ (git history│
    └─────┬─────┘  └──────┬──────┘ └──────┬──────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                    ┌─────▼─────┐
                    │  Louvain   │
                    │ Clustering │ → Districts
                    │ + Treemap  │ → Building positions
                    │ + Layout   │ → Road network
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │ Three.js   │
                    │ + R3F      │ → 3D City in your browser
                    └───────────┘
```

**Pipeline:** File Discovery → Regex Parsing → Graph Building → Louvain Clustering → Treemap Layout → GPU Rendering

All computation happens in a **Web Worker** to keep the UI responsive.

---

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **3D Engine** | Three.js, React Three Fiber, Drei, Postprocessing | GPU-instanced city rendering at 60 FPS |
| **Frontend** | React 18, Zustand, Framer Motion, D3.js | Reactive UI with smooth animations |
| **Parsing** | Client-side regex parser (14+ languages) | Extract functions, classes, imports, metrics |
| **Graph** | Custom graph engine, Louvain clustering | Dependency analysis + community detection |
| **AI** | Google Gemini API (direct from browser) | User-supplied API key, no proxy |
| **Git** | GitHub REST API, isomorphic-git | Commit history and time travel |
| **Build** | Vite 5, Rollup | Fast HMR + optimized production builds |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Click** | Select / inspect a building |
| **Scroll** | Zoom in / out |
| **Drag** | Orbit camera |
| **Right-drag** | Pan |
| **⌘K** | Command palette |
| **F** | Toggle exploration mode (WASD flight) |
| **L** | Toggle labels |
| **D** | Toggle dependency roads |
| **V** | Toggle 3D / table view |
| **Esc** | Deselect / exit mode |

---

## Supported Languages

The client-side regex parser supports 14+ languages:

| Language | Language | Language |
|----------|----------|----------|
| JavaScript | TypeScript | Python |
| Java | Go | Rust |
| C | C++ | C# |
| PHP | Ruby | Swift |
| Kotlin | Scala | |

---

## Deployment

### Vercel (Recommended)

```bash
cd frontend
npm i -g vercel
vercel --prod
```

### Any Static Host

```bash
cd frontend
npm run build
# Deploy the dist/ folder to Netlify, Cloudflare Pages, GitHub Pages, etc.
```

---

## Project Structure

```
CodebaseCity/
└── frontend/                  # Entire app — pure client-side
    ├── src/
    │   ├── app/               # Client-side analysis engine
    │   │   └── engine/        # ClientAnalyzer, graphEngine, regexParser, louvain
    │   ├── widgets/           # 3D city viewport, layout, HUD, exploration
    │   ├── features/          # Analysis, search, timeline, AI chat, explorer
    │   ├── entities/          # Building panel, code viewer
    │   ├── store/             # Zustand state (5 slices)
    │   ├── hooks/             # Camera, virtual list
    │   └── shared/            # Animations, utilities
    └── public/
        └── demo-city.json     # Pre-generated demo city data
```

---

## Contributing

Contributions welcome! Bug fixes, new language support, UI improvements — all help.

```bash
git checkout -b feature/your-feature
git commit -m "feat: add your feature"
git push origin feature/your-feature
# Open a Pull Request
```

---

## Roadmap

- [ ] Java, Go, Rust full AST parsing (WASM Tree-sitter)
- [ ] Test coverage overlay — green/red buildings based on coverage
- [ ] PR diff visualization — see what changed between commits
- [ ] Multiplayer — share a city link and explore together
- [ ] Mobile / touch controls

---

## Star History

If this project is useful to you, please consider giving it a ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=YashwanthKamireddi/CodebaseCity&type=Date)](https://star-history.com/#YashwanthKamireddi/CodebaseCity&Date)

---

## License

MIT © 2026 [Yashwanth Kamireddi](https://github.com/YashwanthKamireddi)

---

<div align="center">

**[⬆ Back to top](#codebase-city)**

</div>
