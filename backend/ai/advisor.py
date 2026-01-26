import logging
from typing import Optional
try:
    from .gemini_client import GeminiClient
except ImportError:
    GeminiClient = None

logger = logging.getLogger(__name__)

class ArchitectureAdvisor:
    """
    AI Advisor for Architectural Decisions.
    Uses Gemini if available, otherwise falls back to static advice.
    """
    def __init__(self):
        self.client = GeminiClient() if GeminiClient else None

    async def get_migration_advice(self, context: str) -> str:
        if not self.client:
            return "AI Advisor not available. Please configure GEMINI_API_KEY."

        prompt = f"""
        You are an Expert Software Architect.
        Analyze the following codebase context and provide a migration strategy to Feature-Sliced Design (FSD).

        Context:
        {context}

        Provide concise, actionable steps.
        """
        try:
            return await self.client.generate_content(prompt)
        except Exception as e:
            logger.error(f"Advisor Error: {e}")
            return "Unable to generate advice at this time."
