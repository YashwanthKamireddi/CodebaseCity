import React, { useMemo, useState } from 'react'
import useStore from '../../../store/useStore'
import { Folder, File, Code, Hash, Link as LinkIcon, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react'
import './Sidebar.css'

export default function Sidebar() {
    const cityData = useStore(s => s.cityData)
    const selectBuilding = useStore(s => s.selectBuilding)
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const sidebarOpen = useStore(s => s.sidebarOpen)
    const setSidebarOpen = useStore(s => s.setSidebarOpen)
    const sidebarWidth = useStore(s => s.sidebarWidth)
    const setSidebarWidth = useStore(s => s.setSidebarWidth)
    const loading = useStore(s => s.loading)
    const onClose = () => setSidebarOpen(false)

    // Sidebar resize — listeners only attached DURING resize to prevent leak
    const [isResizing, setIsResizing] = React.useState(false)

    const startResizing = React.useCallback((e) => {
        setIsResizing(true)
        e.preventDefault()
    }, [])

    React.useEffect(() => {
        if (!isResizing) return

        let lastResize = 0
        const resize = (e) => {
            const now = performance.now()
            if (now - lastResize < 16) return
            lastResize = now
            const newWidth = e.clientX
            if (newWidth > 150 && newWidth < 800) {
                setSidebarWidth(newWidth)
            }
        }

        const stopResizing = () => setIsResizing(false)

        window.addEventListener('mousemove', resize)
        window.addEventListener('mouseup', stopResizing)
        return () => {
            window.removeEventListener('mousemove', resize)
            window.removeEventListener('mouseup', stopResizing)
        }
    }, [isResizing, setSidebarWidth])

    const displayTitle = cityData?.name || (loading ? 'Loading...' : 'Codebase Explorer')

    return (
        <div
            className={`sidebar-panel ${sidebarOpen ? 'open' : ''} ${isResizing ? 'resizing' : ''}`}
            style={{
                width: `${sidebarWidth}px`,
            }}
        >
            {/* Header */}
            <div className="sidebar-header">
                <h2 className="sidebar-title">{displayTitle}</h2>
                <button onClick={onClose} className="sidebar-close-btn" aria-label="Close sidebar">
                    ×
                </button>
            </div>

            {/* Scrollable Content - PURE FILE EXPLORER */}
            <div className="sidebar-content">
                <div className="sidebar-explorer-wrapper">
                    <div className="sidebar-section-label">Explorer</div>

                    {loading && !cityData ? (
                        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: `${100 - (i * 10)}%`,
                                        height: '24px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '4px',
                                        marginLeft: `${(i % 3) * 12}px`,
                                        animation: `anim-shimmer 1.5s ease-in-out infinite ${i * 0.1}s`,
                                    }}
                                />
                            ))}
                        </div>
                    ) : !cityData ? (
                        <div className="anim-slide-up"
                            style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.6 }}
                        >
                            <FolderOpen size={48} strokeWidth={1} style={{ margin: '0 auto 16px', display: 'block' }} />
                            <p style={{ fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.5 }}>
                                No project loaded. Open a local folder to explore its files here.
                            </p>
                        </div>
                    ) : (
                        <FileTree
                            files={cityData.buildings}
                            onSelect={selectBuilding}
                            selectedId={selectedBuilding?.id}
                        />
                    )}
                </div>
            </div>

            {/* Drag Handle */}
            <div className="sidebar-resize-handle" onMouseDown={startResizing} />

            {/* Visual Border Highlight when resizing */}
            {isResizing && <div className="sidebar-resize-indicator" />}
        </div>
    )
}

function FileTree({ files, onSelect, selectedId }) {
    // Re-create tree structure from flat file list
    const tree = React.useMemo(() => {
        const root = {}
        // Safety: filter out any buildings missing a path property
        const safeFiles = (files || []).filter(f => f && f.path && typeof f.path === 'string')
        safeFiles.forEach(f => {
            const parts = f.path.split('/')
            let current = root
            parts.forEach((part, i) => {
                const isFile = i === parts.length - 1
                if (!current[part]) {
                    current[part] = isFile ? { ...f, __isFile: true } : {}
                }
                if (!isFile) current = current[part]
            })
        })
        return root
    }, [files])

    const renderNode = (node, path = '', depth = 0) => {
        return Object.entries(node).map(([name, item]) => {
            const currentPath = path ? `${path}/${name}` : name
            const isFile = item.__isFile

            if (isFile) {
                const isSelected = selectedId === item.id
                return (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className={`file-row ${isSelected ? 'selected' : ''}`}
                        style={{ paddingLeft: `${(depth + 1) * 10 + 10}px` }}
                    >
                        <File size={14} strokeWidth={1.5} className={`file-icon ${isSelected ? 'active' : ''}`} />
                        <span className="row-label">{name}</span>
                    </div>
                )
            } else {
                return (
                    <CollapsibleFolder key={currentPath} name={name} depth={depth}>
                        {renderNode(item, currentPath, depth + 1)}
                    </CollapsibleFolder>
                )
            }
        })
    }

    return <div className="file-tree-container">{renderNode(tree)}</div>
}

const CollapsibleFolder = React.memo(function CollapsibleFolder({ name, depth, children }) {
    const [isOpen, setIsOpen] = React.useState(true)

    return (
        <div>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`folder-row ${isOpen ? 'open' : ''}`}
                style={{ paddingLeft: `${depth * 10 + 10}px` }}
                title={name}
            >
                <div className="folder-chevron">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <div className="folder-icon-wrap">
                    <Folder size={14} fill={isOpen ? "currentColor" : "none"} strokeWidth={1.5} />
                </div>
                <span className="row-label">{name}</span>
            </div>
            {isOpen && children}
        </div>
    )
})
