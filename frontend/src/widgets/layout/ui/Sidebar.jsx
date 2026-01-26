import React, { useMemo, useState } from 'react'
import useStore from '../../../store/useStore'
import { Folder, File, Code, Hash, Link as LinkIcon, ChevronRight, ChevronDown } from 'lucide-react'
import './Sidebar.css'

export default function Sidebar() {
    const { cityData, selectBuilding, selectedBuilding, sidebarOpen, setSidebarOpen } = useStore()
    const onClose = () => setSidebarOpen(false)

    // HOOKS MUST RUN UNCONDITIONALLY
    const [width, setWidth] = React.useState(280)
    const [isResizing, setIsResizing] = React.useState(false)

    const startResizing = React.useCallback((e) => {
        setIsResizing(true)
        e.preventDefault() // Prevent selection
    }, [])

    const stopResizing = React.useCallback(() => {
        setIsResizing(false)
    }, [])

    const resize = React.useCallback((e) => {
        if (isResizing) {
            const newWidth = e.clientX
            if (newWidth > 150 && newWidth < 800) {
                setWidth(newWidth)
            }
        }
    }, [isResizing])

    React.useEffect(() => {
        window.addEventListener('mousemove', resize)
        window.addEventListener('mouseup', stopResizing)
        return () => {
            window.removeEventListener('mousemove', resize)
            window.removeEventListener('mouseup', stopResizing)
        }
    }, [resize, stopResizing])

    // EARLY RETURN ONLY AFTER HOOKS
    if (!cityData) return null

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: `${width}px`,
                maxWidth: '80vw', // Safety cap
                height: '100vh',
                zIndex: 'var(--z-modal-backdrop)',
                background: 'var(--bg-studio-dark)',
                borderRight: '1px solid var(--glass-border)',
                boxShadow: isResizing ? 'none' : '20px 0 40px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                // Disable transition during resize for performance
                transition: isResizing ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                color: 'var(--text-primary)',
                userSelect: isResizing ? 'none' : 'auto'
            }}
        >
            {/* Header */}
            <div className="sidebar-header" style={{
                padding: 'var(--space-5) var(--space-6)',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-studio-dark)'
            }}>
                <h2 style={{ fontSize: 'var(--font-lg)', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
                    {cityData.name}
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={onClose}
                        className="touch-target"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Scrollable Content - PURE FILE EXPLORER */}
            <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <div style={{ padding: '24px 10px' }}>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#52525b',
                        marginBottom: '16px',
                        paddingLeft: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }}>
                        Explorer
                    </div>
                    <FileTree
                        files={cityData.buildings}
                        onSelect={selectBuilding}
                        selectedId={selectedBuilding?.id}
                    />
                </div>
            </div>

            {/* Drag Handle */}
            <div
                onMouseDown={startResizing}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: -4, // Slop area
                    width: '8px',
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 10
                }}
            />
            {/* Visual Border Highlight when resizing */}
            {isResizing && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '2px',
                    height: '100%',
                    background: '#3b82f6'
                }} />
            )}
        </div>
    )
}

function FileTree({ files, onSelect, selectedId }) {
    // Re-create tree structure from flat file list
    const tree = React.useMemo(() => {
        const root = {}
        files.forEach(f => {
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
                        className="file-row"
                        style={{
                            paddingLeft: `${(depth + 1) * 10 + 10}px`, // Tighter indentation
                            color: isSelected ? '#60a5fa' : '#a1a1aa',
                            background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            fontWeight: isSelected ? 500 : 400,
                        }}
                    >
                        <File size={14} strokeWidth={1.5} className={item.language} color={isSelected ? '#60a5fa' : '#52525b'} style={{ flexShrink: 0 }} />
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

function CollapsibleFolder({ name, depth, children }) {
    const [isOpen, setIsOpen] = React.useState(true) // Default open

    return (
        <div>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="folder-row"
                style={{
                    paddingLeft: `${depth * 10 + 10}px`, // Tighter indentation
                }}
                title={name}
            >
                <div style={{ display: 'flex', flexShrink: 0 }}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <div style={{ display: 'flex', flexShrink: 0 }}>
                    <Folder size={14} fill={isOpen ? "#52525b" : "none"} strokeWidth={1.5} color="#71717a" />
                </div>
                <span className="row-label">
                    {name}
                </span>
            </div>
            {isOpen && children}
        </div>
    )
}
