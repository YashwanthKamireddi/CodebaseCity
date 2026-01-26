import React, { useMemo, useState } from 'react'
import useStore from '../../../store/useStore'
import { Folder, File, Code, Hash, Link as LinkIcon, ChevronRight, ChevronDown } from 'lucide-react'

export default function Sidebar() {
    const { cityData, selectBuilding, selectedBuilding, sidebarOpen, setSidebarOpen } = useStore()
    const onClose = () => setSidebarOpen(false)

    if (!cityData) return null

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '280px',
                maxWidth: '280px',
                height: '100vh',
                zIndex: 'var(--z-modal-backdrop)', // Sidebar is high priority
                background: 'var(--bg-studio-dark)',
                borderRight: '1px solid var(--glass-border)',
                boxShadow: '20px 0 40px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                // Instant / Snappy transition
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                color: 'var(--text-primary)'
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
                <button
                    onClick={onClose}
                    className="touch-target"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                    ×
                </button>
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
                        style={{
                            padding: '4px 8px',
                            paddingLeft: `${(depth + 1) * 12 + 8}px`,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: isSelected ? '#60a5fa' : '#a1a1aa',
                            background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderRadius: '6px',
                            marginBottom: '2px',
                            transition: 'all 0.1s ease',
                            fontWeight: isSelected ? 500 : 400,
                            minWidth: 0,
                            maxWidth: '100%',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            if (isSelected) return;
                            e.currentTarget.style.background = '#18181b'
                            e.currentTarget.style.color = '#e4e4e7'
                        }}
                        onMouseLeave={(e) => {
                            if (isSelected) return;
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = '#a1a1aa'
                        }}
                    >
                        <File size={14} strokeWidth={1.5} className={item.language} color={isSelected ? '#60a5fa' : '#52525b'} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
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

    return <div>{renderNode(tree)}</div>
}

function CollapsibleFolder({ name, depth, children }) {
    const [isOpen, setIsOpen] = React.useState(true) // Default open

    return (
        <div>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '6px 8px',
                    paddingLeft: `${depth * 12 + 8}px`,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#a1a1aa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    userSelect: 'none',
                    borderRadius: '6px',
                    marginBottom: '2px',
                    minWidth: 0,
                    maxWidth: '100%',
                    width: '100%', // FORCE WIDTH
                    boxSizing: 'border-box', // HANDLE PADDING
                    overflow: 'hidden'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#18181b'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title={name}
            >
                <div style={{ display: 'flex', flexShrink: 0 }}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <div style={{ display: 'flex', flexShrink: 0 }}>
                    <Folder size={14} fill={isOpen ? "#52525b" : "none"} strokeWidth={1.5} color="#71717a" />
                </div>
                <span style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {name}
                </span>
            </div>
            {isOpen && children}
        </div>
    )
}
