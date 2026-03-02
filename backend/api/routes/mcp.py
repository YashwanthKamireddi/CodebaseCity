from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any

from api.websocket import manager
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

@router.post("/mcp/notify", tags=["MCP"])
async def mcp_notify(request: Request):
    """
    Internal endpoint called by the standalone mcp_server.py
    to trigger real-time UI updates (like showing Blast Radius).
    """
    try:
        payload = await request.json()
        event_type = payload.get("type")

        if not event_type:
            raise HTTPException(status_code=400, detail="Missing 'type' in payload")

        logger.info(f"[MCP] Received notification: {event_type}")

        # Broadcast the event to all connected frontends
        await manager.broadcast_to_frontends({
            "type": event_type,
            "payload": payload.get("data", {})
        })

        return {"status": "success"}
    except Exception as e:
        logger.error(f"[MCP] Notification failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
