import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronUp,
    ChevronDown,
    FileCode,
    ArrowUpRight,
    Search
} from 'lucide-react'
import useStore from '../../../store/useStore'
import './FileTable.css'
import { BuildingModel } from '../../../entities/building/model'
import AuditStats from './AuditStats'
import PatternList from './PatternList'
import { slideUp } from '../../../shared/animations/variants'
import { FolderSearch } from 'lucide-react'

// Health color utility
function getHealthColor(health) {
    if (health >= 80) return '#10b981' // Emerald
    if (health >= 60) return '#f59e0b' // Amber
    if (health >= 40) return '#f97316' // Orange
    return '#ef4444' // Red
}

export default function FileTable({ buildings = [], onSelectFile }) {
    const { selectedBuilding, selectBuilding, cityMetadata } = useStore() // Need cityMetadata for global issues

    // Sorting state
    const [sortColumn, setSortColumn] = useState('health')
    const [sortDirection, setSortDirection] = useState('asc') // Critical first
    const [searchQuery, setSearchQuery] = useState('')
    const [showRisks, setShowRisks] = useState(false) // Toggle for Risk Panel

    // 1. Calculate Metrics
    const filesWithMetrics = useMemo(() => {
        return buildings.map(b => ({
            ...b,
            health: BuildingModel.calculateHealth(b.metrics, b.decay_level),
            complexity: b.metrics?.complexity || 0,
            churn: b.metrics?.churn || 0,
            coupling: b.metrics?.dependencies_in || 0
        }))
    }, [buildings])

    // 2. Filter & Sort
    const sortedFiles = useMemo(() => {
        let filtered = filesWithMetrics

        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
        }

        return filtered.sort((a, b) => {
            let aVal = a[sortColumn]
            let bVal = b[sortColumn]

            // Handle strings
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase()
            }

            if (sortDirection === 'asc') return aVal > bVal ? 1 : -1
            return aVal < bVal ? 1 : -1
        })
    }, [filesWithMetrics, sortColumn, sortDirection, searchQuery])

    const handleSort = (col) => {
        if (sortColumn === col) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        else {
            setSortColumn(col)
            setSortDirection(col === 'name' ? 'asc' : 'desc')
        }
    }

    return (
        <div className="file-table-container">
            {/* 1. Header & KPIs */}
            <div style={{ padding: '0 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Engineering Audit</h1>
                    {/* Search Bar */}
                    <div className="search-input-wrapper" style={{ width: '300px' }}>
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Filter files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>

                <AuditStats buildings={buildings} />

                {/* Risk & Pattern Section */}
                {cityMetadata?.issues && (
                    <div style={{ marginBottom: '24px' }}>
                        <button
                            onClick={() => setShowRisks(!showRisks)}
                            style={{
                                background: 'transparent', border: 'none', color: '#f59e0b',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            {showRisks ? 'Hide' : 'Show'} Intelligence Report
                        </button>

                        {showRisks && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                style={{ marginTop: '12px' }}
                            >
                                <PatternList issues={cityMetadata.issues} buildings={buildings} />
                            </motion.div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. The Data Grid */}
            <div className="file-table-wrapper surface-glass" style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <table className="file-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('name')} className="sortable">File Name</th>
                            <th onClick={() => handleSort('health')} className="sortable numeric">Health</th>
                            <th onClick={() => handleSort('complexity')} className="sortable numeric">Complexity</th>
                            <th onClick={() => handleSort('churn')} className="sortable numeric">Churn</th>
                            <th onClick={() => handleSort('coupling')} className="sortable numeric">Coupling</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {sortedFiles.slice(0, 100).map((file, i) => ( /* Virtualize later if needed, limit to 100 for perf */
                                <motion.tr
                                    key={file.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.02 }}
                                    onClick={() => selectBuilding(file)}
                                    className={selectedBuilding?.id === file.id ? 'selected' : ''}
                                >
                                    <td className="file-name">
                                        <FileCode size={14} style={{ opacity: 0.5, marginRight: 8 }} />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{file.name}</span>
                                            <span style={{ fontSize: '0.7em', color: '#64748b' }}>{file.path}</span>
                                        </div>
                                    </td>

                                    {/* Visual Metrics */}
                                    <td className="numeric">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                            <span style={{ fontWeight: 600, color: getHealthColor(file.health) }}>{file.health}%</span>
                                            <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: `${file.health}%`, background: getHealthColor(file.health) }} /></div>
                                        </div>
                                    </td>
                                    <td className="numeric">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                            <span>{file.complexity}</span>
                                            <div className="mini-bar-bg">
                                                <div className="mini-bar-fill" style={{
                                                    width: `${Math.min(100, (file.complexity / 20) * 100)}%`,
                                                    background: file.complexity > 20 ? '#db2777' : '#3b82f6'
                                                }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="numeric">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                            <span>{file.churn}</span>
                                            {file.churn > 5 && <Activity size={12} color="#f59e0b" />}
                                        </div>
                                    </td>
                                    <td className="numeric" style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
                                        {file.coupling}
                                    </td>

                                    <td className="actions">
                                        <button onClick={(e) => { e.stopPropagation(); window.open(`vscode://file/${file.path}`) }} className="icon-btn">
                                            <ArrowUpRight size={14} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {sortedFiles.length === 0 && (
                    <motion.div
                        variants={slideUp}
                        initial="initial"
                        animate="animate"
                        style={{ padding: '60px 32px', textAlign: 'center', color: '#64748b' }}
                    >
                        <FolderSearch size={48} strokeWidth={1} style={{ margin: '0 auto 16px', opacity: 0.5, display: 'block' }} />
                        <h3 style={{ margin: '0 0 8px 0', color: '#e2e8f0', fontWeight: 500 }}>No files found</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Adjust your filters or analyze a new repository to see metrics.</p>
                    </motion.div>
                )}
            </div>

            <style jsx>{`
                .mini-bar-bg { width: 40px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
                .mini-bar-fill { height: 100%; border-radius: 2px; }
                .icon-btn { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s; }
                .icon-btn:hover { background: rgba(255,255,255,0.1); color: white; }
                .search-input-wrapper {
                    background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
                    display: flex; align-items: center; padding: 0 12px; height: 36px;
                }
                .search-input-wrapper input {
                    background: transparent; border: none; color: white; outline: none; margin-left: 8px; font-size: 0.9rem;
                }
            `}</style>
        </div>
    )
}
