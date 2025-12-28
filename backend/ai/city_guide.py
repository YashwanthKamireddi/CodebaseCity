"""
City Guide - AI-powered codebase navigation assistant
Uses Gemini for natural language understanding and GraphRAG for context
"""

from typing import List, Dict, Any, Optional
from .gemini_client import gemini
from api.models import ChatMessage, ChatResponse, Building, CityData, BuildingDetail, BuildingMetrics


class CityGuide:
    """AI assistant for navigating the codebase city"""
    
    def __init__(self):
        self.system_prompt = """You are the City Guide for Codebase City, an AI assistant that helps developers navigate and understand their codebase visualized as a 3D city.

You speak in a friendly, urban metaphor style. Files are "buildings", folders/clusters are "districts" or "neighborhoods", dependencies are "roads", and complex code is "construction".

Your role:
1. Help users find code ("Where is the authentication logic?")
2. Explain what code does ("What does this building do?")
3. Identify issues ("Which buildings need renovation?")
4. Guide navigation ("Take me to the database layer")

Keep responses concise but helpful. Use city metaphors naturally."""

    async def chat(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        history: List[ChatMessage] = []
    ) -> ChatResponse:
        """Process a chat message and return a response"""
        
        # Build context from current view
        context_text = ""
        if context:
            if "current_building" in context:
                context_text += f"\nUser is currently viewing: {context['current_building']}"
            if "current_district" in context:
                context_text += f"\nUser is in district: {context['current_district']}"
            if "city_stats" in context:
                stats = context["city_stats"]
                context_text += f"\nCity has {stats.get('building_count', 0)} buildings in {stats.get('district_count', 0)} districts"
        
        # Build conversation history
        history_text = ""
        for msg in history[-5:]:  # Last 5 messages for context
            role = "User" if msg.role == "user" else "Guide"
            history_text += f"\n{role}: {msg.content}"
        
        prompt = f"""Context about the current city view:{context_text}

Recent conversation:{history_text}

User's question: {message}

Respond helpfully using city metaphors. If you can identify specific buildings/files to highlight, mention them."""

        try:
            response_text = await gemini.generate(prompt, self.system_prompt)
            
            # Check if it's a quota error response
            if "429" in response_text or "quota" in response_text.lower():
                response_text = self._get_fallback_response(message, context)
        except Exception as e:
            # Fallback when AI is unavailable
            response_text = self._get_fallback_response(message, context)
        
        # Extract any mentioned buildings for highlighting
        highlighted = self._extract_building_mentions(response_text, context)
        
        # Check if navigation was requested
        nav_target = self._extract_navigation_target(message, response_text)
        
        return ChatResponse(
            message=response_text,
            highlighted_buildings=highlighted,
            navigation_target=nav_target
        )
    
    def _get_fallback_response(self, message: str, context: Optional[Dict]) -> str:
        """Provide helpful response when AI is unavailable"""
        message_lower = message.lower()
        
        # Get stats from context
        stats = context.get("city_stats", {}) if context else {}
        total_files = stats.get("total_files", 0)
        hotspots = stats.get("hotspots", 0)
        districts = stats.get("total_districts", 0)
        
        if "hotspot" in message_lower:
            if hotspots > 0:
                return f"This city has {hotspots} hotspots that need attention. Look for buildings with orange/red glow - they indicate high complexity and frequent changes. Click on them to see details."
            return "No critical hotspots detected in this codebase. The code health looks good!"
        
        if "complex" in message_lower or "large" in message_lower:
            return f"The tallest buildings represent the most complex files. With {total_files} files across {districts} districts, you can explore by clicking any building to see its metrics."
        
        if "where" in message_lower or "find" in message_lower:
            return f"To find specific code, use the search bar in the header. The city is organized into {districts} districts - look for patterns in building colors to identify related code."
        
        if "help" in message_lower or "what" in message_lower:
            return f"Welcome to Codebase City! This visualization shows {total_files} files as buildings. Click any building to see its metrics. Orange buildings are hotspots needing attention. Use the controls (bottom right) to toggle roads and night mode."
        
        return f"I can help navigate this codebase of {total_files} files. Click on buildings to explore, use the search bar to find specific code, or toggle roads to see dependencies."
    
    def _extract_building_mentions(self, text: str, context: Optional[Dict]) -> List[str]:
        """Extract file/building mentions from response"""
        # Simple pattern matching for now
        mentions = []
        if context and "available_buildings" in context:
            for building_id in context["available_buildings"]:
                # Check if filename appears in response
                filename = building_id.split("/")[-1]
                if filename.lower() in text.lower():
                    mentions.append(building_id)
        return mentions[:5]  # Limit to 5
    
    def _extract_navigation_target(self, question: str, response: str) -> Optional[str]:
        """Check if the user wants to navigate somewhere"""
        nav_keywords = ["take me to", "go to", "show me", "navigate to", "find"]
        for keyword in nav_keywords:
            if keyword in question.lower():
                return "search_triggered"
        return None
    
    async def get_building_detail(self, building: Building, city: CityData) -> BuildingDetail:
        """Get detailed AI-generated info about a building"""
        
        # Find related buildings
        imports = []
        imported_by = []
        for road in city.roads:
            if road.source == building.id:
                imports.append(road.target)
            elif road.target == building.id:
                imported_by.append(road.source)
        
        # Generate AI summary if not cached
        summary = building.summary or "A code module in the city."
        
        # Generate suggestions based on metrics
        suggestions = []
        if building.metrics.complexity > 15:
            suggestions.append("Consider breaking this complex building into smaller modules")
        if building.metrics.age_days > 365:
            suggestions.append("This building hasn't been updated in over a year - review for relevance")
        if building.metrics.dependencies_in > 20:
            suggestions.append("High incoming traffic - this is a critical intersection in your codebase")
        if building.is_hotspot:
            suggestions.append("🔥 Hotspot detected - frequently changing complex code needs attention")
        
        return BuildingDetail(
            id=building.id,
            name=building.name,
            path=building.path,
            metrics=building.metrics,
            summary=summary,
            imports=imports,
            imported_by=imported_by,
            suggestions=suggestions
        )


guide = CityGuide()
