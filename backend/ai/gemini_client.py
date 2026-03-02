"""
Gemini API Client for Codebase City
Handles embeddings, chat, and code analysis with retry logic.
"""

import os
import asyncio
import json
from typing import List, Optional
from functools import lru_cache

from google import genai

from core.config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

# Max retries for transient API errors
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0  # seconds


async def _retry_with_backoff(coro_factory, operation: str):
    """Execute an async operation with exponential backoff on transient errors."""
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            return await coro_factory()
        except Exception as e:
            last_error = e
            error_str = str(e)
            # Retry on rate limits (429) and server errors (5xx)
            is_transient = "429" in error_str or "500" in error_str or "503" in error_str
            if is_transient and attempt < MAX_RETRIES - 1:
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning(
                    f"{operation} failed (attempt {attempt + 1}/{MAX_RETRIES}), "
                    f"retrying in {delay}s: {e}"
                )
                await asyncio.sleep(delay)
            else:
                raise
    raise last_error  # Should never reach here, but satisfies type checker


class GeminiClient:
    """Client for Gemini API interactions with retry and config-driven settings."""

    def __init__(self):
        self.model_name = settings.ai_model
        self.embedding_model = "text-embedding-004"
        self._client = None
        self._api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY")

    @property
    def client(self):
        if self._client is None and self._api_key:
            self._client = genai.Client(api_key=self._api_key)
        return self._client

    async def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generate text using Gemini with retry logic."""
        if not self.client:
            return "Gemini API Key not configured."

        async def _call():
            config = {}
            if system_instruction:
                config['system_instruction'] = system_instruction

            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model_name,
                contents=prompt,
                config=config
            )
            return response.text

        try:
            return await _retry_with_backoff(_call, "Gemini generation")
        except Exception as e:
            logger.error(f"Gemini generation failed after {MAX_RETRIES} attempts: {e}")
            return f"Error generating response: {str(e)}"

    async def get_embedding(self, text: str) -> List[float]:
        """Get embedding vector for text with retry logic."""
        if not self.client:
            return [0.0] * 768

        async def _call():
            result = await asyncio.to_thread(
                self.client.models.embed_content,
                model=self.embedding_model,
                contents=text,
            )
            if hasattr(result, 'embeddings') and result.embeddings:
                return result.embeddings[0].values
            logger.warning(f"Unexpected embedding result structure: {type(result)}")
            return [0.0] * 768

        try:
            return await _retry_with_backoff(_call, "Embedding")
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            return [0.0] * 768

    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for multiple texts concurrently."""
        if not texts:
            return []

        # Process in concurrent batches (limit concurrency to avoid rate limits)
        semaphore = asyncio.Semaphore(5)

        async def _get_with_limit(text: str) -> List[float]:
            async with semaphore:
                return await self.get_embedding(text)

        return await asyncio.gather(*[_get_with_limit(t) for t in texts])

    async def summarize_code(self, code: str, filename: str) -> str:
        """Generate a summary of a code file."""
        prompt = f"""Analyze this code file and provide a brief 1-2 sentence summary of its purpose.

Filename: {filename}

```
{code[:3000]}
```

Provide ONLY the summary, no other text."""

        return await self.generate(prompt)

    async def name_cluster(self, file_names: List[str], code_samples: List[str]) -> str:
        """Generate a semantic name for a cluster of related files."""
        files_text = "\n".join(file_names[:20])
        samples_text = "\n---\n".join([s[:500] for s in code_samples[:5]])

        prompt = f"""These files appear to be related. Generate a short, descriptive name (2-4 words) for this group.
The name should describe their collective purpose like a neighborhood name.

Files in this cluster:
{files_text}

Sample code snippets:
{samples_text}

Respond with ONLY the cluster name, like: "Authentication Services" or "Data Processing" or "UI Components"
"""

        name = await self.generate(prompt)
        return name.strip().strip('"\'')

    async def analyze_dependencies(self, code: str) -> dict:
        """Analyze code for potential issues."""
        prompt = f"""Analyze this code for potential issues. Be brief.

```
{code[:4000]}
```

Respond in JSON format:
{{"issues": ["issue1", "issue2"], "suggestions": ["suggestion1"]}}
"""

        response = await self.generate(prompt)
        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse dependency analysis JSON: {e}")
        return {"issues": [], "suggestions": []}


# Singleton instance
gemini = GeminiClient()
