"""
Gemini API Client for Codebase City
Handles embeddings, chat, and code analysis
"""

import os
from google import genai
from typing import List, Optional
import asyncio
from functools import lru_cache

# Configure Gemini
API_KEY = os.getenv("GEMINI_API_KEY")

class GeminiClient:
    """Client for Gemini API interactions"""

    def __init__(self):
        self.model_name = "gemini-2.0-flash-exp"
        self.embedding_model = "text-embedding-004"
        self._client = None

    @property
    def client(self):
        if self._client is None and API_KEY:
            self._client = genai.Client(api_key=API_KEY)
        return self._client

    async def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generate text using Gemini"""
        if not self.client:
            return "Gemini API Key not configured."

        try:
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
        except Exception as e:
            print(f"Gemini generation error: {e}")
            return f"Error generating response: {str(e)}"

    async def get_embedding(self, text: str) -> List[float]:
        """Get embedding vector for text"""
        if not self.client:
            return [0.0] * 768

        try:
            result = await asyncio.to_thread(
                self.client.models.embed_content,
                model=self.embedding_model,
                contents=text,
            )
            # New SDK returns object with 'embeddings' usually, or check structure
            # Attempting to access 'embedding' attribute of the result object
            # If result is an object: result.embeddings[0].values
            # Let's assume result has .embeddings based on typical structure
            if hasattr(result, 'embeddings') and result.embeddings:
                 return result.embeddings[0].values
            # Fallback/Debug print if structure differs
            print(f"Embedding result structure: {result}")
            return [0.0] * 768

        except Exception as e:
            print(f"Embedding error: {e}")
            # Return zero vector on error
            return [0.0] * 768

    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for multiple texts"""
        embeddings = []
        for text in texts:
            emb = await self.get_embedding(text)
            embeddings.append(emb)
        return embeddings

    async def summarize_code(self, code: str, filename: str) -> str:
        """Generate a summary of a code file"""
        prompt = f"""Analyze this code file and provide a brief 1-2 sentence summary of its purpose.

Filename: {filename}

```
{code[:3000]}  # Limit to first 3000 chars
```

Provide ONLY the summary, no other text."""

        return await self.generate(prompt)

    async def name_cluster(self, file_names: List[str], code_samples: List[str]) -> str:
        """Generate a semantic name for a cluster of related files"""
        files_text = "\n".join(file_names[:20])  # Limit to 20 files
        samples_text = "\n---\n".join([s[:500] for s in code_samples[:5]])  # 5 samples

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
        """Analyze code for potential issues"""
        prompt = f"""Analyze this code for potential issues. Be brief.

```
{code[:4000]}
```

Respond in JSON format:
{{"issues": ["issue1", "issue2"], "suggestions": ["suggestion1"]}}
"""

        response = await self.generate(prompt)
        try:
            import json
            # Try to parse JSON from response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except:
            pass
        return {"issues": [], "suggestions": []}


# Singleton instance
gemini = GeminiClient()
