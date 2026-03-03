<div align="center">

<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/compass.svg" width="60" height="60" alt="Codebase City Logo" />

# Codebase City

**A 3D Software Architecture Visualization Tool**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Production](https://img.shields.io/badge/Status-Production-success.svg)](#)
[![Tech: React Three Fiber](https://img.shields.io/badge/Tech-Three.js_|_React-black.svg)](#)

*Transform complex software repositories into interactive, navigable 3D environments.*

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Technical Architecture](#technical-architecture)

</div>

---

## Overview

Codebase City is an open-source static analysis and visualization platform for software engineers. It parses local repositories or Git history to generate a 1:1 scale, interactive 3D spatial representation of code complexity, dependencies, and architectural structure.

By treating directories as "districts" and files as "buildings", developers can intuitively identify technical debt, heavily coupled modules, and code churn through spatial exploration rather than reading flat text reports.

### Key Use Cases
*   **Technical Debt Discovery**: Visually identify "God Objects" (massive, highly centralized files) instantly.
*   **Project Onboarding**: Allow new engineers to spatially explore unfamiliar project layouts and system flow.
*   **Refactoring Planning**: Map dependency structures to see the blast radius of potential architectural changes.

---

## Features

### 1. Spatial Code Analysis
*   **Complexity Mapping**: Building height directly correlates to Lines of Code (LOC) and cyclomatic complexity.
*   **Dependency Tracing**: System logic flows are represented as dynamic visual links between modules.
*   **Hotspot Detection**: Files with high change frequency (churn) or error rates are highlighted utilizing heatmap rendering.

### 2. Temporal Analysis
*   **Git Replay Timeline**: Scrub through the project's commit history to watch the architecture grow and evolve over time.
*   **Author Attribution**: Identify active contributors via 3D markers overlaid on the files they recently modified.

### 3. Deep Inspection
*   **File Metrics**: Click any building in the 3D space to view associated source code, exact LOC, and complexity metrics.
*   **Universal Search**: Use the command palette to instantly jump the camera to any file, class, or function in the codebase.

---

## Installation

### Prerequisites
*   Node.js (v18 or higher)
*   Python (3.11 or higher)
*   Git (required for temporal analysis features)

### Local Setup

1. **Clone the repository**
```bash
git clone https://github.com/YashwanthKamireddi/CodebaseCity.git
cd CodebaseCity
```

2. **Initialize the Analysis Engine (Backend/Python)**
Codebase City uses a FastAPI backend to parse Abstract Syntax Trees (ASTs) and Git history securely on your local machine.
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000 &
```

3. **Initialize the Visualization Client (Frontend/React)**
```bash
cd ../frontend
npm install
npm run dev
```

The application will now be available locally at `http://localhost:5173`.

---

## Usage

1. **Launch the Interface**: Navigate to `http://localhost:5173` in any modern web browser.
2. **Analyze a Project**: Enter the absolute path to a local project directory (e.g., `/home/user/my_react_app`).
3. **Exploration Controls**:
   * `W`/`A`/`S`/`D`: Move Camera position
   * `Q`/`E`: Rotate viewpoint
   * `Mouse/Scroll`: Pan and Zoom
   * `Left Click`: Inspect individual buildings/files

---

## Technical Architecture

Codebase City relies on a highly optimized, dual-stack architecture designed to handle enterprise-scale repositories.

*   **Frontend**: Built with **React** and **@react-three/fiber**. The 3D view utilizes GPU instancing (`THREE.InstancedMesh`) to render upwards of 10,000+ files in a single WebGL draw call, ensuring a consistent 60+ FPS during deep zoom and rotation.
*   **Backend**: Built with **Python** and **FastAPI**. It leverages local AST parsers and the `git` CLI to safely analyze code structures without sending proprietary source code to external servers.

---

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/YashwanthKamireddi/CodebaseCity/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Copyright © 2026 **Yashwanth Kamireddi**. All Rights Reserved.

Distributed under the MIT License. See `LICENSE` for more information.
