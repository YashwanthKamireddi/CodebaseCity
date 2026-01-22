/**
 * FileTable.jsx
 *
 * Transformed into "Metrics Dashboard".
 * Focus: Data analysis, sorting, and identifying outliers.
 * No redundant search bar.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronUp,
    ChevronDown,
    FileCode,
    AlertTriangle,
    ExternalLink,
    Filter,
    ArrowUpRight,
    Activity,
    Layers
} from 'lucide-react'
import useStore from '../store/useStore'
import './FileTable.css'

// Health color based on score
function getHealthColor(health) {
    if (health >= 80) return 'var(--color-success, #22c55e)'
    if (health >= 60) return 'var(--color-warning, #f59e0b)'
    if (health >= 40) return '#f97316'
    return 'var(--color-error, #ef4444)'
}

export default function FileTable({ buildings = [], onSelectFile }) {
    const { selectedBuilding, selectBuilding } = useStore()

    // Sorting state
    const [sortColumn, setSortColumn] = useState('health')
    const [sortDirection, setSortDirection] = useState('asc') // Worst first by default for health

    // Filter state
    const [filterMode, setFilterMode] = useState('all') // 'all' | 'critical' | 'churn'

    // Calculate metrics
    const filesWithMetrics = useMemo(() => {
        return buildings.map(b => {
            const complexity = b.metrics?.complexity || 0
            const decay = b.decay_level || 0
            const loc = b.metrics?.loc || 0

            // Recalculate robust health score locally for grid consistency
            let health = 100
            health -= Math.min(30, complexity * 1.5)
            health -= Math.min(30, decay * 30)
            health -= Math.min(20, Math.log10(loc + 1) * 5)
            health = Math.max(0, Math.round(health))

            return {
                ...b,
                health,
                isCritical: health < 50,
                isHighChurn: (b.metrics?.churn || 0) > 10
            }
        })
    }, [buildings])

    // Filter and Sort
    const sortedFiles = useMemo(() => {
        let filtered = filesWithMetrics

        if (filterMode === 'critical') {
            filtered = filtered.filter(f => f.isCritical)
        } else if (filterMode === 'churn') {
            filtered = filtered.filter(f => f.isHighChurn)
        }

        return filtered.sort((a, b) => {
            let aVal, bVal

            switch (sortColumn) {
                case 'name':
                    aVal = a.name.toLowerCase()
                    bVal = b.name.toLowerCase()
                    break
                case 'health':
                    aVal = a.health
                    bVal = b.health
                    break
                case 'loc':
                    aVal = a.metrics?.loc || 0
                    bVal = b.metrics?.loc || 0
                    break
                case 'complexity':
                    aVal = a.metrics?.complexity || 0
                    bVal = b.metrics?.complexity || 0
                    break
                case 'churn':
                    aVal = a.metrics?.churn || 0
                    bVal = b.metrics?.churn || 0
                    break
                default:
                    return 0
            }

            if (sortDirection === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
            }
        })
    }, [filesWithMetrics, sortColumn, sortDirection, filterMode])

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection(column === 'name' ? 'asc' : 'desc') // Text asc, numbers desc by default
        }
    }

    const SortIcon = ({ column }) => {
        if (sortColumn !== column) return <div style={{ width: 14 }} />
        return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
    }

    return (
        <div className="file-table-container">
            {/* Header / Toolbar */}
            <div className="file-table-toolbar">
                <div style={{ marginRight: 'auto', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Metrics Analysis
                </div>

                <div className="p-tab-group">
                    <button
                        className={`p-tab-btn ${filterMode === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterMode('all')}
                    >
                        All Files
                    </button>
                    <button
                        className={`p-tab-btn ${filterMode === 'critical' ? 'active' : ''}`}
                        onClick={() => setFilterMode('critical')}
                        style={{ color: filterMode === 'critical' ? 'var(--color-error)' : undefined }}
                    >
                        Critical Health
                    </button>
                    <button
                        className={`p-tab-btn ${filterMode === 'churn' ? 'active' : ''}`}
                        onClick={() => setFilterMode('churn')}
                        style={{ color: filterMode === 'churn' ? 'var(--color-warning)' : undefined }}
                    >
                        High Churn
                    </button>
                </div>
            </div>

            {/* Data Grid */}
            <div className="file-table-wrapper">
                <table className="file-table">
                    <thead>
                        <tr>
                            <th className="sortable" onClick={() => handleSort('name')}>
                                <div className="th-content">File <SortIcon column="name" /></div>
                            </th>
                            <th className="sortable numeric" onClick={() => handleSort('health')}>
                                <div className="th-content right">Health <SortIcon column="health" /></div>
                            </th>
                            <th className="sortable numeric" onClick={() => handleSort('complexity')}>
                                <div className="th-content right">Complexity <SortIcon column="complexity" /></div>
                            </th>
                            <th className="sortable numeric" onClick={() => handleSort('churn')}>
                                <div className="th-content right">Churn <SortIcon column="churn" /></div>
                            </th>
                            <th className="sortable numeric" onClick={() => handleSort('loc')}>
                                <div className="th-content right">LOC <SortIcon column="loc" /></div>
                            </th>
                            <th className="actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {sortedFiles.map((file, index) => (
                                <motion.tr
                                    key={file.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: Math.min(index * 0.01, 0.5) }}
                                    className={`${selectedBuilding?.id === file.id ? 'selected' : ''}`}
                                    onClick={() => {
                                        selectBuilding(file)
                                        // Also switch to 3D view if desired, or just show panel
                                        // onSelectFile?.(file)
                                    }}
                                >
                                    <td className="file-name">
                                        <FileCode size={14} className="file-icon" />
                                        <div className="file-info">
                                            <span className="name">{file.name}</span>
                                            <span className="path">{file.path}</span>
                                        </div>
                                    </td>

                                    <td className="numeric">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                            <span style={{ color: getHealthColor(file.health), fontWeight: 600 }}>{file.health}%</span>
                                            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                                <div style={{ width: `${file.health}%`, height: '100%', background: getHealthColor(file.health), borderRadius: '2px' }} />
                                            </div>
                                        </div>
                                    </td>

                                    <td className="numeric">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                            <span>{file.metrics?.complexity || 0}</span>
                                            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                                {/* Cap visual at 50 for complexity */}
                                                <div style={{ width: `${Math.min(100, ((file.metrics?.complexity || 0) / 30) * 100)}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '2px' }} />
                                            </div>
                                        </div>
                                    </td>

                                    <td className="numeric">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                            <span>{file.metrics?.churn || 0}</span>
                                            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                                <div style={{ width: `${Math.min(100, ((file.metrics?.churn || 0) / 20) * 100)}%`, height: '100%', background: 'var(--color-warning)', borderRadius: '2px' }} />
                                            </div>
                                        </div>
                                    </td>

                                    <td className="numeric" style={{ fontFamily: 'var(--font-mono)' }}>
                                        {file.metrics?.loc?.toLocaleString() || 0}
                                    </td>

                                    <td className="actions">
                                        <button
                                            className="action-btn"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                window.open(`vscode://file/${file.path}`, '_blank')
                                            }}
                                            title="Open in Editor"
                                        >
                                            <ArrowUpRight size={14} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
            <div className="file-table-footer">
                <span>{sortedFiles.length} files matched</span>
            </div>
        </div>
    )
}
