import React, { useMemo, useState, useEffect } from 'react'
import useStore from '../../../store/useStore'
import { Folder, File, Code, Activity, Server, Database, Cpu, Search } from 'lucide-react'
import './HUD.css'

export default function NeuralHUD() {
    const { cityData, selectBuilding, selectedBuilding, sidebarOpen, setSidebarOpen } = useStore()
    const [scanQuery, setScanQuery] = useState('')

    // Intel Calculation
    const diagnostics = useMemo(() => {
        if (!cityData?.buildings) return { loc: 0, churn: 0, files: 0, critical: 0 }

        let totalLoc = 0
        let totalChurn = 0
        let criticalCount = 0

        cityData.buildings.forEach(b => {
            totalLoc += b.metrics?.loc || 0
            totalChurn += b.metrics?.churn || 0
            if ((b.metrics?.churn || 0) > 20) criticalCount++
        })

        return {
            loc: (totalLoc / 1000).toFixed(1) + 'K',
            churn: totalChurn,
            files: cityData.buildings.length,
            critical: criticalCount
        }
    }, [cityData])

    // Filter Logic
    const filteredNodes = useMemo(() => {
        if (!cityData?.buildings) return []
        if (!scanQuery) return cityData.buildings

        const q = scanQuery.toLowerCase()
        return cityData.buildings.filter(b =>
            b.name.toLowerCase().includes(q) || b.path.toLowerCase().includes(q)
        )
    }, [cityData, scanQuery])

    if (!cityData) return null
    if (!sidebarOpen) return null

    return (
        <div className="neural-hud-container">
            {/* 1. Header & satellite link */}
            <div className="hud-header">
                <div className="system-status">
                    <h2 className="project-title">PROJECT: {cityData.name}</h2>
                    <div className="status-dot" title="Connected" />
                </div>

                {/* Search Input */}
                <div className="scan-input-wrapper">
                    <input
                        type="text"
                        className="scan-input"
                        placeholder="Search modules..."
                        value={scanQuery}
                        onChange={(e) => setScanQuery(e.target.value)}
                        autoFocus
                    />
                    <div className="scan-line" />
                </div>
            </div>

            {/* 2. Diagnostics Grid */}
            {!scanQuery && (
                <div className="diagnostic-grid">
                    <div className="diag-card">
                        <div className="diag-value">{diagnostics.files}</div>
                        <div className="diag-label">Modules</div>
                    </div>
                    <div className="diag-card">
                        <div className="diag-value" style={{ color: 'var(--color-warning)' }}>{diagnostics.loc}</div>
                        <div className="diag-label">Lines</div>
                    </div>
                    <div className="diag-card">
                        <div className="diag-value" style={{ color: 'var(--color-error)' }}>{diagnostics.critical}</div>
                        <div className="diag-label">Hotspots</div>
                    </div>
                    <div className="diag-card">
                        <div className="diag-value">{diagnostics.churn}</div>
                        <div className="diag-label">Activity</div>
                    </div>
                </div>
            )}

            {/* 3. Matrix View (File Tree) */}
            <div className="matrix-container">
                <div className="matrix-section-label">
                    {scanQuery ? 'SEARCH RESULTS' : 'EXPLORER'}
                </div>

                <FileMatrix
                    files={filteredNodes}
                    onSelect={selectBuilding}
                    selectedId={selectedBuilding?.id}
                    isScanning={!!scanQuery}
                />
            </div>

            {/* Footer Control */}
            <div className="hud-footer">
                <span>READY</span>
                <span className="hud-footer-action" onClick={() => setSidebarOpen(false)}>CLOSE</span>
            </div>
        </div>
    )
}

// Simplified Recursive Tree for HUD
function FileMatrix({ files, onSelect, selectedId, isScanning }) {
    // Re-use logic to build tree
    const tree = useMemo(() => {
        const root = {}
        files.forEach(f => {
            const parts = f.path.replace(/^\/+/, '').split('/')
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

    const renderNode = (node, depth = 0) => {
        return Object.entries(node).map(([name, item]) => {
            const isFile = item.__isFile
            if (isFile) {
                return (
                    <div
                        key={item.id}
                        className={`matrix-node ${selectedId === item.id ? 'active' : ''}`}
                        onClick={() => onSelect(item)}
                        style={{ paddingLeft: `${depth * 12 + 20}px` }}
                    >
                        <div className={`matrix-dot ${selectedId === item.id ? 'active' : ''}`} />
                        {name}
                    </div>
                )
            } else {
                return (
                    <FolderGroup key={name} name={name} depth={depth} forceOpen={isScanning}>
                        {renderNode(item, depth + 1)}
                    </FolderGroup>
                )
            }
        })
    }

    return <div>{renderNode(tree)}</div>
}

function FolderGroup({ name, depth, children, forceOpen }) {
    const [isOpen, setIsOpen] = useState(forceOpen || true)

    useEffect(() => {
        if (forceOpen) setIsOpen(true)
    }, [forceOpen])

    return (
        <div>
            <div
                className="matrix-node"
                style={{ paddingLeft: `${depth * 12 + 20}px` }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="matrix-folder-chevron">{isOpen ? '▼' : '▶'}</span>
                <span className="matrix-folder-name">{name.toUpperCase()}</span>
            </div>
            {isOpen && children}
        </div>
    )
}
