"""
Demo City Generator - Creates a sample city for testing and demos
"""

from api.models import CityData, Building, District, Road, BuildingMetrics
import random
import math


def create_demo_city() -> CityData:
    """
    Create a demo city representing a typical web application architecture.
    Useful for testing the frontend without needing a real repository.
    """
    
    # Define demo districts
    districts = [
        District(
            id="api_district",
            name="API Gateway",
            color="#45B7D1",
            center={"x": -80, "y": 0},
            boundary=[
                {"x": -120, "y": -40},
                {"x": -40, "y": -40},
                {"x": -40, "y": 40},
                {"x": -120, "y": 40}
            ],
            building_count=5,
            description="Entry points and route handlers"
        ),
        District(
            id="services_district",
            name="Business Services",
            color="#FF6B6B",
            center={"x": 0, "y": 0},
            boundary=[
                {"x": -40, "y": -60},
                {"x": 40, "y": -60},
                {"x": 40, "y": 60},
                {"x": -40, "y": 60}
            ],
            building_count=8,
            description="Core business logic"
        ),
        District(
            id="data_district",
            name="Data Layer",
            color="#4ECDC4",
            center={"x": 80, "y": 0},
            boundary=[
                {"x": 40, "y": -40},
                {"x": 120, "y": -40},
                {"x": 120, "y": 40},
                {"x": 40, "y": 40}
            ],
            building_count=4,
            description="Database models and repositories"
        ),
        District(
            id="utils_district",
            name="Utilities",
            color="#96CEB4",
            center={"x": 0, "y": 80},
            boundary=[
                {"x": -40, "y": 60},
                {"x": 40, "y": 60},
                {"x": 40, "y": 100},
                {"x": -40, "y": 100}
            ],
            building_count=6,
            description="Shared utilities and helpers"
        ),
        District(
            id="auth_district",
            name="Authentication",
            color="#DDA0DD",
            center={"x": 0, "y": -80},
            boundary=[
                {"x": -40, "y": -100},
                {"x": 40, "y": -100},
                {"x": 40, "y": -60},
                {"x": -40, "y": -60}
            ],
            building_count=4,
            description="User authentication and authorization"
        )
    ]
    
    # Define demo buildings
    buildings = [
        # API District
        _create_building("api/routes.py", "API Gateway", "api_district", -100, -20, 150, 12, decay=0.1),
        _create_building("api/middleware.py", "API Gateway", "api_district", -80, -20, 80, 8, decay=0.3),
        _create_building("api/validators.py", "API Gateway", "api_district", -60, -20, 120, 6, decay=0.2),
        _create_building("api/responses.py", "API Gateway", "api_district", -100, 10, 60, 4, decay=0.0),
        _create_building("api/errors.py", "API Gateway", "api_district", -80, 10, 45, 3, decay=0.4),
        
        # Services District - including a "hotspot"
        _create_building("services/user_service.py", "Business Services", "services_district", -20, -40, 280, 18, decay=0.2, is_hotspot=True, churn=25),
        _create_building("services/order_service.py", "Business Services", "services_district", 10, -40, 220, 14, decay=0.1),
        _create_building("services/payment_service.py", "Business Services", "services_district", -20, -10, 180, 16, decay=0.3),
        _create_building("services/notification.py", "Business Services", "services_district", 10, -10, 100, 8, decay=0.5),
        _create_building("services/analytics.py", "Business Services", "services_district", -20, 20, 140, 10, decay=0.1),
        _create_building("services/cache.py", "Business Services", "services_district", 10, 20, 90, 6, decay=0.4),
        _create_building("services/scheduler.py", "Business Services", "services_district", -5, 40, 110, 7, decay=0.2),
        _create_building("services/legacy_billing.py", "Business Services", "services_district", 20, 40, 450, 25, decay=0.9, is_hotspot=True, churn=5),  # Old legacy code
        
        # Data District
        _create_building("models/user.py", "Data Layer", "data_district", 60, -20, 120, 8, decay=0.2),
        _create_building("models/order.py", "Data Layer", "data_district", 90, -20, 150, 10, decay=0.1),
        _create_building("repositories/user_repo.py", "Data Layer", "data_district", 60, 10, 180, 12, decay=0.3),
        _create_building("repositories/order_repo.py", "Data Layer", "data_district", 90, 10, 200, 14, decay=0.2),
        
        # Utils District - includes a "God Class"
        _create_building("utils/helpers.py", "Utilities", "utils_district", -20, 70, 320, 20, decay=0.7, deps_in=18),  # God class
        _create_building("utils/validators.py", "Utilities", "utils_district", 10, 70, 80, 5, decay=0.4),
        _create_building("utils/formatters.py", "Utilities", "utils_district", -20, 85, 60, 4, decay=0.5),
        _create_building("utils/constants.py", "Utilities", "utils_district", 10, 85, 40, 2, decay=0.2),
        _create_building("utils/logger.py", "Utilities", "utils_district", -5, 95, 100, 6, decay=0.3),
        _create_building("utils/config.py", "Utilities", "utils_district", 20, 75, 55, 3, decay=0.1),
        
        # Auth District
        _create_building("auth/login.py", "Authentication", "auth_district", -20, -85, 160, 12, decay=0.2),
        _create_building("auth/register.py", "Authentication", "auth_district", 10, -85, 140, 10, decay=0.2),
        _create_building("auth/jwt.py", "Authentication", "auth_district", -20, -70, 100, 8, decay=0.4),
        _create_building("auth/permissions.py", "Authentication", "auth_district", 10, -70, 120, 9, decay=0.3),
    ]
    
    # Define demo roads (dependencies)
    roads = [
        # API -> Services
        _create_road("api/routes.py", "services/user_service.py", is_cross=True),
        _create_road("api/routes.py", "services/order_service.py", is_cross=True),
        _create_road("api/routes.py", "services/payment_service.py", is_cross=True),
        _create_road("api/middleware.py", "auth/jwt.py", is_cross=True),
        
        # Services -> Data
        _create_road("services/user_service.py", "repositories/user_repo.py", is_cross=True),
        _create_road("services/order_service.py", "repositories/order_repo.py", is_cross=True),
        _create_road("services/user_service.py", "models/user.py", is_cross=True),
        _create_road("services/order_service.py", "models/order.py", is_cross=True),
        
        # Services -> Utils (many deps to God class)
        _create_road("services/user_service.py", "utils/helpers.py", is_cross=True, weight=2),
        _create_road("services/order_service.py", "utils/helpers.py", is_cross=True, weight=2),
        _create_road("services/payment_service.py", "utils/helpers.py", is_cross=True, weight=2),
        _create_road("services/notification.py", "utils/helpers.py", is_cross=True),
        _create_road("services/analytics.py", "utils/helpers.py", is_cross=True),
        _create_road("api/routes.py", "utils/helpers.py", is_cross=True),
        _create_road("auth/login.py", "utils/helpers.py", is_cross=True),
        
        # Services -> Auth
        _create_road("services/user_service.py", "auth/permissions.py", is_cross=True),
        _create_road("api/routes.py", "auth/login.py", is_cross=True),
        
        # Internal dependencies
        _create_road("services/order_service.py", "services/payment_service.py", is_cross=False),
        _create_road("services/payment_service.py", "services/notification.py", is_cross=False),
        _create_road("auth/login.py", "auth/jwt.py", is_cross=False),
        _create_road("auth/register.py", "auth/jwt.py", is_cross=False),
        _create_road("repositories/user_repo.py", "models/user.py", is_cross=False),
        _create_road("repositories/order_repo.py", "models/order.py", is_cross=False),
    ]
    
    return CityData(
        name="Demo Web Application",
        buildings=buildings,
        districts=districts,
        roads=roads,
        stats={
            "total_files": len(buildings),
            "total_loc": sum(b.metrics.loc for b in buildings),
            "total_districts": len(districts),
            "total_dependencies": len(roads),
            "hotspots": sum(1 for b in buildings if b.is_hotspot),
            "god_classes": 1,
            "legacy_modules": 2
        }
    )


def _create_building(
    path: str,
    district_name: str,
    district_id: str,
    x: float,
    z: float,
    loc: int,
    complexity: int,
    decay: float = 0.0,
    is_hotspot: bool = False,
    churn: int = 5,
    deps_in: int = 3
) -> Building:
    """Helper to create a building"""
    name = path.split("/")[-1]
    
    return Building(
        id=path,
        name=name,
        path=path,
        district_id=district_id,
        position={"x": x, "y": 0, "z": z},
        dimensions={
            "width": max(3, loc / 40),
            "height": max(2, complexity * 0.8),
            "depth": max(3, loc / 40)
        },
        metrics=BuildingMetrics(
            loc=loc,
            complexity=complexity,
            churn=churn,
            age_days=int(decay * 730),
            dependencies_in=deps_in,
            dependencies_out=random.randint(1, 5)
        ),
        language="python",
        decay_level=decay,
        is_hotspot=is_hotspot,
        summary=f"Module in {district_name}: {name}"
    )


def _create_road(
    source: str,
    target: str,
    is_cross: bool = False,
    weight: float = 1.0
) -> Road:
    """Helper to create a road between buildings"""
    # Simple path - actual positions will be resolved by frontend
    return Road(
        source=source,
        target=target,
        weight=weight,
        path=[
            {"x": 0, "y": 2 if is_cross else 0.5, "z": 0},
            {"x": 0, "y": 15 if is_cross else 0.5, "z": 0}
        ],
        is_cross_district=is_cross
    )
