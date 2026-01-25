from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from api.routes import city_cache # Reuse cache
from parsing.intelligence import IntelligenceEngine

router = APIRouter()

class FlowchartRequest(BaseModel):
    city_id: str
    file_path: str

@router.post("/flowchart")
async def get_flowchart(req: FlowchartRequest):
    """
    Generates a Mermaid Flowchart for the specific file.
    """
    if req.city_id not in city_cache:
         raise HTTPException(status_code=404, detail="City not loaded")

    city = city_cache[req.city_id]

    # Find file content
    # In a real app, content is in DB or FileSystem.
    # For this demo/prototype, we might need to read it from disk if not in memory.
    # The 'city' object is the Analyzed Data, it might NOT have full content for all files to save RAM.
    # But for 'generate_flowchart' we need content.

    # We should re-read the file from disk using the path.
    import os

    full_path = req.file_path
    # Security check: ensure path is within repo
    if ".." in full_path:
         raise HTTPException(status_code=400, detail="Invalid path")

    try:
        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        else:
             # Fallback if path is relative or not found
             return {"chart": "graph TD\n Error[File Not Found]"}

        chart = IntelligenceEngine.generate_flowchart(content, full_path)
        return {"chart": chart}
    except Exception as e:
        print(f"Flowchart Error: {e}")
        return {"chart": f"graph TD\n Error[Internal Error: {str(e)}]"}
