"""
Chat Routes
AI City Guide conversation endpoint.
"""

from fastapi import APIRouter, HTTPException

from utils.logger import get_logger

from api.models import ChatRequest, ChatResponse

from ai.city_guide import CityGuide

logger = get_logger(__name__)

router = APIRouter()

# Singleton service
guide = CityGuide()


@router.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_with_guide(request: ChatRequest):
    """
    Chat with the AI City Guide about the codebase.

    The guide can help navigate the city, explain code, and identify issues.
    """
    try:
        response = await guide.chat(
            message=request.message,
            context=request.context,
            history=request.history
        )
        return response
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail="Chat service unavailable")
