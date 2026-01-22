# Codebase City - VS Code Extension

Visualize your codebase as an interactive 3D city directly from VS Code.

## Features

### 🌆 Open City View
- Open Codebase City visualization in your browser with one click
- Keyboard shortcut: `Ctrl+Shift+C` (Mac: `Cmd+Shift+C`)

### 🔍 Analyze Workspace
- Analyze your current workspace and see it as a 3D city
- Right-click any folder in Explorer → "Analyze in Codebase City"

### 🔗 Bidirectional Sync
- **VS Code → City**: When you switch files in VS Code, the corresponding building highlights in the city
- **City → VS Code**: Click a building in the city to open that file in VS Code
- Real-time cursor position sync

### 📍 Find Current File
- Instantly locate your current file in the city visualization
- Keyboard shortcut: `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`)

## Installation

### From Source
```bash
cd vscode-extension
npm install
npm run compile
```

Then press F5 in VS Code to launch the extension in debug mode.

### Package Extension
```bash
npm install -g @vscode/vsce
vsce package
```

Install the generated `.vsix` file in VS Code.

## Requirements

- Codebase City backend server running (`uvicorn main:app --reload`)
- Codebase City frontend running (`npm run dev`)

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `codebaseCity.serverUrl` | `http://localhost:8000` | Backend server URL |
| `codebaseCity.frontendUrl` | `http://localhost:5173` | Frontend URL |
| `codebaseCity.autoSync` | `true` | Auto-sync current file with city |
| `codebaseCity.maxFiles` | `5000` | Max files to analyze |

## Commands

| Command | Description |
|---------|-------------|
| `Codebase City: Open City` | Open city view in browser |
| `Codebase City: Analyze Workspace` | Analyze current workspace |
| `Codebase City: Find Current File` | Highlight current file in city |
| `Codebase City: Start Server` | Start the backend server |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+C` | Open Codebase City |
| `Ctrl+Shift+F` | Find current file in city |

## How It Works

The extension communicates with the Codebase City frontend via WebSocket:

1. **Identification**: Extension identifies itself to the server with workspace info
2. **File Sync**: When you change files in VS Code, the extension sends the file path
3. **Building Highlight**: Frontend receives the path and highlights the matching building
4. **File Open**: When you click a building, the extension receives the path and opens it

## Development

```bash
# Watch for changes
npm run watch

# Lint
npm run lint
```

## License

MIT
