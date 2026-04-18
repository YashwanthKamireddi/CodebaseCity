# Copilot Instructions for Codebase City

## Build, Test, Lint Commands

All commands run from the repository root:

```bash
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # Production build
npm run lint             # ESLint (max 200 warnings allowed)
npm run test             # Vitest watch mode
npm run test:run         # Single test run
npm run test:coverage    # Coverage report (70% threshold)

# Run a single test file
npx vitest run src/store/__tests__/createCitySlice.test.js

# Run tests matching a pattern
npx vitest run -t "should calculate metrics"
```

## Architecture Overview

### Data Flow Pipeline

```
GitHub URL / Local Folder / User Universe
         ↓
   ClientAnalyzer (src/engine/ClientAnalyzer.js)
         ↓
   regexParser → extracts functions, imports, complexity per file
         ↓
   NativeGraph → builds dependency graph from imports
         ↓
   louvain → detects communities (districts) via modularity optimization
         ↓
   layoutEngine → spiral treemap placement with collision resolution
         ↓
   districtGenerator → district boundaries and roads
         ↓
   Zustand Store (cityData) → React Three Fiber renders 3D scene
```

### Key Modules

| Directory | Purpose |
|-----------|---------|
| `src/engine/` | Parser, graph algorithms (Louvain, dependency builder), layout engine, GitHub API, VFS |
| `src/store/` | Zustand store with slices: City, UI, Interaction, Time, Universe, Achievement |
| `src/widgets/city-viewport/` | 3D scene components: InstancedCity, Districts, Roads, HeroLandmarks, Effects |
| `src/entities/building/` | Building model, selection panel UI, metric utilities |
| `src/features/` | AI Architect, search, explorer, timeline, analysis reports, universe browser, auth |
| `src/shared/` | Reusable UI components, animations, toasts |

### State Management Pattern

Zustand slices in `src/store/slices/`:
- `createCitySlice` — cityData, buildings, districts, loading states
- `createUISlice` — modals, panels, command palette
- `createInteractionSlice` — selection, hover, camera focus
- `createTimeSlice` — timeline playback for git history
- `createUniverseSlice` — multi-repo "Universe Mode" for browsing all user repos
- `createAchievementSlice` — gamification achievements

Access via `useStore` hook with selectors:
```jsx
const buildings = useStore(state => state.cityData?.buildings)
const selectBuilding = useStore(state => state.selectBuilding)
const enterUniverse = useStore(state => state.enterUniverse)
```

### Authentication

- **GitHub OAuth** via `/api/auth/github` serverless function
- OAuth token automatically used for GitHub API calls when logged in
- Manual PAT token fallback for non-authenticated users
- Token priority: OAuth token > manual PAT > unauthenticated (60 req/hr)

### GitHub API Layer

`src/engine/api/githubApi.js` provides:
- `ghFetch()` — cached API calls with ETag support, retry, rate limiting
- `fetchUserRepos()` — paginated fetch of all user repositories
- `fetchGitHubZipball()` — download full repo as zip for analysis
- `isOAuthAuthenticated()` — check if user has OAuth token

### 3D Rendering Architecture

- Uses React Three Fiber + drei for declarative Three.js
- `InstancedCity` renders buildings via instanced meshes for performance
- District floors, roads, and effects are separate components
- Custom shaders in `src/widgets/city-viewport/shaders/`
- `CitySpawnBurst` — particle effects when city loads

### Path Aliases

Configured in `vite.config.js` and `vitest.config.js`:
```
@/ → src/
@engine → src/engine
@features → src/features
@widgets → src/widgets
@entities → src/entities
@shared → src/shared
@store → src/store
@utils → src/utils
@hooks → src/hooks
@styles → src/styles
```

## Conventions

### Building Dimensions

- Width/Depth: log-scaled from lines of code (5–20 units)
- Height: log-scaled from complexity (4–80 units)
- Spacing: `BUILDING_SPACING = 4`, `DISTRICT_PADDING = 8`

### District Colors

15-color palette defined in `districtGenerator.js`, cycled by community index.

### ESLint Rules

- Unused vars with `_` prefix are ignored
- Max 200 warnings allowed for build to pass
- Tests (`**/*.test.js`) are excluded from linting

### Test Setup

Tests use jsdom environment with setup in `src/test/setup.js`. Coverage thresholds: 70% branches/functions/lines/statements.

### Animation Classes

Use CSS animation utilities from `src/shared/animations/animations.css`:
- `.anim-fade-in`, `.anim-slide-up`, `.anim-scale-in` — entry animations
- `.anim-bounce-in` — bouncy entrance
- `.anim-float`, `.anim-glow` — continuous effects
- `.btn-interactive` — button hover/active effects

## Environment Variables

In `.env.local`:
```
VITE_GEMINI_API_KEY=...      # Required for AI Architect feature
VITE_GITHUB_CLIENT_ID=...    # GitHub OAuth app client ID
VITE_ANALYTICS_DOMAIN=...    # Optional analytics
```

Server-side (Vercel):
```
GITHUB_CLIENT_SECRET=...     # GitHub OAuth app secret
```

## External Services

- **Gemini API** — AI Architect chat uses `gemini-2.0-flash` model
- **GitHub OAuth** — User authentication for 5,000 req/hr rate limit
- **GitHub API** — Repository fetching, user profiles, commit history
