import React, { useMemo, useState } from 'react'
import useStore from '../store/useStore'
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
                width: '320px',
                height: '100vh',
                zIndex: 900,
                background: '#09090b',
                borderRight: '1px solid #27272a',
                boxShadow: '30px 0 100px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                // Instant / Snappy transition
                transition: 'transform 0.15s cubic-bezier(0, 0, 0.2, 1)',
                color: '#e2e8f0'
            }}
        >
            {/* Header */}
            <div className="sidebar-header" style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#09090b'
            }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
                    {cityData.name}
                </h2>
                <button
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: '#52525b', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                    ×
                </button>
            </div>

            {/* Scrollable Content - PURE FILE EXPLORER */}
            <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
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
                            fontSize: '0.85rem',
                            color: isSelected ? '#60a5fa' : '#a1a1aa',
                            background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            borderRadius: '6px', // Softer
                            marginBottom: '2px',
                            transition: 'all 0.1s ease',
                            fontWeight: isSelected ? 500 : 400
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
                        <File size={14} strokeWidth={1.5} className={item.language} color={isSelected ? '#60a5fa' : '#52525b'} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
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
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontWeight: 600,
                    userSelect: 'none',
                    borderRadius: '6px',
                    marginBottom: '2px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#18181b'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={14} fill={isOpen ? "#52525b" : "none"} strokeWidth={1.5} color="#71717a" />
                {name}
            </div>
            {isOpen && children}
        </div>
    )
}
