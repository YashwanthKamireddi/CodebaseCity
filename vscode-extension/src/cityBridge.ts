/**
 * City Bridge - WebSocket bridge for bidirectional sync
 *
 * Handles real-time communication between VS Code and Codebase City frontend
 */

import * as vscode from 'vscode';
import WebSocket from 'ws';

interface CityMessage {
    type: string;
    payload: any;
}

export class CityBridge {
    private ws: WebSocket | null = null;
    private context: vscode.ExtensionContext;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isConnected = false;

    // Event callbacks
    private onOpenFileCallback: ((path: string, line?: number) => void) | null = null;
    private onHighlightCallback: ((path: string) => void) | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Connect to the Codebase City WebSocket server
     */
    async connect(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('codebaseCity');
        const serverUrl = config.get<string>('serverUrl', 'http://localhost:8000');
        const wsUrl = serverUrl.replace('http', 'ws') + '/ws/vscode';

        return new Promise((resolve) => {
            try {
                this.ws = new WebSocket(wsUrl);

                this.ws.on('open', () => {
                    console.log('Connected to Codebase City');
                    this.isConnected = true;
                    this.sendIdentification();
                    resolve(true);
                });

                this.ws.on('message', (data) => {
                    this.handleMessage(data.toString());
                });

                this.ws.on('close', () => {
                    console.log('Disconnected from Codebase City');
                    this.isConnected = false;
                    this.scheduleReconnect();
                    resolve(false);
                });

                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.isConnected = false;
                    resolve(false);
                });

                // Timeout if can't connect
                setTimeout(() => {
                    if (!this.isConnected) {
                        this.ws?.close();
                        resolve(false);
                    }
                }, 5000);

            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                resolve(false);
            }
        });
    }

    /**
     * Disconnect from the server
     */
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        this.ws?.close();
        this.ws = null;
        this.isConnected = false;
    }

    /**
     * Check if the backend server is running
     */
    async checkServerStatus(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('codebaseCity');
        const serverUrl = config.get<string>('serverUrl', 'http://localhost:8000');

        try {
            const response = await fetch(`${serverUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Analyze a workspace folder
     */
    async analyzeWorkspace(folderPath: string): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('codebaseCity');
        const serverUrl = config.get<string>('serverUrl', 'http://localhost:8000');
        const maxFiles = config.get<number>('maxFiles', 5000);

        try {
            const response = await fetch(`${serverUrl}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: folderPath, max_files: maxFiles })
            });
            return response.ok;
        } catch (error) {
            console.error('Analysis error:', error);
            return false;
        }
    }

    /**
     * Send current file to city for highlighting
     */
    syncActiveFile(filePath: string) {
        this.send({
            type: 'sync_file',
            payload: { path: filePath }
        });
    }

    /**
     * Send cursor position for line-level sync
     */
    syncCursorPosition(filePath: string, line: number) {
        this.send({
            type: 'sync_cursor',
            payload: { path: filePath, line }
        });
    }

    /**
     * Request city to highlight a specific building
     */
    async highlightBuilding(filePath: string) {
        this.send({
            type: 'highlight_building',
            payload: { path: filePath }
        });
    }

    /**
     * Register callback for "open file" requests from city
     */
    onOpenFile(callback: (path: string, line?: number) => void) {
        this.onOpenFileCallback = callback;
    }

    /**
     * Register callback for "highlight file" requests from city
     */
    onHighlightFile(callback: (path: string) => void) {
        this.onHighlightCallback = callback;
    }

    // --- Private Methods ---

    private sendIdentification() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        this.send({
            type: 'identify',
            payload: {
                client: 'vscode',
                workspace: workspaceFolder,
                version: this.context.extension.packageJSON.version
            }
        });
    }

    private handleMessage(data: string) {
        try {
            const message: CityMessage = JSON.parse(data);

            switch (message.type) {
                case 'open_file':
                    // City requests to open a file
                    if (this.onOpenFileCallback) {
                        this.onOpenFileCallback(message.payload.path, message.payload.line);
                    }
                    break;

                case 'highlight_file':
                    // City requests to highlight a file in explorer
                    if (this.onHighlightCallback) {
                        this.onHighlightCallback(message.payload.path);
                    }
                    break;

                case 'building_selected':
                    // User selected a building in the city
                    if (this.onOpenFileCallback && message.payload.path) {
                        this.onOpenFileCallback(message.payload.path);
                    }
                    break;

                case 'connected':
                    console.log('City acknowledged connection');
                    vscode.commands.executeCommand('setContext', 'codebaseCity.connected', true);
                    break;

                case 'city_loaded':
                    // City finished loading, we can sync current file
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        this.syncActiveFile(editor.document.uri.fsPath);
                    }
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    private send(message: CityMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            const connected = await this.connect();
            if (connected) {
                vscode.commands.executeCommand('setContext', 'codebaseCity.connected', true);
            }
        }, 5000);
    }
}
