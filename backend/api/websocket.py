"""
WebSocket Handler for VS Code Integration
Enables bidirectional sync between VS Code and Codebase City frontend
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, Optional
import json
import asyncio


class ConnectionManager:
    """Manages WebSocket connections for VS Code and frontend clients"""

    def __init__(self):
        # VS Code connections (editor instances)
        self.vscode_connections: Dict[str, WebSocket] = {}

        # Frontend connections (browser instances)
        self.frontend_connections: Set[WebSocket] = set()

        # Current state for sync
        self.current_workspace: Optional[str] = None
        self.current_file: Optional[str] = None
        self.current_building: Optional[str] = None

    async def connect_vscode(self, websocket: WebSocket, workspace: str):
        """Register a VS Code connection"""
        await websocket.accept()
        self.vscode_connections[workspace] = websocket
        self.current_workspace = workspace

        # Notify frontends that VS Code connected
        await self.broadcast_to_frontends({
            "type": "vscode_connected",
            "payload": {"workspace": workspace}
        })

        # Send acknowledgment to VS Code
        await websocket.send_json({
            "type": "connected",
            "payload": {"status": "ok"}
        })

    async def connect_frontend(self, websocket: WebSocket):
        """Register a frontend connection"""
        await websocket.accept()
        self.frontend_connections.add(websocket)

        # Send current state to new frontend
        await websocket.send_json({
            "type": "sync_state",
            "payload": {
                "vscode_connected": len(self.vscode_connections) > 0,
                "current_file": self.current_file,
                "workspace": self.current_workspace
            }
        })

    def disconnect_vscode(self, workspace: str):
        """Remove a VS Code connection"""
        if workspace in self.vscode_connections:
            del self.vscode_connections[workspace]
        if not self.vscode_connections:
            self.current_workspace = None
            asyncio.create_task(self.broadcast_to_frontends({
                "type": "vscode_disconnected",
                "payload": {}
            }))

    def disconnect_frontend(self, websocket: WebSocket):
        """Remove a frontend connection"""
        self.frontend_connections.discard(websocket)

    async def broadcast_to_frontends(self, message: dict):
        """Send message to all frontend connections"""
        dead_connections = []
        for ws in self.frontend_connections:
            try:
                await ws.send_json(message)
            except:
                dead_connections.append(ws)

        for ws in dead_connections:
            self.frontend_connections.discard(ws)

    async def broadcast_to_vscode(self, message: dict):
        """Send message to all VS Code connections"""
        dead_connections = []
        for workspace, ws in self.vscode_connections.items():
            try:
                await ws.send_json(message)
            except:
                dead_connections.append(workspace)

        for workspace in dead_connections:
            del self.vscode_connections[workspace]

    async def handle_vscode_message(self, message: dict):
        """Handle message from VS Code"""
        msg_type = message.get("type")
        payload = message.get("payload", {})

        if msg_type == "identify":
            # VS Code identified itself
            self.current_workspace = payload.get("workspace")

        elif msg_type == "sync_file":
            # VS Code is syncing the active file
            self.current_file = payload.get("path")
            await self.broadcast_to_frontends({
                "type": "highlight_building",
                "payload": {"path": self.current_file, "source": "vscode"}
            })

        elif msg_type == "sync_cursor":
            # VS Code cursor moved
            await self.broadcast_to_frontends({
                "type": "cursor_position",
                "payload": {
                    "path": payload.get("path"),
                    "line": payload.get("line")
                }
            })

        elif msg_type == "highlight_building":
            # VS Code wants to highlight a building
            await self.broadcast_to_frontends({
                "type": "highlight_building",
                "payload": payload
            })

    async def handle_frontend_message(self, websocket: WebSocket, message: dict):
        """Handle message from frontend"""
        msg_type = message.get("type")
        payload = message.get("payload", {})

        if msg_type == "building_selected":
            # User clicked a building in the city
            self.current_building = payload.get("id")
            file_path = payload.get("path")

            if file_path:
                # Tell VS Code to open the file
                await self.broadcast_to_vscode({
                    "type": "open_file",
                    "payload": {
                        "path": file_path,
                        "line": payload.get("line")
                    }
                })

        elif msg_type == "building_hovered":
            # User hovering over a building
            file_path = payload.get("path")
            if file_path:
                await self.broadcast_to_vscode({
                    "type": "highlight_file",
                    "payload": {"path": file_path}
                })

        elif msg_type == "city_loaded":
            # City finished loading
            await self.broadcast_to_vscode({
                "type": "city_loaded",
                "payload": payload
            })

        elif msg_type == "request_sync":
            # Frontend requests current VS Code state
            await websocket.send_json({
                "type": "sync_state",
                "payload": {
                    "vscode_connected": len(self.vscode_connections) > 0,
                    "current_file": self.current_file,
                    "workspace": self.current_workspace
                }
            })


# Global connection manager
manager = ConnectionManager()


async def websocket_vscode(websocket: WebSocket):
    """WebSocket endpoint for VS Code extension"""
    workspace = "default"

    try:
        await manager.connect_vscode(websocket, workspace)

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Update workspace from identify message
            if message.get("type") == "identify":
                new_workspace = message.get("payload", {}).get("workspace")
                if new_workspace and new_workspace != workspace:
                    manager.disconnect_vscode(workspace)
                    workspace = new_workspace
                    manager.vscode_connections[workspace] = websocket

            await manager.handle_vscode_message(message)

    except WebSocketDisconnect:
        manager.disconnect_vscode(workspace)
    except Exception as e:
        print(f"VS Code WebSocket error: {e}")
        manager.disconnect_vscode(workspace)


async def websocket_frontend(websocket: WebSocket):
    """WebSocket endpoint for frontend browser"""
    try:
        await manager.connect_frontend(websocket)

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await manager.handle_frontend_message(websocket, message)

    except WebSocketDisconnect:
        manager.disconnect_frontend(websocket)
    except Exception as e:
        print(f"Frontend WebSocket error: {e}")
        manager.disconnect_frontend(websocket)
