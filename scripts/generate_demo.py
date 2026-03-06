#!/usr/bin/env python3
"""
Generate a world-class demo-city.json for the landing page.

Project: "NexusForge" — A realistic full-stack SaaS platform.
Showcases all Code City features: multi-language, hotspots, legacy code,
god classes, cross-district dependencies, functions, classes, and realistic metrics.

Uses the same spiral-treemap + grid layout as graphEngine.js.
"""

import json
import math
import hashlib
import random

random.seed(42)  # Deterministic output

# ── Layout constants (match graphEngine.js) ──────────────────────────
BUILDING_SPACING = 3
DISTRICT_PADDING = 8
MAX_BUILDING_WIDTH = 20

# ── District definitions ─────────────────────────────────────────────
DISTRICTS = [
    {
        "id": "district_0",
        "name": "Frontend Components",
        "color": "#45B7D1",
        "description": "React UI components and pages",
        "files": [
            {
                "path": "src/components/Dashboard.tsx",
                "loc": 486, "complexity": 22, "churn": 38, "age_days": 12,
                "deps_in": 8, "deps_out": 6, "language": "typescript",
                "is_hotspot": True,
                "functions": [
                    {"name": "Dashboard", "line": 15, "end_line": 120},
                    {"name": "MetricsGrid", "line": 122, "end_line": 180},
                    {"name": "ActivityFeed", "line": 182, "end_line": 250},
                    {"name": "QuickActions", "line": 252, "end_line": 310},
                    {"name": "useDashboardData", "line": 312, "end_line": 380},
                ],
                "classes": [],
            },
            {
                "path": "src/components/FileExplorer.tsx",
                "loc": 624, "complexity": 28, "churn": 45, "age_days": 8,
                "deps_in": 5, "deps_out": 7, "language": "typescript",
                "is_hotspot": True,
                "functions": [
                    {"name": "FileExplorer", "line": 18, "end_line": 150},
                    {"name": "FileTree", "line": 152, "end_line": 280},
                    {"name": "FilePreview", "line": 282, "end_line": 380},
                    {"name": "BreadcrumbNav", "line": 382, "end_line": 430},
                    {"name": "useFileNavigation", "line": 432, "end_line": 520},
                    {"name": "handleDragDrop", "line": 522, "end_line": 600},
                ],
                "classes": [],
            },
            {
                "path": "src/components/SharePanel.tsx",
                "loc": 340, "complexity": 15, "churn": 18, "age_days": 25,
                "deps_in": 3, "deps_out": 5, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "SharePanel", "line": 12, "end_line": 120},
                    {"name": "PermissionSelector", "line": 122, "end_line": 200},
                    {"name": "ShareLink", "line": 202, "end_line": 280},
                    {"name": "CollaboratorList", "line": 282, "end_line": 340},
                ],
                "classes": [],
            },
            {
                "path": "src/components/UploadWidget.tsx",
                "loc": 290, "complexity": 14, "churn": 22, "age_days": 15,
                "deps_in": 4, "deps_out": 4, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "UploadWidget", "line": 10, "end_line": 100},
                    {"name": "DropZone", "line": 102, "end_line": 180},
                    {"name": "ProgressTracker", "line": 182, "end_line": 250},
                    {"name": "useChunkedUpload", "line": 252, "end_line": 290},
                ],
                "classes": [],
            },
            {
                "path": "src/components/Analytics.tsx",
                "loc": 410, "complexity": 18, "churn": 12, "age_days": 30,
                "deps_in": 2, "deps_out": 5, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "Analytics", "line": 14, "end_line": 100},
                    {"name": "UsageChart", "line": 102, "end_line": 200},
                    {"name": "StorageBreakdown", "line": 202, "end_line": 300},
                    {"name": "TrendLine", "line": 302, "end_line": 380},
                ],
                "classes": [],
            },
            {
                "path": "src/components/UserSettings.tsx",
                "loc": 380, "complexity": 16, "churn": 8, "age_days": 45,
                "deps_in": 2, "deps_out": 4, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "UserSettings", "line": 12, "end_line": 100},
                    {"name": "ProfileForm", "line": 102, "end_line": 180},
                    {"name": "SecuritySettings", "line": 182, "end_line": 260},
                    {"name": "NotificationPrefs", "line": 262, "end_line": 340},
                ],
                "classes": [],
            },
            {
                "path": "src/components/NotificationCenter.tsx",
                "loc": 220, "complexity": 10, "churn": 14, "age_days": 20,
                "deps_in": 3, "deps_out": 3, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "NotificationCenter", "line": 8, "end_line": 80},
                    {"name": "NotificationItem", "line": 82, "end_line": 150},
                    {"name": "useNotifications", "line": 152, "end_line": 220},
                ],
                "classes": [],
            },
            {
                "path": "src/components/SearchModal.tsx",
                "loc": 260, "complexity": 12, "churn": 10, "age_days": 35,
                "deps_in": 2, "deps_out": 4, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "SearchModal", "line": 10, "end_line": 100},
                    {"name": "SearchResults", "line": 102, "end_line": 180},
                    {"name": "useDebounceSearch", "line": 182, "end_line": 230},
                ],
                "classes": [],
            },
            {
                "path": "src/components/Sidebar.tsx",
                "loc": 180, "complexity": 8, "churn": 6, "age_days": 60,
                "deps_in": 1, "deps_out": 3, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "Sidebar", "line": 8, "end_line": 120},
                    {"name": "NavSection", "line": 122, "end_line": 180},
                ],
                "classes": [],
            },
            {
                "path": "src/components/DataGrid.tsx",
                "loc": 520, "complexity": 24, "churn": 30, "age_days": 14,
                "deps_in": 6, "deps_out": 3, "language": "typescript",
                "is_hotspot": True,
                "functions": [
                    {"name": "DataGrid", "line": 16, "end_line": 140},
                    {"name": "ColumnHeader", "line": 142, "end_line": 220},
                    {"name": "VirtualRow", "line": 222, "end_line": 300},
                    {"name": "useVirtualScroll", "line": 302, "end_line": 400},
                    {"name": "SortEngine", "line": 402, "end_line": 480},
                ],
                "classes": [],
            },
        ],
    },
    {
        "id": "district_1",
        "name": "React Hooks & State",
        "color": "#74B9FF",
        "description": "Custom hooks and Zustand state management",
        "files": [
            {
                "path": "src/hooks/useAuth.ts",
                "loc": 180, "complexity": 12, "churn": 8, "age_days": 40,
                "deps_in": 10, "deps_out": 2, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "useAuth", "line": 8, "end_line": 100},
                    {"name": "refreshToken", "line": 102, "end_line": 140},
                    {"name": "logoutCleanup", "line": 142, "end_line": 180},
                ],
                "classes": [],
            },
            {
                "path": "src/hooks/useFiles.ts",
                "loc": 240, "complexity": 14, "churn": 20, "age_days": 18,
                "deps_in": 8, "deps_out": 3, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "useFiles", "line": 6, "end_line": 120},
                    {"name": "useFileOperations", "line": 122, "end_line": 200},
                    {"name": "useFileCache", "line": 202, "end_line": 240},
                ],
                "classes": [],
            },
            {
                "path": "src/hooks/useUpload.ts",
                "loc": 160, "complexity": 10, "churn": 12, "age_days": 22,
                "deps_in": 4, "deps_out": 2, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "useUpload", "line": 5, "end_line": 100},
                    {"name": "useChunkUpload", "line": 102, "end_line": 160},
                ],
                "classes": [],
            },
            {
                "path": "src/hooks/useSearch.ts",
                "loc": 120, "complexity": 6, "churn": 4, "age_days": 50,
                "deps_in": 3, "deps_out": 2, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "useSearch", "line": 4, "end_line": 80},
                    {"name": "buildQuery", "line": 82, "end_line": 120},
                ],
                "classes": [],
            },
            {
                "path": "src/hooks/useWebSocket.ts",
                "loc": 200, "complexity": 14, "churn": 6, "age_days": 55,
                "deps_in": 5, "deps_out": 1, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "useWebSocket", "line": 8, "end_line": 120},
                    {"name": "handleReconnect", "line": 122, "end_line": 170},
                    {"name": "parseMessage", "line": 172, "end_line": 200},
                ],
                "classes": [],
            },
            {
                "path": "src/store/appStore.ts",
                "loc": 310, "complexity": 16, "churn": 28, "age_days": 10,
                "deps_in": 12, "deps_out": 4, "language": "typescript",
                "is_hotspot": True,
                "functions": [
                    {"name": "createAppSlice", "line": 10, "end_line": 120},
                    {"name": "createFileSlice", "line": 122, "end_line": 200},
                    {"name": "createAuthSlice", "line": 202, "end_line": 260},
                    {"name": "createUISlice", "line": 262, "end_line": 310},
                ],
                "classes": [],
            },
        ],
    },
    {
        "id": "district_2",
        "name": "API Routes",
        "color": "#FF6B6B",
        "description": "FastAPI route handlers and middleware",
        "files": [
            {
                "path": "api/routes/auth_routes.py",
                "loc": 210, "complexity": 14, "churn": 10, "age_days": 35,
                "deps_in": 3, "deps_out": 5, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "login", "line": 15, "end_line": 50},
                    {"name": "register", "line": 52, "end_line": 100},
                    {"name": "refresh_token", "line": 102, "end_line": 140},
                    {"name": "logout", "line": 142, "end_line": 170},
                    {"name": "verify_email", "line": 172, "end_line": 210},
                ],
                "classes": [],
            },
            {
                "path": "api/routes/file_routes.py",
                "loc": 380, "complexity": 20, "churn": 32, "age_days": 6,
                "deps_in": 4, "deps_out": 6, "language": "python",
                "is_hotspot": True,
                "functions": [
                    {"name": "list_files", "line": 18, "end_line": 60},
                    {"name": "upload_file", "line": 62, "end_line": 140},
                    {"name": "download_file", "line": 142, "end_line": 200},
                    {"name": "delete_file", "line": 202, "end_line": 250},
                    {"name": "move_file", "line": 252, "end_line": 310},
                    {"name": "copy_file", "line": 312, "end_line": 380},
                ],
                "classes": [],
            },
            {
                "path": "api/routes/share_routes.py",
                "loc": 250, "complexity": 14, "churn": 15, "age_days": 20,
                "deps_in": 2, "deps_out": 4, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "create_share", "line": 12, "end_line": 70},
                    {"name": "revoke_share", "line": 72, "end_line": 120},
                    {"name": "list_shares", "line": 122, "end_line": 180},
                    {"name": "update_permissions", "line": 182, "end_line": 250},
                ],
                "classes": [],
            },
            {
                "path": "api/routes/search_routes.py",
                "loc": 150, "complexity": 8, "churn": 5, "age_days": 45,
                "deps_in": 2, "deps_out": 3, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "search_files", "line": 10, "end_line": 60},
                    {"name": "search_content", "line": 62, "end_line": 110},
                    {"name": "search_suggest", "line": 112, "end_line": 150},
                ],
                "classes": [],
            },
            {
                "path": "api/routes/admin_routes.py",
                "loc": 280, "complexity": 16, "churn": 8, "age_days": 30,
                "deps_in": 1, "deps_out": 5, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "list_users", "line": 15, "end_line": 50},
                    {"name": "manage_quotas", "line": 52, "end_line": 120},
                    {"name": "system_health", "line": 122, "end_line": 180},
                    {"name": "audit_log", "line": 182, "end_line": 240},
                    {"name": "force_gc", "line": 242, "end_line": 280},
                ],
                "classes": [],
            },
            {
                "path": "api/middleware.py",
                "loc": 160, "complexity": 12, "churn": 4, "age_days": 60,
                "deps_in": 6, "deps_out": 2, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "auth_middleware", "line": 8, "end_line": 50},
                    {"name": "rate_limiter", "line": 52, "end_line": 100},
                    {"name": "cors_handler", "line": 102, "end_line": 130},
                    {"name": "request_logger", "line": 132, "end_line": 160},
                ],
                "classes": [],
            },
            {
                "path": "api/routes/webhook_handler.py",
                "loc": 190, "complexity": 12, "churn": 6, "age_days": 40,
                "deps_in": 2, "deps_out": 4, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "handle_webhook", "line": 12, "end_line": 60},
                    {"name": "verify_signature", "line": 62, "end_line": 100},
                    {"name": "process_event", "line": 102, "end_line": 160},
                ],
                "classes": [],
            },
        ],
    },
    {
        "id": "district_3",
        "name": "Core Services",
        "color": "#96CEB4",
        "description": "Business logic and domain services",
        "files": [
            {
                "path": "services/auth_service.py",
                "loc": 320, "complexity": 18, "churn": 12, "age_days": 25,
                "deps_in": 5, "deps_out": 4, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "authenticate", "line": 20, "end_line": 80},
                    {"name": "create_session", "line": 82, "end_line": 130},
                    {"name": "validate_token", "line": 132, "end_line": 180},
                    {"name": "hash_password", "line": 182, "end_line": 210},
                    {"name": "check_permissions", "line": 212, "end_line": 280},
                ],
                "classes": [{"name": "AuthService", "line": 15, "end_line": 280}],
            },
            {
                "path": "services/file_service.py",
                "loc": 580, "complexity": 30, "churn": 42, "age_days": 5,
                "deps_in": 8, "deps_out": 8, "language": "python",
                "is_hotspot": True,
                "functions": [
                    {"name": "upload_file", "line": 25, "end_line": 100},
                    {"name": "download_file", "line": 102, "end_line": 160},
                    {"name": "process_chunks", "line": 162, "end_line": 240},
                    {"name": "generate_preview", "line": 242, "end_line": 300},
                    {"name": "check_quota", "line": 302, "end_line": 340},
                    {"name": "virus_scan", "line": 342, "end_line": 400},
                    {"name": "update_metadata", "line": 402, "end_line": 460},
                    {"name": "handle_versioning", "line": 462, "end_line": 540},
                ],
                "classes": [{"name": "FileService", "line": 18, "end_line": 540}],
            },
            {
                "path": "services/share_service.py",
                "loc": 280, "complexity": 16, "churn": 18, "age_days": 18,
                "deps_in": 4, "deps_out": 5, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "create_share_link", "line": 15, "end_line": 80},
                    {"name": "validate_access", "line": 82, "end_line": 140},
                    {"name": "manage_collaborators", "line": 142, "end_line": 220},
                    {"name": "expire_shares", "line": 222, "end_line": 280},
                ],
                "classes": [{"name": "ShareService", "line": 10, "end_line": 280}],
            },
            {
                "path": "services/encryption_service.py",
                "loc": 240, "complexity": 18, "churn": 4, "age_days": 90,
                "deps_in": 6, "deps_out": 1, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "encrypt_file", "line": 12, "end_line": 60},
                    {"name": "decrypt_file", "line": 62, "end_line": 110},
                    {"name": "rotate_keys", "line": 112, "end_line": 160},
                    {"name": "derive_key", "line": 162, "end_line": 200},
                ],
                "classes": [{"name": "EncryptionService", "line": 8, "end_line": 200}],
            },
            {
                "path": "services/notification_service.py",
                "loc": 190, "complexity": 10, "churn": 8, "age_days": 35,
                "deps_in": 3, "deps_out": 3, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "send_notification", "line": 10, "end_line": 60},
                    {"name": "send_email", "line": 62, "end_line": 110},
                    {"name": "send_push", "line": 112, "end_line": 150},
                    {"name": "batch_notify", "line": 152, "end_line": 190},
                ],
                "classes": [],
            },
            {
                "path": "services/billing_service.py",
                "loc": 350, "complexity": 20, "churn": 14, "age_days": 22,
                "deps_in": 3, "deps_out": 4, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "create_subscription", "line": 18, "end_line": 80},
                    {"name": "process_payment", "line": 82, "end_line": 150},
                    {"name": "calculate_usage", "line": 152, "end_line": 220},
                    {"name": "generate_invoice", "line": 222, "end_line": 290},
                    {"name": "handle_webhook", "line": 292, "end_line": 350},
                ],
                "classes": [{"name": "BillingService", "line": 12, "end_line": 350}],
            },
            {
                "path": "services/quota_service.py",
                "loc": 150, "complexity": 8, "churn": 6, "age_days": 40,
                "deps_in": 5, "deps_out": 2, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "check_quota", "line": 8, "end_line": 50},
                    {"name": "update_usage", "line": 52, "end_line": 100},
                    {"name": "enforce_limits", "line": 102, "end_line": 150},
                ],
                "classes": [],
            },
            {
                "path": "services/search_indexer.py",
                "loc": 260, "complexity": 16, "churn": 10, "age_days": 28,
                "deps_in": 3, "deps_out": 3, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "index_file", "line": 12, "end_line": 70},
                    {"name": "search", "line": 72, "end_line": 140},
                    {"name": "rebuild_index", "line": 142, "end_line": 210},
                    {"name": "tokenize", "line": 212, "end_line": 260},
                ],
                "classes": [{"name": "SearchIndexer", "line": 8, "end_line": 260}],
            },
            {
                "path": "services/event_bus.py",
                "loc": 200, "complexity": 12, "churn": 6, "age_days": 50,
                "deps_in": 7, "deps_out": 1, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "publish", "line": 15, "end_line": 50},
                    {"name": "subscribe", "line": 52, "end_line": 90},
                    {"name": "dispatch", "line": 92, "end_line": 150},
                    {"name": "replay_events", "line": 152, "end_line": 200},
                ],
                "classes": [{"name": "EventBus", "line": 10, "end_line": 200}],
            },
            {
                "path": "services/legacy_migration.py",
                "loc": 680, "complexity": 35, "churn": 2, "age_days": 365,
                "deps_in": 1, "deps_out": 6, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "migrate_v1_to_v2", "line": 20, "end_line": 150},
                    {"name": "transform_schema", "line": 152, "end_line": 280},
                    {"name": "validate_migration", "line": 282, "end_line": 380},
                    {"name": "rollback", "line": 382, "end_line": 460},
                    {"name": "batch_migrate", "line": 462, "end_line": 580},
                    {"name": "legacy_compat_shim", "line": 582, "end_line": 680},
                ],
                "classes": [{"name": "LegacyMigration", "line": 15, "end_line": 680}],
            },
            {
                "path": "services/cache_manager.py",
                "loc": 220, "complexity": 14, "churn": 8, "age_days": 35,
                "deps_in": 8, "deps_out": 1, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "get", "line": 12, "end_line": 40},
                    {"name": "set", "line": 42, "end_line": 70},
                    {"name": "invalidate", "line": 72, "end_line": 100},
                    {"name": "warm_cache", "line": 102, "end_line": 160},
                    {"name": "evict_lru", "line": 162, "end_line": 220},
                ],
                "classes": [{"name": "CacheManager", "line": 8, "end_line": 220}],
            },
        ],
    },
    {
        "id": "district_4",
        "name": "Data Models",
        "color": "#4ECDC4",
        "description": "SQLAlchemy models and database schema",
        "files": [
            {
                "path": "models/user_model.py",
                "loc": 160, "complexity": 8, "churn": 6, "age_days": 60,
                "deps_in": 10, "deps_out": 1, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "to_dict", "line": 40, "end_line": 70},
                    {"name": "verify_password", "line": 72, "end_line": 90},
                    {"name": "update_last_login", "line": 92, "end_line": 110},
                ],
                "classes": [{"name": "User", "line": 10, "end_line": 110}, {"name": "UserProfile", "line": 112, "end_line": 160}],
            },
            {
                "path": "models/file_model.py",
                "loc": 200, "complexity": 10, "churn": 10, "age_days": 40,
                "deps_in": 8, "deps_out": 1, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "get_path", "line": 50, "end_line": 70},
                    {"name": "calculate_size", "line": 72, "end_line": 100},
                    {"name": "to_response", "line": 102, "end_line": 140},
                ],
                "classes": [{"name": "File", "line": 12, "end_line": 140}, {"name": "FileVersion", "line": 142, "end_line": 200}],
            },
            {
                "path": "models/share_model.py",
                "loc": 120, "complexity": 6, "churn": 4, "age_days": 55,
                "deps_in": 5, "deps_out": 2, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "is_expired", "line": 35, "end_line": 50},
                    {"name": "has_permission", "line": 52, "end_line": 80},
                ],
                "classes": [{"name": "Share", "line": 8, "end_line": 80}, {"name": "SharePermission", "line": 82, "end_line": 120}],
            },
            {
                "path": "models/permission_model.py",
                "loc": 100, "complexity": 6, "churn": 2, "age_days": 80,
                "deps_in": 6, "deps_out": 1, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "can_read", "line": 30, "end_line": 45},
                    {"name": "can_write", "line": 47, "end_line": 62},
                    {"name": "can_share", "line": 64, "end_line": 80},
                ],
                "classes": [{"name": "Permission", "line": 8, "end_line": 80}],
            },
            {
                "path": "models/audit_log.py",
                "loc": 140, "complexity": 6, "churn": 4, "age_days": 50,
                "deps_in": 4, "deps_out": 1, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "log_action", "line": 25, "end_line": 60},
                    {"name": "query_logs", "line": 62, "end_line": 100},
                    {"name": "export_logs", "line": 102, "end_line": 140},
                ],
                "classes": [{"name": "AuditLog", "line": 8, "end_line": 100}],
            },
            {
                "path": "models/billing_model.py",
                "loc": 180, "complexity": 10, "churn": 8, "age_days": 30,
                "deps_in": 3, "deps_out": 2, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "create_invoice", "line": 35, "end_line": 70},
                    {"name": "apply_discount", "line": 72, "end_line": 100},
                    {"name": "calculate_total", "line": 102, "end_line": 140},
                ],
                "classes": [{"name": "Subscription", "line": 10, "end_line": 70}, {"name": "Invoice", "line": 72, "end_line": 140}, {"name": "PaymentMethod", "line": 142, "end_line": 180}],
            },
            {
                "path": "models/migration_runner.py",
                "loc": 220, "complexity": 14, "churn": 3, "age_days": 120,
                "deps_in": 2, "deps_out": 3, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "run_migrations", "line": 15, "end_line": 80},
                    {"name": "create_migration", "line": 82, "end_line": 140},
                    {"name": "rollback_migration", "line": 142, "end_line": 190},
                    {"name": "seed_database", "line": 192, "end_line": 220},
                ],
                "classes": [{"name": "MigrationRunner", "line": 10, "end_line": 220}],
            },
        ],
    },
    {
        "id": "district_5",
        "name": "Storage Engine",
        "color": "#A29BFE",
        "description": "Low-level storage, chunking, and deduplication",
        "files": [
            {
                "path": "storage/block_store.go",
                "loc": 420, "complexity": 22, "churn": 10, "age_days": 30,
                "deps_in": 5, "deps_out": 3, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "Put", "line": 20, "end_line": 80},
                    {"name": "Get", "line": 82, "end_line": 130},
                    {"name": "Delete", "line": 132, "end_line": 170},
                    {"name": "ListBlocks", "line": 172, "end_line": 220},
                    {"name": "Compact", "line": 222, "end_line": 320},
                    {"name": "VerifyIntegrity", "line": 322, "end_line": 420},
                ],
                "classes": [{"name": "BlockStore", "line": 12, "end_line": 420}],
            },
            {
                "path": "storage/chunk_manager.go",
                "loc": 350, "complexity": 20, "churn": 14, "age_days": 20,
                "deps_in": 4, "deps_out": 3, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "ChunkFile", "line": 18, "end_line": 100},
                    {"name": "ReassembleFile", "line": 102, "end_line": 180},
                    {"name": "ContentAddressedHash", "line": 182, "end_line": 220},
                    {"name": "FindDuplicates", "line": 222, "end_line": 300},
                ],
                "classes": [{"name": "ChunkManager", "line": 10, "end_line": 300}],
            },
            {
                "path": "storage/dedup_engine.go",
                "loc": 280, "complexity": 18, "churn": 6, "age_days": 45,
                "deps_in": 3, "deps_out": 2, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "Deduplicate", "line": 15, "end_line": 90},
                    {"name": "RollingHash", "line": 92, "end_line": 150},
                    {"name": "MergeBlocks", "line": 152, "end_line": 230},
                    {"name": "ReportSavings", "line": 232, "end_line": 280},
                ],
                "classes": [{"name": "DedupEngine", "line": 10, "end_line": 280}],
            },
            {
                "path": "storage/compression.go",
                "loc": 200, "complexity": 12, "churn": 4, "age_days": 60,
                "deps_in": 4, "deps_out": 1, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "Compress", "line": 12, "end_line": 60},
                    {"name": "Decompress", "line": 62, "end_line": 110},
                    {"name": "SelectAlgorithm", "line": 112, "end_line": 160},
                    {"name": "BenchmarkAlgorithms", "line": 162, "end_line": 200},
                ],
                "classes": [],
            },
            {
                "path": "storage/s3_adapter.go",
                "loc": 310, "complexity": 16, "churn": 8, "age_days": 35,
                "deps_in": 3, "deps_out": 2, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "Upload", "line": 18, "end_line": 80},
                    {"name": "Download", "line": 82, "end_line": 140},
                    {"name": "MultipartUpload", "line": 142, "end_line": 230},
                    {"name": "SignURL", "line": 232, "end_line": 270},
                    {"name": "ListObjects", "line": 272, "end_line": 310},
                ],
                "classes": [{"name": "S3Adapter", "line": 12, "end_line": 310}],
            },
            {
                "path": "storage/gc_sweeper.go",
                "loc": 180, "complexity": 14, "churn": 4, "age_days": 50,
                "deps_in": 2, "deps_out": 3, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "Sweep", "line": 12, "end_line": 70},
                    {"name": "MarkOrphans", "line": 72, "end_line": 120},
                    {"name": "CleanupExpired", "line": 122, "end_line": 180},
                ],
                "classes": [{"name": "GCSweeper", "line": 8, "end_line": 180}],
            },
        ],
    },
    {
        "id": "district_6",
        "name": "Worker System",
        "color": "#FD79A8",
        "description": "Background job processing and task scheduling",
        "files": [
            {
                "path": "workers/dispatcher.go",
                "loc": 300, "complexity": 18, "churn": 10, "age_days": 25,
                "deps_in": 4, "deps_out": 4, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "Dispatch", "line": 15, "end_line": 80},
                    {"name": "RouteJob", "line": 82, "end_line": 140},
                    {"name": "LoadBalance", "line": 142, "end_line": 210},
                    {"name": "HealthCheck", "line": 212, "end_line": 260},
                ],
                "classes": [{"name": "Dispatcher", "line": 10, "end_line": 260}],
            },
            {
                "path": "workers/job_processor.go",
                "loc": 380, "complexity": 22, "churn": 16, "age_days": 15,
                "deps_in": 3, "deps_out": 5, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "ProcessJob", "line": 18, "end_line": 100},
                    {"name": "ExecuteTask", "line": 102, "end_line": 200},
                    {"name": "HandleTimeout", "line": 202, "end_line": 260},
                    {"name": "ReportProgress", "line": 262, "end_line": 320},
                    {"name": "Cleanup", "line": 322, "end_line": 380},
                ],
                "classes": [{"name": "JobProcessor", "line": 12, "end_line": 380}],
            },
            {
                "path": "workers/scheduler.go",
                "loc": 240, "complexity": 14, "churn": 6, "age_days": 40,
                "deps_in": 2, "deps_out": 3, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "Schedule", "line": 12, "end_line": 60},
                    {"name": "CronParse", "line": 62, "end_line": 110},
                    {"name": "NextRun", "line": 112, "end_line": 160},
                    {"name": "CancelJob", "line": 162, "end_line": 200},
                ],
                "classes": [{"name": "Scheduler", "line": 8, "end_line": 200}],
            },
            {
                "path": "workers/retry_handler.go",
                "loc": 160, "complexity": 10, "churn": 4, "age_days": 55,
                "deps_in": 2, "deps_out": 2, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "RetryWithBackoff", "line": 10, "end_line": 50},
                    {"name": "ExponentialDelay", "line": 52, "end_line": 80},
                    {"name": "DeadLetterQueue", "line": 82, "end_line": 130},
                    {"name": "AlertOnFailure", "line": 132, "end_line": 160},
                ],
                "classes": [],
            },
            {
                "path": "workers/dead_letter_queue.go",
                "loc": 140, "complexity": 8, "churn": 2, "age_days": 70,
                "deps_in": 2, "deps_out": 1, "language": "go",
                "is_hotspot": False,
                "functions": [
                    {"name": "Enqueue", "line": 10, "end_line": 40},
                    {"name": "Inspect", "line": 42, "end_line": 80},
                    {"name": "Reprocess", "line": 82, "end_line": 120},
                ],
                "classes": [{"name": "DeadLetterQueue", "line": 8, "end_line": 120}],
            },
        ],
    },
    {
        "id": "district_7",
        "name": "Shared Utilities",
        "color": "#FFEAA7",
        "description": "Cross-cutting validators, formatters, and configuration",
        "files": [
            {
                "path": "shared/validators.ts",
                "loc": 180, "complexity": 10, "churn": 6, "age_days": 45,
                "deps_in": 12, "deps_out": 0, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "validateEmail", "line": 5, "end_line": 20},
                    {"name": "validatePassword", "line": 22, "end_line": 50},
                    {"name": "validateFileSize", "line": 52, "end_line": 80},
                    {"name": "validateFileName", "line": 82, "end_line": 110},
                    {"name": "sanitizeInput", "line": 112, "end_line": 150},
                ],
                "classes": [],
            },
            {
                "path": "shared/formatters.ts",
                "loc": 120, "complexity": 6, "churn": 4, "age_days": 60,
                "deps_in": 8, "deps_out": 0, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "formatFileSize", "line": 3, "end_line": 20},
                    {"name": "formatDate", "line": 22, "end_line": 45},
                    {"name": "formatDuration", "line": 47, "end_line": 70},
                    {"name": "truncatePath", "line": 72, "end_line": 90},
                ],
                "classes": [],
            },
            {
                "path": "shared/constants.ts",
                "loc": 60, "complexity": 2, "churn": 2, "age_days": 120,
                "deps_in": 10, "deps_out": 0, "language": "typescript",
                "is_hotspot": False,
                "functions": [],
                "classes": [],
            },
            {
                "path": "shared/logger.py",
                "loc": 140, "complexity": 8, "churn": 4, "age_days": 80,
                "deps_in": 14, "deps_out": 0, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "setup_logger", "line": 8, "end_line": 40},
                    {"name": "log_request", "line": 42, "end_line": 70},
                    {"name": "log_error", "line": 72, "end_line": 100},
                    {"name": "rotate_logs", "line": 102, "end_line": 140},
                ],
                "classes": [],
            },
            {
                "path": "shared/config.py",
                "loc": 100, "complexity": 4, "churn": 6, "age_days": 50,
                "deps_in": 16, "deps_out": 0, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "load_config", "line": 8, "end_line": 40},
                    {"name": "get_env", "line": 42, "end_line": 60},
                    {"name": "validate_config", "line": 62, "end_line": 100},
                ],
                "classes": [{"name": "AppConfig", "line": 5, "end_line": 100}],
            },
            {
                "path": "shared/crypto_utils.py",
                "loc": 160, "complexity": 12, "churn": 2, "age_days": 100,
                "deps_in": 6, "deps_out": 0, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "generate_token", "line": 8, "end_line": 30},
                    {"name": "hash_sha256", "line": 32, "end_line": 50},
                    {"name": "hmac_sign", "line": 52, "end_line": 80},
                    {"name": "generate_keypair", "line": 82, "end_line": 120},
                    {"name": "verify_signature", "line": 122, "end_line": 160},
                ],
                "classes": [],
            },
        ],
    },
    {
        "id": "district_8",
        "name": "Styles & Assets",
        "color": "#55E6C1",
        "description": "CSS modules, themes, and static assets",
        "files": [
            {
                "path": "src/styles/globals.css",
                "loc": 280, "complexity": 4, "churn": 12, "age_days": 15,
                "deps_in": 1, "deps_out": 0, "language": "css",
                "is_hotspot": False,
                "functions": [],
                "classes": [],
            },
            {
                "path": "src/styles/components.css",
                "loc": 420, "complexity": 6, "churn": 20, "age_days": 10,
                "deps_in": 2, "deps_out": 0, "language": "css",
                "is_hotspot": False,
                "functions": [],
                "classes": [],
            },
            {
                "path": "src/styles/dashboard.module.css",
                "loc": 180, "complexity": 2, "churn": 8, "age_days": 18,
                "deps_in": 1, "deps_out": 0, "language": "css",
                "is_hotspot": False,
                "functions": [],
                "classes": [],
            },
            {
                "path": "src/styles/theme.ts",
                "loc": 90, "complexity": 4, "churn": 4, "age_days": 45,
                "deps_in": 6, "deps_out": 0, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "getThemeColors", "line": 8, "end_line": 40},
                    {"name": "applyTheme", "line": 42, "end_line": 70},
                ],
                "classes": [],
            },
        ],
    },
    {
        "id": "district_9",
        "name": "Testing & CI",
        "color": "#E17055",
        "description": "Test suites, fixtures, and CI pipeline configuration",
        "files": [
            {
                "path": "tests/auth.test.ts",
                "loc": 320, "complexity": 12, "churn": 8, "age_days": 25,
                "deps_in": 0, "deps_out": 4, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "describe_login", "line": 8, "end_line": 80},
                    {"name": "describe_register", "line": 82, "end_line": 150},
                    {"name": "describe_token_refresh", "line": 152, "end_line": 220},
                    {"name": "describe_permissions", "line": 222, "end_line": 320},
                ],
                "classes": [],
            },
            {
                "path": "tests/files.test.ts",
                "loc": 440, "complexity": 14, "churn": 12, "age_days": 18,
                "deps_in": 0, "deps_out": 5, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "describe_upload", "line": 10, "end_line": 100},
                    {"name": "describe_download", "line": 102, "end_line": 200},
                    {"name": "describe_share", "line": 202, "end_line": 300},
                    {"name": "describe_delete", "line": 302, "end_line": 380},
                    {"name": "describe_search", "line": 382, "end_line": 440},
                ],
                "classes": [],
            },
            {
                "path": "tests/e2e.spec.ts",
                "loc": 280, "complexity": 10, "churn": 6, "age_days": 30,
                "deps_in": 0, "deps_out": 3, "language": "typescript",
                "is_hotspot": False,
                "functions": [
                    {"name": "test_full_upload_flow", "line": 8, "end_line": 80},
                    {"name": "test_share_workflow", "line": 82, "end_line": 160},
                    {"name": "test_billing_flow", "line": 162, "end_line": 240},
                ],
                "classes": [],
            },
            {
                "path": "tests/conftest.py",
                "loc": 180, "complexity": 8, "churn": 4, "age_days": 50,
                "deps_in": 0, "deps_out": 4, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "app_fixture", "line": 10, "end_line": 40},
                    {"name": "db_session", "line": 42, "end_line": 70},
                    {"name": "mock_s3", "line": 72, "end_line": 110},
                    {"name": "test_user", "line": 112, "end_line": 150},
                ],
                "classes": [],
            },
            {
                "path": "tests/api_integration.test.py",
                "loc": 360, "complexity": 14, "churn": 10, "age_days": 20,
                "deps_in": 0, "deps_out": 6, "language": "python",
                "is_hotspot": False,
                "functions": [
                    {"name": "test_auth_flow", "line": 12, "end_line": 80},
                    {"name": "test_file_upload", "line": 82, "end_line": 160},
                    {"name": "test_sharing", "line": 162, "end_line": 240},
                    {"name": "test_search", "line": 242, "end_line": 300},
                    {"name": "test_admin", "line": 302, "end_line": 360},
                ],
                "classes": [],
            },
        ],
    },
]

# ── Dependency definitions (source → target, is_cross_district, weight) ─
ROADS = [
    # Frontend → Hooks
    ("src/components/Dashboard.tsx", "src/hooks/useAuth.ts", True, 2),
    ("src/components/Dashboard.tsx", "src/hooks/useFiles.ts", True, 2),
    ("src/components/Dashboard.tsx", "src/store/appStore.ts", True, 2),
    ("src/components/FileExplorer.tsx", "src/hooks/useFiles.ts", True, 3),
    ("src/components/FileExplorer.tsx", "src/hooks/useUpload.ts", True, 2),
    ("src/components/FileExplorer.tsx", "src/store/appStore.ts", True, 2),
    ("src/components/SharePanel.tsx", "src/hooks/useAuth.ts", True, 1),
    ("src/components/UploadWidget.tsx", "src/hooks/useUpload.ts", True, 2),
    ("src/components/SearchModal.tsx", "src/hooks/useSearch.ts", True, 2),
    ("src/components/NotificationCenter.tsx", "src/hooks/useWebSocket.ts", True, 2),
    ("src/components/Analytics.tsx", "src/store/appStore.ts", True, 1),
    ("src/components/DataGrid.tsx", "src/store/appStore.ts", True, 2),
    ("src/components/UserSettings.tsx", "src/hooks/useAuth.ts", True, 1),

    # Frontend → Shared Utilities
    ("src/components/Dashboard.tsx", "shared/formatters.ts", True, 1),
    ("src/components/FileExplorer.tsx", "shared/validators.ts", True, 1),
    ("src/components/UploadWidget.tsx", "shared/validators.ts", True, 1),
    ("src/components/DataGrid.tsx", "shared/formatters.ts", True, 1),
    ("src/components/UserSettings.tsx", "shared/validators.ts", True, 1),

    # Frontend → Styles
    ("src/components/Dashboard.tsx", "src/styles/dashboard.module.css", True, 1),
    ("src/components/DataGrid.tsx", "src/styles/components.css", True, 1),

    # API → Services
    ("api/routes/auth_routes.py", "services/auth_service.py", True, 2),
    ("api/routes/file_routes.py", "services/file_service.py", True, 3),
    ("api/routes/share_routes.py", "services/share_service.py", True, 2),
    ("api/routes/search_routes.py", "services/search_indexer.py", True, 2),
    ("api/routes/admin_routes.py", "services/billing_service.py", True, 1),
    ("api/routes/admin_routes.py", "services/quota_service.py", True, 1),
    ("api/routes/webhook_handler.py", "services/event_bus.py", True, 1),

    # API → Middleware
    ("api/routes/auth_routes.py", "api/middleware.py", False, 1),
    ("api/routes/file_routes.py", "api/middleware.py", False, 1),

    # Services → Models
    ("services/auth_service.py", "models/user_model.py", True, 2),
    ("services/file_service.py", "models/file_model.py", True, 3),
    ("services/share_service.py", "models/share_model.py", True, 2),
    ("services/share_service.py", "models/permission_model.py", True, 1),
    ("services/billing_service.py", "models/billing_model.py", True, 2),
    ("services/auth_service.py", "models/permission_model.py", True, 1),

    # Services → Storage Engine
    ("services/file_service.py", "storage/block_store.go", True, 3),
    ("services/file_service.py", "storage/chunk_manager.go", True, 2),
    ("services/file_service.py", "storage/compression.go", True, 1),
    ("services/file_service.py", "storage/s3_adapter.go", True, 2),

    # Services → Other Services
    ("services/file_service.py", "services/encryption_service.py", False, 2),
    ("services/file_service.py", "services/quota_service.py", False, 1),
    ("services/file_service.py", "services/notification_service.py", False, 1),
    ("services/file_service.py", "services/event_bus.py", False, 1),
    ("services/share_service.py", "services/notification_service.py", False, 1),
    ("services/share_service.py", "services/auth_service.py", False, 1),
    ("services/billing_service.py", "services/notification_service.py", False, 1),
    ("services/auth_service.py", "services/cache_manager.py", False, 1),

    # Services → Shared Utilities
    ("services/auth_service.py", "shared/crypto_utils.py", True, 2),
    ("services/encryption_service.py", "shared/crypto_utils.py", True, 2),
    ("services/file_service.py", "shared/logger.py", True, 1),
    ("services/billing_service.py", "shared/logger.py", True, 1),
    ("services/notification_service.py", "shared/config.py", True, 1),
    ("services/cache_manager.py", "shared/config.py", True, 1),
    ("api/middleware.py", "shared/config.py", True, 1),
    ("api/middleware.py", "shared/logger.py", True, 1),

    # Storage Engine internal deps
    ("storage/chunk_manager.go", "storage/block_store.go", False, 2),
    ("storage/dedup_engine.go", "storage/block_store.go", False, 2),
    ("storage/dedup_engine.go", "storage/chunk_manager.go", False, 1),
    ("storage/gc_sweeper.go", "storage/block_store.go", False, 1),
    ("storage/s3_adapter.go", "storage/compression.go", False, 1),

    # Worker System
    ("workers/dispatcher.go", "workers/job_processor.go", False, 2),
    ("workers/dispatcher.go", "workers/scheduler.go", False, 1),
    ("workers/job_processor.go", "workers/retry_handler.go", False, 1),
    ("workers/retry_handler.go", "workers/dead_letter_queue.go", False, 1),

    # Workers → Storage
    ("workers/job_processor.go", "storage/block_store.go", True, 2),
    ("workers/job_processor.go", "storage/chunk_manager.go", True, 1),

    # Workers → Services
    ("workers/dispatcher.go", "services/event_bus.py", True, 1),

    # Tests → Code under test
    ("tests/auth.test.ts", "src/hooks/useAuth.ts", True, 1),
    ("tests/files.test.ts", "src/hooks/useFiles.ts", True, 1),
    ("tests/files.test.ts", "src/hooks/useUpload.ts", True, 1),
    ("tests/e2e.spec.ts", "src/components/Dashboard.tsx", True, 1),
    ("tests/api_integration.test.py", "services/auth_service.py", True, 1),
    ("tests/api_integration.test.py", "services/file_service.py", True, 1),
    ("tests/conftest.py", "shared/config.py", True, 1),

    # Data model cross-references
    ("models/file_model.py", "models/user_model.py", False, 1),
    ("models/share_model.py", "models/user_model.py", False, 1),
    ("models/share_model.py", "models/file_model.py", False, 1),
    ("models/audit_log.py", "models/user_model.py", False, 1),
    ("models/billing_model.py", "models/user_model.py", False, 1),

    # Legacy migration → everything
    ("services/legacy_migration.py", "models/user_model.py", True, 1),
    ("services/legacy_migration.py", "models/file_model.py", True, 1),
    ("services/legacy_migration.py", "models/share_model.py", True, 1),
    ("services/legacy_migration.py", "services/file_service.py", False, 1),
    ("services/legacy_migration.py", "services/auth_service.py", False, 1),
    ("services/legacy_migration.py", "shared/logger.py", True, 1),

    # Hooks → Shared
    ("src/hooks/useAuth.ts", "shared/validators.ts", True, 1),
    ("src/hooks/useFiles.ts", "shared/formatters.ts", True, 1),
    ("src/hooks/useUpload.ts", "shared/validators.ts", True, 1),
    ("src/store/appStore.ts", "shared/constants.ts", True, 1),
]


def spiral_place(footprints):
    """Place districts using spiral-treemap algorithm (matches graphEngine.js)."""
    if not footprints:
        return []

    step = MAX_BUILDING_WIDTH + BUILDING_SPACING
    positions = []
    placed = []

    first = footprints[0]
    pos = {"x": -first["w"] / 2, "z": -first["d"] / 2}
    positions.append(pos)
    placed.append({"x": pos["x"], "z": pos["z"], "w": first["w"], "d": first["d"]})

    for i in range(1, len(footprints)):
        fp = footprints[i]
        best_pos = None
        best_dist = float("inf")
        max_radius = max(300, math.sqrt(len(footprints)) * 80)

        radius = step
        while radius < max_radius:
            num_angles = max(8, int(radius / step) * 4)
            for a in range(num_angles):
                angle = (a / num_angles) * math.pi * 2
                cx = math.cos(angle) * radius - fp["w"] / 2
                cz = math.sin(angle) * radius - fp["d"] / 2

                gap = DISTRICT_PADDING
                overlaps = False
                for p in placed:
                    if (cx < p["x"] + p["w"] + gap and
                        cx + fp["w"] + gap > p["x"] and
                        cz < p["z"] + p["d"] + gap and
                        cz + fp["d"] + gap > p["z"]):
                        overlaps = True
                        break

                if not overlaps:
                    dist = cx * cx + cz * cz
                    if dist < best_dist:
                        best_dist = dist
                        best_pos = {"x": cx, "z": cz}

            if best_pos:
                break
            radius += step

        if not best_pos:
            best_pos = {"x": i * 100.0, "z": i * 100.0}

        positions.append(best_pos)
        placed.append({"x": best_pos["x"], "z": best_pos["z"], "w": fp["w"], "d": fp["d"]})

    return positions


def generate():
    """Generate the complete demo city data."""
    # Sort districts largest-first
    sorted_districts = sorted(DISTRICTS, key=lambda d: len(d["files"]), reverse=True)

    # Compute footprints
    footprints = []
    for dd in sorted_districts:
        n = len(dd["files"])
        cols = math.ceil(math.sqrt(n))
        rows = math.ceil(n / cols)
        w = cols * (MAX_BUILDING_WIDTH + BUILDING_SPACING) + DISTRICT_PADDING
        d = rows * (MAX_BUILDING_WIDTH + BUILDING_SPACING) + DISTRICT_PADDING
        footprints.append({"w": w, "d": d, "cols": cols, "rows": rows})

    # Place districts
    positions = spiral_place(footprints)

    # Build all data
    buildings = []
    districts = []
    building_map = {}

    for di, dd in enumerate(sorted_districts):
        dx = positions[di]["x"]
        dz = positions[di]["z"]
        cols = footprints[di]["cols"]

        min_x = float("inf")
        max_x = float("-inf")
        min_z = float("inf")
        max_z = float("-inf")

        col = 0
        row = 0

        for f in dd["files"]:
            bx = dx + col * (MAX_BUILDING_WIDTH + BUILDING_SPACING)
            bz = dz + row * (MAX_BUILDING_WIDTH + BUILDING_SPACING)

            # Building dimensions
            deps_in = f["deps_in"]
            b_width = max(3.0, 3.0 + deps_in * 1.2)
            b_height = max(2.0, f["complexity"] * 1.2)
            b_depth = b_width

            min_x = min(min_x, bx - b_width / 2)
            max_x = max(max_x, bx + b_width / 2)
            min_z = min(min_z, bz - b_depth / 2)
            max_z = max(max_z, bz + b_depth / 2)

            decay = min(1.0, f["age_days"] / 365.0)
            coverage = max(10.0, 100.0 - (decay * 40.0) - (f["complexity"] * 1.5))
            debt = min(1.0, decay * 0.5 + (f["complexity"] * 0.02))

            building = {
                "id": f["path"],
                "name": f["path"].split("/")[-1],
                "path": f["path"],
                "district_id": dd["id"],
                "position": {"x": round(bx, 2), "y": 0, "z": round(bz, 2)},
                "dimensions": {
                    "width": round(b_width, 2),
                    "height": round(b_height, 2),
                    "depth": round(b_depth, 2),
                },
                "metrics": {
                    "loc": f["loc"],
                    "complexity": f["complexity"],
                    "churn": f["churn"],
                    "age_days": f["age_days"],
                    "dependencies_in": f["deps_in"],
                    "dependencies_out": f["deps_out"],
                    "size_bytes": f["loc"] * 42,
                    "coverage": round(coverage, 1),
                    "debt": round(debt, 3),
                    "commits": f["churn"],
                },
                "language": f["language"],
                "author": None,
                "email": None,
                "last_modified": None,
                "is_hotspot": f["is_hotspot"],
                "decay_level": round(decay, 4),
                "functions": f["functions"],
                "classes": f["classes"],
            }

            buildings.append(building)
            building_map[f["path"]] = building

            col += 1
            if col >= cols:
                col = 0
                row += 1

        # District metadata
        cx = (min_x + max_x) / 2
        cz = (min_z + max_z) / 2
        pad = DISTRICT_PADDING / 2

        districts.append({
            "id": dd["id"],
            "name": dd["name"],
            "color": dd["color"],
            "center": {"x": round(cx, 2), "y": round(cz, 2)},
            "boundary": [
                {"x": round(min_x - pad, 2), "y": round(min_z - pad, 2)},
                {"x": round(max_x + pad, 2), "y": round(min_z - pad, 2)},
                {"x": round(max_x + pad, 2), "y": round(max_z + pad, 2)},
                {"x": round(min_x - pad, 2), "y": round(max_z + pad, 2)},
            ],
            "building_count": len(dd["files"]),
            "description": dd["description"],
        })

    # Build roads
    roads = []
    for src, tgt, is_cross, weight in ROADS:
        if src in building_map and tgt in building_map:
            roads.append({
                "source": src,
                "target": tgt,
                "weight": weight,
                "is_cross_district": is_cross,
                "type": "imports",
            })

    # Stats
    total_loc = sum(b["metrics"]["loc"] for b in buildings)
    hotspots = sum(1 for b in buildings if b["is_hotspot"])

    # Language breakdown
    lang_counts = {}
    for b in buildings:
        lang_counts[b["language"]] = lang_counts.get(b["language"], 0) + 1

    city_data = {
        "id": "demo_nexusforge",
        "name": "NexusForge — Cloud Storage Platform",
        "path": "nexusforge/platform",
        "status": "ready",
        "source": "demo",
        "buildings": buildings,
        "districts": districts,
        "roads": roads,
        "stats": {
            "total_files": len(buildings),
            "total_loc": total_loc,
            "total_districts": len(districts),
            "total_dependencies": len(roads),
            "hotspots": hotspots,
            "languages": lang_counts,
        },
    }

    return city_data


if __name__ == "__main__":
    data = generate()
    print(json.dumps(data, indent=2))
