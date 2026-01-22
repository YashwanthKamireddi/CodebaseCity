<div align="center">

# 🏙️ Codebase City

**Transform any codebase into an interactive 3D city**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776ab.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r150+-000000.svg)](https://threejs.org)

[Demo](#demo) • [Features](#features) • [Quick Start](#quick-start) • [How It Works](#how-it-works) • [Contributing](#contributing)

</div>

---

## What is Codebase City?

Codebase City is a **3D visualization tool** that transforms your codebase into an interactive city where:

- **Files become buildings** — Height represents complexity, size represents lines of code
- **Folders become districts** — Automatically clustered by relationships
- **Dependencies become roads** — Connecting related files visually
- **Problem areas glow** — Hotspots and technical debt are immediately visible

Navigate your code like exploring a city. Understand architecture at a glance. Find what needs attention.

---

## Demo

![Codebase City Screenshot](docs/screenshot.png)

*A Python backend visualized as an interactive city with districts, buildings, and dependency roads*

---

## Features

### For Developers
| Feature | Description |
|---------|-------------|
| **Visual Navigation** | Explore codebases spatially instead of through file trees |
| **Instant Search** | Find files by name, path, or language with live results |
| **Health Scores** | Every file gets a 0-100 health rating |
| **VSCode Integration** | One-click to open any file in your editor |

### For Tech Leads
| Feature | Description |
|---------|-------------|
| **Hotspot Detection** | Identify complex, frequently-changed code |
| **Technical Debt Visualization** | See legacy and abandoned code grow moss |
| **Dependency Mapping** | Understand coupling between components |
| **Recommendations** | AI-generated suggestions for improvement |

### For Teams
| Feature | Description |
|---------|-------------|
| **GitHub URL Support** | Paste any public repo URL to visualize |
| **Local Folder Analysis** | Analyze your private codebases |
| **Scales to Large Projects** | Handles thousands of files efficiently |
| **Language Agnostic** | Supports Python, JavaScript, TypeScript, Go, Rust, Java, and more |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/YashwanthKamireddi/CodebaseCity.git
cd CodebaseCity

# Start the backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# In a new terminal, start the frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and explore the demo city!

### Analyze Your Own Project

1. Click **"Analyze Project"** in the header
2. Enter a GitHub URL (e.g., `https://github.com/expressjs/express`)
3. Or enter a local folder path (e.g., `C:\Users\you\your-project`)
4. Wait for analysis to complete
5. Explore your codebase as a city!

---

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your Code     │────▶│   Analysis      │────▶│   3D City       │
│   (GitHub/Local)│     │   Engine        │     │   Visualization │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  • AST Parsing      │
                    │  • Dependency Graph │
                    │  • Clustering       │
                    │  • Metrics          │
                    └─────────────────────┘
```

**Analysis Pipeline:**
1. **Parse** — Extract AST from source files
2. **Graph** — Build dependency relationships
3. **Cluster** — Group related files into districts using Leiden algorithm
4. **Layout** — Position buildings spatially
5. **Render** — Generate interactive 3D visualization

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite |
| **3D Engine** | Three.js + React Three Fiber |
| **Styling** | Custom CSS Design System |
| **Backend** | Python FastAPI |
| **Analysis** | NetworkX + AST parsing |
| **Fonts** | Outfit, Inter, JetBrains Mono |

---

## Project Structure

```
codebase-city/
├── frontend/          # React + Three.js application
│   ├── src/
│   │   ├── components/  # UI and 3D components
│   │   ├── store/       # Zustand state management
│   │   └── index.css    # Design system
│   └── package.json
│
├── backend/           # Python FastAPI server
│   ├── api/           # REST endpoints
│   ├── parsing/       # Code analysis
│   ├── graph/         # Dependency graph + clustering
│   └── ai/            # AI chat (optional)
│
└── docs/              # Documentation + screenshots
```

---

## Configuration

### Environment Variables

```bash
# backend/.env
GEMINI_API_KEY=your_key_here  # Optional: for AI chat features
```

**Note:** The app works fully without an API key. AI chat will provide helpful static responses.

---

## Supported Languages

| Language | Extension |
|----------|-----------|
| Python | `.py` |
| JavaScript | `.js`, `.jsx` |
| TypeScript | `.ts`, `.tsx` |
| Java | `.java` |
| Go | `.go` |
| Rust | `.rs` |
| C/C++ | `.c`, `.cpp`, `.h` |
| Ruby | `.rb` |
| PHP | `.php` |
| Swift | `.swift` |
| Kotlin | `.kt` |
| C# | `.cs` |

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs** — Open an issue with reproduction steps
2. **Suggest features** — Describe your use case
3. **Submit PRs** — Fork, create a branch, and submit

### Development Setup

```bash
# Backend with auto-reload
cd backend && python -m uvicorn main:app --reload --port 8000

# Frontend with HMR
cd frontend && npm run dev
```

---

## Roadmap

- [ ] Export city as image/video
- [ ] Team collaboration features
- [ ] Git history timeline visualization
- [ ] Code coverage heatmap
- [ ] Custom themes (day/night/cyberpunk)

---

## License

MIT License — Copyright (c) 2026 Yashwanth Kamireddi

See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by Yashwanth Kamireddi**

[Report Bug](https://github.com/YashwanthKamireddi/CodebaseCity/issues) • [Request Feature](https://github.com/YashwanthKamireddi/CodebaseCity/issues) • [Star on GitHub](https://github.com/YashwanthKamireddi/CodebaseCity)

</div>
