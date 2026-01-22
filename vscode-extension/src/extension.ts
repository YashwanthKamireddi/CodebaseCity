/**
 * Codebase City - VS Code Extension
 *
 * Features:
 * - Open Codebase City visualization directly in VS Code
 * - Bidirectional sync: hover in VS Code → highlight building in city
 * - Click building in city → open file in VS Code
 * - Analyze workspace with one click
 */

import * as vscode from 'vscode';
import { CityBridge } from './cityBridge';
import { CityWebviewProvider } from './webviewProvider';

let cityBridge: CityBridge | null = null;
let webviewProvider: CityWebviewProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('Codebase City extension activating...');

    // Initialize the bridge for bidirectional communication
    cityBridge = new CityBridge(context);

    // Initialize webview provider for embedded city view
    webviewProvider = new CityWebviewProvider(context, cityBridge);

    // Register the webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'codebaseCity.cityView',
            webviewProvider
        )
    );

    // Command: Open City in browser
    context.subscriptions.push(
        vscode.commands.registerCommand('codebaseCity.openCity', async () => {
            const config = vscode.workspace.getConfiguration('codebaseCity');
            const frontendUrl = config.get<string>('frontendUrl', 'http://localhost:5173');

            // Check if server is running
            const isRunning = await cityBridge?.checkServerStatus();
            if (!isRunning) {
                const action = await vscode.window.showWarningMessage(
                    'Codebase City server is not running. Would you like to start it?',
                    'Start Server',
                    'Open Anyway'
                );
                if (action === 'Start Server') {
                    await vscode.commands.executeCommand('codebaseCity.startServer');
                }
            }

            vscode.env.openExternal(vscode.Uri.parse(frontendUrl));
            vscode.window.showInformationMessage('Opening Codebase City...');
        })
    );

    // Command: Analyze current workspace
    context.subscriptions.push(
        vscode.commands.registerCommand('codebaseCity.analyzeWorkspace', async (uri?: vscode.Uri) => {
            let folderPath: string;

            if (uri) {
                folderPath = uri.fsPath;
            } else if (vscode.workspace.workspaceFolders?.[0]) {
                folderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            } else {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing codebase...',
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ increment: 10, message: 'Connecting to server...' });

                    const success = await cityBridge?.analyzeWorkspace(folderPath);

                    if (success) {
                        progress.report({ increment: 90, message: 'Opening city view...' });

                        // Open city in browser
                        const config = vscode.workspace.getConfiguration('codebaseCity');
                        const frontendUrl = config.get<string>('frontendUrl', 'http://localhost:5173');
                        vscode.env.openExternal(vscode.Uri.parse(frontendUrl));

                        vscode.window.showInformationMessage(
                            `Codebase City: Analyzed ${folderPath.split('/').pop()}`
                        );
                    } else {
                        throw new Error('Analysis failed');
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to analyze: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            });
        })
    );

    // Command: Find current file in city
    context.subscriptions.push(
        vscode.commands.registerCommand('codebaseCity.findInCity', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No file open');
                return;
            }

            const filePath = editor.document.uri.fsPath;
            await cityBridge?.highlightBuilding(filePath);
            vscode.window.showInformationMessage(`Finding ${filePath.split('/').pop()} in city...`);
        })
    );

    // Command: Start Codebase City server
    context.subscriptions.push(
        vscode.commands.registerCommand('codebaseCity.startServer', async () => {
            const terminal = vscode.window.createTerminal({
                name: 'Codebase City Server',
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            });

            terminal.show();
            terminal.sendText('cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000');

            vscode.window.showInformationMessage('Starting Codebase City server...');
        })
    );

    // Setup bidirectional sync
    setupBidirectionalSync(context, cityBridge);

    // Set context for menu visibility
    vscode.commands.executeCommand('setContext', 'codebaseCity.connected', false);

    // Try to connect to existing server
    cityBridge.connect().then(connected => {
        vscode.commands.executeCommand('setContext', 'codebaseCity.connected', connected);
    });

    console.log('Codebase City extension activated!');
}

/**
 * Setup bidirectional sync between VS Code and City
 */
function setupBidirectionalSync(context: vscode.ExtensionContext, bridge: CityBridge) {
    const config = vscode.workspace.getConfiguration('codebaseCity');
    const autoSync = config.get<boolean>('autoSync', true);

    if (!autoSync) return;

    // Sync on active editor change
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                bridge.syncActiveFile(editor.document.uri.fsPath);
            }
        })
    );

    // Sync on cursor position change (optional, for line-level sync)
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection((event) => {
            const filePath = event.textEditor.document.uri.fsPath;
            const line = event.selections[0].active.line + 1;
            bridge.syncCursorPosition(filePath, line);
        })
    );

    // Listen for "open file" requests from the city
    bridge.onOpenFile((filePath: string, line?: number) => {
        openFileInEditor(filePath, line);
    });

    // Listen for "highlight" requests from the city
    bridge.onHighlightFile((filePath: string) => {
        highlightFileInExplorer(filePath);
    });
}

/**
 * Open a file in VS Code editor
 */
async function openFileInEditor(filePath: string, line?: number) {
    try {
        const doc = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(doc);

        if (line !== undefined) {
            const position = new vscode.Position(line - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(
                new vscode.Range(position, position),
                vscode.TextEditorRevealType.InCenter
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Cannot open file: ${filePath}`);
    }
}

/**
 * Highlight a file in the explorer
 */
async function highlightFileInExplorer(filePath: string) {
    try {
        const uri = vscode.Uri.file(filePath);
        await vscode.commands.executeCommand('revealInExplorer', uri);
    } catch (error) {
        console.error('Cannot highlight file:', error);
    }
}

export function deactivate() {
    cityBridge?.disconnect();
    console.log('Codebase City extension deactivated');
}
