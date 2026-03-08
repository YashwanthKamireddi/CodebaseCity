import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    FileCode,
    ArrowUpRight,
    Search,
    Activity
} from 'lucide-react'
import useStore from '../../../store/useStore'
import './FileTable.css'
import { BuildingModel } from '../../../entities/building/model'
import AuditStats from './AuditStats'
import PatternList from './PatternList'
import { slideUp } from '../../../shared/animations/variants'
import { FolderSearch } from 'lucide-react'

// Constants for virtualization
const ROW_HEIGHT = 56 // Height of each table row in pixels
const BUFFER_ROWS = 5 // Extra rows to render above/below viewport
const MAX_VISIBLE_ROWS = 50 // Maximum rows to render at once

function getHealthColor(health) {
    if (health >= 80) return 'var(--color-success)'
    if (health >= 60) return 'var(--color-warning)'
    if (health >= 40) return '#f97316'
    return 'var(--color-error)'
}

export default function FileTable({ buildings = [], onSelectFile }) {
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const selectBuilding = useStore(s => s.selectBuilding)
    const cityData = useStore(s => s.cityData)

    const [sortColumn, setSortColumn] = useState('health')
    const [sortDirection, setSortDirection] = useState('asc')
    const [searchQuery, setSearchQuery] = useState('')
    const [showRisks, setShowRisks] = useState(false)

    // Virtualization state
    const [scrollTop, setScrollTop] = useState(0)
    const containerRef = useRef(null)
    const [containerHeight, setContainerHeight] = useState(600)

    // Debounced search for better performance
    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 150)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Measure container height
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const resizeObserver = new window.ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height)
            }
        })
        resizeObserver.observe(container)
        return () => resizeObserver.disconnect()
    }, [])

    const filesWithMetrics = useMemo(() => {
        return buildings.map(b => ({
            ...b,
            health: BuildingModel.calculateHealth(b.metrics, b.decay_level),
            complexity: b.metrics?.complexity || 0,
            churn: b.metrics?.churn || 0,
            coupling: b.metrics?.dependencies_in || 0
        }))
    }, [buildings])

    const sortedFiles = useMemo(() => {
        let filtered = filesWithMetrics
        if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase()
            filtered = filtered.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
        }
        return filtered.sort((a, b) => {
            let aVal = a[sortColumn]
            let bVal = b[sortColumn]
            if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase() }
            if (sortDirection === 'asc') return aVal > bVal ? 1 : -1
            return aVal < bVal ? 1 : -1
        })
    }, [filesWithMetrics, sortColumn, sortDirection, debouncedSearch])

    // Calculate visible range for virtualization
    const { startIndex, endIndex, visibleFiles, offsetY } = useMemo(() => {
        const totalRows = sortedFiles.length
        const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT)
        const actualMaxRows = Math.min(MAX_VISIBLE_ROWS, visibleRowCount + BUFFER_ROWS * 2)

        const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS)
        const endIdx = Math.min(totalRows, startIdx + actualMaxRows)

        return {
            startIndex: startIdx,
            endIndex: endIdx,
            visibleFiles: sortedFiles.slice(startIdx, endIdx),
            offsetY: startIdx * ROW_HEIGHT
        }
    }, [sortedFiles, scrollTop, containerHeight])

    const handleSort = (col) => {
        if (sortColumn === col) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        else { setSortColumn(col); setSortDirection(col === 'name' ? 'asc' : 'desc') }
    }

    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop)
    }, [])

    const totalHeight = sortedFiles.length * ROW_HEIGHT

    return (
        <div className="file-table-container">
            <div className="ft-head-area">
                <div className="ft-head-row">
                    <h1 className="ft-title">Engineering Audit</h1>
                    <div className="ft-search">
                        <Search size={16} className="ft-search-icon" />
                        <input type="text" placeholder="Filter files..." value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)} className="ft-search-input" />
                    </div>
                </div>

                <AuditStats buildings={buildings} />

                {cityData?.issues && (
                    <div className="ft-risks">
                        <button onClick={() => setShowRisks(!showRisks)} className="ft-risks-toggle">
                            {showRisks ? 'Hide' : 'Show'} Intelligence Report
                        </button>
                        {showRisks && (
                            <motion.div initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }} className="ft-risks-body">
                                <PatternList issues={cityData.issues} buildings={buildings} />
                            </motion.div>
                        )}
                    </div>
                )}
            </div>

            <div
                className="file-table-wrapper surface-glass ft-table-glass"
                ref={containerRef}
                onScroll={handleScroll}
                style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}
            >
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
                    <tbody style={{ height: totalHeight, position: 'relative' }}>
                        {/* Spacer for virtualization offset */}
                        {offsetY > 0 && (
                            <tr style={{ height: offsetY, visibility: 'hidden' }}>
                                <td colSpan={6}></td>
                            </tr>
                        )}
                        {visibleFiles.map((file, i) => (
                            <tr
                                key={file.id}
                                onClick={() => selectBuilding(file)}
                                className={selectedBuilding?.id === file.id ? 'selected' : ''}
                                style={{ height: ROW_HEIGHT }}
                            >
                                <td className="file-name">
                                    <FileCode size={14} className="ft-file-icon" />
                                    <div className="ft-file-info">
                                        <span className="ft-file-name">{file.name}</span>
                                        <span className="ft-file-path">{file.path}</span>
                                    </div>
                                </td>
                                <td className="numeric">
                                    <div className="ft-metric-cell">
                                        <span className="ft-metric-val" style={{ color: getHealthColor(file.health) }}>{file.health}%</span>
                                        <div className="ft-bar"><div className="ft-bar-fill" style={{ width: `${file.health}%`, background: getHealthColor(file.health) }} /></div>
                                    </div>
                                </td>
                                <td className="numeric">
                                    <div className="ft-metric-cell">
                                        <span>{file.complexity}</span>
                                        <div className="ft-bar"><div className="ft-bar-fill" style={{ width: `${Math.min(100, (file.complexity / 20) * 100)}%`, background: file.complexity > 20 ? '#db2777' : 'var(--color-info)' }} /></div>
                                    </div>
                                </td>
                                <td className="numeric">
                                    <div className="ft-metric-cell">
                                        <span>{file.churn}</span>
                                        {file.churn > 5 && <Activity size={12} style={{ color: 'var(--color-warning)' }} />}
                                    </div>
                                </td>
                                <td className="numeric ft-mono">{file.coupling}</td>
                                <td className="actions">
                                    <button onClick={(e) => { e.stopPropagation(); window.open(`vscode://file/${file.path}`) }} className="ft-icon-btn">
                                        <ArrowUpRight size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sortedFiles.length === 0 && (
                    <motion.div variants={slideUp} initial="initial" animate="animate" className="ft-empty">
                        <FolderSearch size={48} strokeWidth={1} className="ft-empty-icon" />
                        <h3 className="ft-empty-title">No files found</h3>
                        <p className="ft-empty-desc">Adjust your filters or analyze a new repository to see metrics.</p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
