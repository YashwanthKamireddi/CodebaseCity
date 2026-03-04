# Contributing to Codebase City

Thanks for wanting to help! This guide will get you up and running.

## Development Setup

```bash
# Clone
git clone https://github.com/YashwanthKamireddi/CodebaseCity.git
cd CodebaseCity

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Add your GEMINI_API_KEY
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Project Structure

| Directory | What it does |
|-----------|-------------|
| `frontend/src/widgets/` | 3D viewport, layout shell, debug HUD |
| `frontend/src/features/` | Analysis, search, timeline, AI chat |
| `frontend/src/entities/` | Building panel, code viewer |
| `frontend/src/store/` | Zustand state management (slices) |
| `backend/api/routes/` | FastAPI REST endpoints |
| `backend/parsing/` | Tree-sitter AST parser + metrics |
| `backend/graph/` | NetworkX + Leiden clustering + layout |
| `backend/ai/` | Gemini integration |

## Making Changes

1. **Fork** the repo and create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make your changes** — keep commits small and focused.

3. **Test locally** — make sure the frontend builds and backend starts:
   ```bash
   cd frontend && npm run build
   cd backend && python -m pytest
   ```

4. **Open a PR** with a clear description of what you changed and why.

## What to Contribute

### Good First Issues
- Add syntax highlighting in the inline code viewer
- Improve mobile/touch controls
- Write unit tests for graph clustering

### Medium
- Add Tree-sitter grammar for a new language (Java, Go, Rust)
- New color modes (by author, by file age, by test coverage)
- Improve district boundary rendering

### Advanced
- WebGL performance optimizations for 50K+ file repos
- Multiplayer city exploration via WebRTC
- Git blame integration (author heatmap)

## Code Style

- **Frontend:** ESLint defaults, functional React components, Zustand for state
- **Backend:** Ruff + Black formatting, type hints, Pydantic models

## Reporting Bugs

Open an issue with:
1. What you expected
2. What actually happened
3. Steps to reproduce
4. Screenshots (if visual)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
