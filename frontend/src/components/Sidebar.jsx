import React from 'react'
import useStore from '../store/useStore'
import { Folder, File, Code, Hash, Link as LinkIcon, ChevronRight, ChevronDown } from 'lucide-react'

export default function Sidebar({ isOpen, onClose }) {
    const { cityData, selectBuilding, selectedBuilding } = useStore()

    if (!cityData) return null

    const { stats, metadata } = cityData
    const health = metadata?.health || { grade: 'A', score: 100 }

    const metrics = [
        { label: 'Files', value: stats?.total_files || 0, icon: <File size={14} /> },
        { label: 'Functions', value: stats?.functions_count || 'N/A', icon: <Code size={14} /> },
        { label: 'Links', value: stats?.total_dependencies || 0, icon: <LinkIcon size={14} /> },
        { label: 'LOC', value: stats?.total_loc?.toLocaleString() || 0, icon: <Hash size={14} /> }
    ]

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <h2>{cityData.name}</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            {/* Health Badge */}
            <div style={{ padding: '0 20px 10px 20px' }}>
                <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>Project Health</span>
                    <span>{health.grade} - {health.score}/100</span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '0 20px 20px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                {metrics.map((m, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>
                            {m.icon} {m.label}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>{m.value}</div>
                    </div>
                ))}
            </div>

            {/* Language Bar */}
            <div style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>LANGUAGES</div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                    {/* Mock data for now, would come from stats.languages */}
                    <div style={{ width: '45%', background: '#3178c6' }} title="TypeScript 45%" />
                    <div style={{ width: '30%', background: '#f7df1e' }} title="JavaScript 30%" />
                    <div style={{ width: '15%', background: '#563d7c' }} title="CSS 15%" />
                    <div style={{ width: '10%', background: '#e34c26' }} title="HTML 10%" />
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#cbd5e1' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3178c6' }} /> TS 45%
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#cbd5e1' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f7df1e' }} /> JS 30%
                    </div>
                </div>
            </div>

            <div className="sidebar-content">
                <div className="file-tree-container" style={{ padding: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '8px', paddingLeft: '8px' }}>EXPLORER</div>
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
