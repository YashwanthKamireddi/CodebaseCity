import React from 'react'
import useStore from '../store/useStore'
import { Folder, File, Code, Hash, Link as LinkIcon, ChevronRight, ChevronDown } from 'lucide-react'

export default function Sidebar() {
    const { cityData, selectBuilding, selectedBuilding, sidebarOpen, setSidebarOpen } = useStore()

    if (!cityData) return null

    const onClose = () => setSidebarOpen(false)

    const { stats, metadata } = cityData
    const health = metadata?.health || { grade: 'A', score: 100 }

    const metrics = [
        { label: 'Files', value: stats?.total_files || 0, icon: <File size={14} /> },
        { label: 'Functions', value: stats?.functions_count || 'N/A', icon: <Code size={14} /> },
        { label: 'Links', value: stats?.total_dependencies || 0, icon: <LinkIcon size={14} /> },
        { label: 'LOC', value: stats?.total_loc?.toLocaleString() || 0, icon: <Hash size={14} /> }
    ]

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '320px',
                height: '100vh',
                zIndex: 900,
                // THE VOID THEME: Premium Solid Dark
                background: '#09090b',
                borderRight: '1px solid #27272a',
                boxShadow: '30px 0 100px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                color: '#e2e8f0'
            }}
        >
            <div className="sidebar-header" style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
                    {cityData.name}
                </h2>
                <button
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                    ×
                </button>
            </div>

            <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
                <div className="file-tree-container" style={{ padding: '16px 10px' }}>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#64748b',
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
                            color: isSelected ? '#60a5fa' : '#cbd5e1',
                            background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            borderRadius: '4px',
                            marginBottom: '1px'
                        }}
                    >
                        <File size={12} className={item.language} /> {name}
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
                    padding: '4px 8px',
                    paddingLeft: `${depth * 12 + 8}px`,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontWeight: 600,
                    userSelect: 'none'
                }}
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={14} fill={isOpen ? "#94a3b8" : "none"} />
                {name}
            </div>
            {isOpen && children}
        </div>
    )
}
