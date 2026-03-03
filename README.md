<div align="center">

<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/compass.svg" width="40" height="40" alt="Codebase City Logo" />

# Codebase City V2.0
**The Dimensional Architecture Engine**

[![License: MIT](https://img.shields.io/badge/License-MIT-020202.svg?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Platform-Zero--Lag_DOM_|_WebGL-020202.svg?style=flat-square)](#)
[![Aesthetic](https://img.shields.io/badge/UX-Digital_Atelier_(2026)-020202.svg?style=flat-square)](#)

*Synthesize raw syntax into a navigable, structural 3D metropolis.*

[Demo](#gallery) • [Architecture](#technical-architecture) • [Getting Started](#installation) • [Engine Capabilities](#capabilities)

</div>

---

## ✦ System Overview

**Codebase City** is not just a static analysis tool; it is a high-performance **Dimensional Architecture Engine**. By ingesting raw codebases, traversing Abstract Syntax Trees (ASTs), and cross-referencing Git version control history, it generates a deeply interactive, 1:1 scale spatial metropolis of your software ecosystem.

Version 2.0 introduces the **"Digital Atelier" UI/UX standard**, ditching standard web inputs for ultra-premium, zero-lag pure DOM interfaces, strict typographic loader sequences, and deeply optimized WebGL GPU-instancing.

### Core Objectives
*   **Topographical Complexity Mapping**: Effortlessly identify "God Objects" and architectural bottlenecks. If a file is a massive, highly-coupled monolith, it renders as a towering, glowing skyscraper.
*   **Blast Radius Intel**: Visually map dependency pathways. See exactly which services will collapse if a core module is altered.
*   **Temporal Churn Analysis**: Identify areas of high technical debt by visualizing code churn—represented by intense neon heatmaps utilizing custom Three.js shaders.

---

## ✦ Engine Capabilities

### 1. Zero-Lag 'Digital Atelier' Interface
*   **Hardware-Accelerated Landing**: The entryway to the engine features an ultra-optimized, pure-DOM architectural micro-grid. Beautiful, cinematic, and locked at a flawless 120FPS with zero WebGL overhead until synthesis begins.
*   **Strict Typographic Loading Sequence**: A monolithic, terminal-style loader parses the AST generation, dependency graph building, and geometry synthesis in real-time.

### 2. Physical & Spatial Code Rendering
*   **GPU Instancing (10,000+ files)**: The city is rendered using highly optimized `THREE.InstancedMesh`. Thousands of files are drawn in a single WebGL draw call.
*   **Precise Dimensional Sorting**: Custom `NormalBlending` and exact `depthWrite` configurations guarantee pixel-perfect building occlusion and eliminate all Z-fighting during deep zoom.
*   **Custom PulseMaterial Shading**: Buildings utilize bespoke vertex/fragment shaders mathematically clamped to local geometry normals (`vLocalNormal`), ensuring mathematically perfect edge-highlighting regardless of the camera's rotational matrix.

### 3. Inspection & Diagnostics
*   **The Cinematic Timeline**: Scrub through Git history to watch the city grow, shrink, and evolve.
*   **Instant Context**: Seamlessly click on any geometric structure to pull up exact file metrics (LOC, Cyclomatic Complexity, Churn rate).

---

## ✦ Gallery

<div align="center">
  *(Visual metadata synthesized locally. Placeholders for V2.0 HQ renders.)*
  <p>
    <img src="docs/images/1.png" width="45%" style="border-radius: 8px; border: 1px solid #333;" />
    <img src="docs/images/2.png" width="45%" style="border-radius: 8px; border: 1px solid #333;" />
  </p>
</div>

---

## ✦ Installation & Synthesizing

### Requirements
*   **Node.js** v18+
*   **Python** 3.11+
*   **Git** (For temporal history analysis)

### Deployment

1. **Acquire the Engine**
```bash
git clone https://github.com/YashwanthKamireddi/CodebaseCity.git
cd CodebaseCity
```

2. **Initialize the Analysis Core (Backend)**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000 &
```

3. **Initialize the Dimensional Viewport (Frontend)**
```bash
cd ../frontend
npm install
npm run dev
```

The system will boot instantly at `http://localhost:5173`.

---

## ✦ Usage

1. **System Boot**: Open the local port in any modern browser.
2. **Input Path**: In the command palette, enter the absolute path to a local project (e.g., `/home/user/my_project`).
3. **Synthesis**: The engine will parse the trees and render the dimensional space.
4. **Navigation**:
   * `W`/`A`/`S`/`D`: Translate Camera
   * `Q`/`E`: Mutate Rotation
   * `Mouse/Scroll`: Deep Zoom
   * `Left Click`: Structure Inspection

---

## ✦ Intellectual Property

**Codebase City** is architected and maintained by **Yashwanth Kamireddi**.

Licensed under the **MIT License**. See [LICENSE](LICENSE) for full text. All UI/UX "Digital Atelier" concepts and standardizations are native to V2.0 of this repository.

<div align="center">
  <code>SYS.DONE // VIRTUAL ENVIRONMENT ONLINE</code>
</div>
