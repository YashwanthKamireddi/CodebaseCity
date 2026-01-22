/**
 * Webview Provider - Embedded city view in VS Code sidebar
 */

import * as vscode from 'vscode';
import { CityBridge } from './cityBridge';

export class CityWebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private context: vscode.ExtensionContext;
    private bridge: CityBridge;

    constructor(context: vscode.ExtensionContext, bridge: CityBridge) {
        this.context = context;
        this.bridge = bridge;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getHtmlContent();

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'openCity':
                    await vscode.commands.executeCommand('codebaseCity.openCity');
                    break;
                case 'analyze':
                    await vscode.commands.executeCommand('codebaseCity.analyzeWorkspace');
                    break;
                case 'checkStatus':
                    const isRunning = await this.bridge.checkServerStatus();
                    webviewView.webview.postMessage({ type: 'status', running: isRunning });
                    break;
            }
        });
    }

    private getHtmlContent(): string {
        const config = vscode.workspace.getConfiguration('codebaseCity');
        const frontendUrl = config.get<string>('frontendUrl', 'http://localhost:5173');
        const workspaceName = vscode.workspace.workspaceFolders?.[0]?.name || 'No workspace';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            padding: 12px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
        }
        .header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }
        .header h2 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: 6px;
            background: var(--vscode-input-background);
            margin-bottom: 12px;
            font-size: 12px;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ef4444;
        }
        .status-dot.connected {
            background: #22c55e;
        }
        .workspace {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 16px;
            padding: 8px;
            background: var(--vscode-input-background);
            border-radius: 4px;
        }
        button {
            width: 100%;
            padding: 10px 16px;
            margin-bottom: 8px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }
        .btn-primary {
            background: linear-gradient(135deg, #818cf8, #6366f1);
            color: white;
        }
        .btn-primary:hover {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .shortcuts {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .shortcuts h3 {
            font-size: 11px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            margin: 0 0 8px 0;
            text-transform: uppercase;
        }
        .shortcut {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            padding: 4px 0;
        }
        kbd {
            background: var(--vscode-input-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 11px;
        }
        .icon {
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="icon">🏙️</span>
        <h2>Codebase City</h2>
    </div>

    <div class="status">
        <span class="status-dot" id="statusDot"></span>
        <span id="statusText">Checking server...</span>
    </div>

    <div class="workspace">
        📁 ${workspaceName}
    </div>

    <button class="btn-primary" onclick="openCity()">
        🌆 Open City View
    </button>

    <button class="btn-secondary" onclick="analyzeWorkspace()">
        🔍 Analyze Workspace
    </button>

    <button class="btn-secondary" onclick="findCurrentFile()">
        📍 Find Current File
    </button>

    <div class="shortcuts">
        <h3>Keyboard Shortcuts</h3>
        <div class="shortcut">
            <span>Open City</span>
            <kbd>Ctrl+Shift+C</kbd>
        </div>
        <div class="shortcut">
            <span>Find in City</span>
            <kbd>Ctrl+Shift+F</kbd>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function openCity() {
            vscode.postMessage({ type: 'openCity' });
        }

        function analyzeWorkspace() {
            vscode.postMessage({ type: 'analyze' });
        }

        function findCurrentFile() {
            vscode.postMessage({ type: 'findInCity' });
        }

        function checkStatus() {
            vscode.postMessage({ type: 'checkStatus' });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'status') {
                const dot = document.getElementById('statusDot');
                const text = document.getElementById('statusText');
                if (message.running) {
                    dot.classList.add('connected');
                    text.textContent = 'Server running';
                } else {
                    dot.classList.remove('connected');
                    text.textContent = 'Server not running';
                }
            }
        });

        // Check status on load and periodically
        checkStatus();
        setInterval(checkStatus, 10000);
    </script>
</body>
</html>`;
    }
}
