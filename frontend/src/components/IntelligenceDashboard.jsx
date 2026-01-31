/**
 * IntelligenceDashboard
 * Developer tools dashboard with code health, quality, and impact analysis.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'

// Icons
const HealthIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
)

const BugIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3 3 0 1 1 6 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
        <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M6 17H2M18 13h4M18 17h4M17.47 9c1.93-.2 3.53-1.9 3.53-4" />
    </svg>
)

const QualityIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
)

const ImpactIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
)

const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)

const CriticalIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
)

const RefactorIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 17l6-6-6-6M12 19h8" />
    </svg>
)

const LayersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
    </svg>
)

// Grade color mapping
const gradeColors = {
    'A': '#22c55e',
    'B': '#84cc16',
    'C': '#eab308',
    'D': '#f97316',
    'F': '#ef4444'
}

// Severity colors
const severityColors = {
    'info': '#60a5fa',
    'warning': '#fbbf24',
    'error': '#f87171',
    'critical': '#ef4444'
}

const API_BASE = '/api'

export default function IntelligenceDashboard() {
    const {
        activeIntelligencePanel,
        setActiveIntelligencePanel,
        healthReport,
        deadCodeReport,
        qualityReport,
        impactAnalysis,
        criticalPaths,
        searchResults,
        intelligenceLoading,
        fetchHealthReport,
        fetchDeadCodeReport,
        fetchQualityReport,
        fetchCriticalPaths,
        performSmartSearch,
        cityData,
        cityId
    } = useStore()
    
    const [searchQuery, setSearchQuery] = useState('')
    const [searchType, setSearchType] = useState('exact')
    const [refactoringReport, setRefactoringReport] = useState(null)
    const [dependencyReport, setDependencyReport] = useState(null)
    const [loadingRefactor, setLoadingRefactor] = useState(false)
    const [loadingDeps, setLoadingDeps] = useState(false)
    
    // Fetch data when panel changes
    useEffect(() => {
        if (!cityData) return
        
        switch (activeIntelligencePanel) {
            case 'health':
                if (!healthReport) fetchHealthReport()
                break
            case 'deadCode':
                if (!deadCodeReport) fetchDeadCodeReport()
                break
            case 'quality':
                if (!qualityReport) fetchQualityReport()
                break
            case 'critical':
                if (!criticalPaths) fetchCriticalPaths()
                break
            case 'refactor':
                if (!refactoringReport) fetchRefactoringReport()
                break
            case 'architecture':
                if (!dependencyReport) fetchDependencyReport()
                break
        }
    }, [activeIntelligencePanel, cityData])
    
    const fetchRefactoringReport = async () => {
        if (!cityId) return
        setLoadingRefactor(true)
        try {
            const response = await fetch(`${API_BASE}/intelligence/refactoring/${cityId}`)
            if (response.ok) {
                const data = await response.json()
                setRefactoringReport(data.refactoring)
            }
        } catch (error) {
            console.error('Refactoring fetch failed:', error)
        }
        setLoadingRefactor(false)
    }
    
    const fetchDependencyReport = async () => {
        if (!cityId) return
        setLoadingDeps(true)
        try {
            const response = await fetch(`${API_BASE}/intelligence/dependencies/${cityId}`)
            if (response.ok) {
                const data = await response.json()
                setDependencyReport(data.dependencies)
            }
        } catch (error) {
            console.error('Dependency fetch failed:', error)
        }
        setLoadingDeps(false)
    }
    
    if (!cityData) return null
    
    const handleSearch = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            performSmartSearch(searchQuery, searchType)
        }
    }
    
    const tabs = [
        { id: 'health', icon: <HealthIcon />, label: 'Health' },
        { id: 'quality', icon: <QualityIcon />, label: 'Quality' },
        { id: 'deadCode', icon: <BugIcon />, label: 'Dead Code' },
        { id: 'refactor', icon: <RefactorIcon />, label: 'Refactor' },
        { id: 'architecture', icon: <LayersIcon />, label: 'Arch' },
        { id: 'critical', icon: <CriticalIcon />, label: 'Critical' },
        { id: 'search', icon: <SearchIcon />, label: 'Search' }
    ]
    
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed right-4 top-20 w-96 max-h-[calc(100vh-120px)] bg-slate-900/95 
                       backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl 
                       overflow-hidden z-50"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        🧠 Intelligence
                    </h2>
                    <button
                        onClick={() => setActiveIntelligencePanel(null)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveIntelligencePanel(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm 
                                       whitespace-nowrap transition-all
                                       ${activeIntelligencePanel === tab.id
                                           ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                           : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                       }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(100vh-280px)] p-4">
                <AnimatePresence mode="wait">
                    {activeIntelligencePanel === 'health' && (
                        <HealthPanel report={healthReport} loading={intelligenceLoading.health} />
                    )}
                    {activeIntelligencePanel === 'quality' && (
                        <QualityPanel report={qualityReport} loading={intelligenceLoading.quality} />
                    )}
                    {activeIntelligencePanel === 'deadCode' && (
                        <DeadCodePanel report={deadCodeReport} loading={intelligenceLoading.deadCode} />
                    )}
                    {activeIntelligencePanel === 'critical' && (
                        <CriticalPathsPanel paths={criticalPaths} loading={intelligenceLoading.critical} />
                    )}
                    {activeIntelligencePanel === 'refactor' && (
                        <RefactoringPanel report={refactoringReport} loading={loadingRefactor} />
                    )}
                    {activeIntelligencePanel === 'architecture' && (
                        <ArchitecturePanel report={dependencyReport} loading={loadingDeps} />
                    )}
                    {activeIntelligencePanel === 'search' && (
                        <SearchPanel
                            query={searchQuery}
                            setQuery={setSearchQuery}
                            type={searchType}
                            setType={setSearchType}
                            onSearch={handleSearch}
                            results={searchResults}
                            loading={intelligenceLoading.search}
                        />
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}

// Health Panel Component
function HealthPanel({ report, loading }) {
    if (loading) return <LoadingState message="Analyzing code health..." />
    if (!report) return <EmptyState message="Click to analyze code health" />
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
        >
            {/* Score Card */}
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-5xl font-bold mb-1" style={{ color: gradeColors[report.overall_grade] || '#fff' }}>
                    {report.overall_score}
                </div>
                <div className="text-slate-400 text-sm">Overall Health Score</div>
                <div 
                    className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: `${gradeColors[report.overall_grade]}20`, color: gradeColors[report.overall_grade] }}
                >
                    Grade {report.overall_grade}
                </div>
            </div>
            
            {/* Grade Distribution */}
            <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Grade Distribution</h3>
                <div className="flex gap-2">
                    {Object.entries(report.grade_distribution || {}).map(([grade, count]) => (
                        <div 
                            key={grade}
                            className="flex-1 text-center py-2 rounded"
                            style={{ backgroundColor: `${gradeColors[grade]}15` }}
                        >
                            <div className="font-bold" style={{ color: gradeColors[grade] }}>{count}</div>
                            <div className="text-xs text-slate-500">{grade}</div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Hotspots */}
            {report.hotspots?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">🔥 Hotspots</h3>
                    <div className="space-y-2">
                        {report.hotspots.slice(0, 5).map((hotspot, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300 truncate max-w-[200px]">{hotspot.path}</span>
                                <span className="text-red-400 font-mono">{hotspot.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Recommendations */}
            {report.recommendations?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">💡 Recommendations</h3>
                    <ul className="space-y-2 text-sm text-slate-400">
                        {report.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </motion.div>
    )
}

// Quality Panel Component
function QualityPanel({ report, loading }) {
    if (loading) return <LoadingState message="Scanning for issues..." />
    if (!report) return <EmptyState message="Click to scan code quality" />
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
        >
            {/* Score */}
            <div className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
                <div>
                    <div className="text-3xl font-bold text-white">{report.quality_score}</div>
                    <div className="text-sm text-slate-400">Quality Score</div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-slate-300">{report.total_issues}</div>
                    <div className="text-sm text-slate-400">Issues Found</div>
                </div>
            </div>
            
            {/* Issues by Severity */}
            <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Issues by Severity</h3>
                <div className="grid grid-cols-4 gap-2">
                    {Object.entries(report.by_severity || {}).map(([severity, count]) => (
                        <div 
                            key={severity}
                            className="text-center py-2 rounded"
                            style={{ backgroundColor: `${severityColors[severity]}15` }}
                        >
                            <div className="font-bold" style={{ color: severityColors[severity] }}>{count}</div>
                            <div className="text-xs text-slate-500 capitalize">{severity}</div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Top Issues */}
            {report.top_issues?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">Top Issues</h3>
                    <div className="space-y-3">
                        {report.top_issues.slice(0, 5).map((issue, i) => (
                            <div key={i} className="border-l-2 pl-3" style={{ borderColor: severityColors[issue.severity] }}>
                                <div className="text-sm font-medium text-white">{issue.title}</div>
                                <div className="text-xs text-slate-400">{issue.file_path}</div>
                                {issue.suggestion && (
                                    <div className="text-xs text-blue-400 mt-1">{issue.suggestion}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Recommendations */}
            {report.recommendations?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Recommendations</h3>
                    <ul className="space-y-1.5 text-sm text-slate-400">
                        {report.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </motion.div>
    )
}

// Dead Code Panel Component
function DeadCodePanel({ report, loading }) {
    if (loading) return <LoadingState message="Detecting dead code..." />
    if (!report) return <EmptyState message="Click to find dead code" />
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
        >
            {/* Summary */}
            <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Health Status</span>
                    <span className={`font-semibold ${
                        report.health_status === 'healthy' ? 'text-green-400' :
                        report.health_status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                        {report.health_status?.toUpperCase()}
                    </span>
                </div>
                <div className="text-sm text-slate-500">{report.summary?.message}</div>
            </div>
            
            {/* Orphan Files */}
            {report.orphan_files?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-orange-400 mb-3">
                        🏚️ Orphan Files ({report.orphan_files.length})
                    </h3>
                    <div className="space-y-2">
                        {report.orphan_files.slice(0, 5).map((file, i) => (
                            <div key={i} className="text-sm text-slate-300 truncate">{file.path}</div>
                        ))}
                        {report.orphan_files.length > 5 && (
                            <div className="text-xs text-slate-500">
                                +{report.orphan_files.length - 5} more
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Low Usage Files */}
            {report.low_usage_files?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-yellow-400 mb-3">
                        📉 Low Usage Files ({report.low_usage_files.length})
                    </h3>
                    <div className="space-y-2">
                        {report.low_usage_files.slice(0, 5).map((file, i) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span className="text-slate-300 truncate max-w-[200px]">{file.path}</span>
                                <span className="text-slate-500">{file.usage_count} uses</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    )
}

// Critical Paths Panel Component
function CriticalPathsPanel({ paths, loading }) {
    if (loading) return <LoadingState message="Finding critical files..." />
    if (!paths) return <EmptyState message="Click to find critical paths" />
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
        >
            <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                    ⚠️ High-Risk Files ({paths.length})
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                    These files have many dependents. Change with caution.
                </p>
                <div className="space-y-3">
                    {paths.slice(0, 10).map((file, i) => (
                        <div key={i} className="bg-slate-700/30 rounded p-3">
                            <div className="text-sm font-medium text-white truncate">{file.path}</div>
                            <div className="flex gap-4 mt-1 text-xs">
                                <span className="text-blue-400">{file.direct_dependents} direct deps</span>
                                <span className="text-purple-400">{file.transitive_dependents} transitive</span>
                                <span className="text-orange-400">Score: {file.criticality_score}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

// Search Panel Component
function SearchPanel({ query, setQuery, type, setType, onSearch, results, loading }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
        >
            {/* Search Form */}
            <form onSubmit={onSearch} className="space-y-3">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search code..."
                    className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2
                             text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-2">
                    {['exact', 'regex', 'fuzzy', 'structural'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors
                                       ${type === t
                                           ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                           : 'bg-slate-700/30 text-slate-400 hover:text-white'
                                       }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 
                             text-white py-2 rounded-lg transition-colors"
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>
            
            {/* Structural Search Help */}
            {type === 'structural' && (
                <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
                    <p className="font-medium mb-1">Syntax:</p>
                    <ul className="space-y-1">
                        <li><code className="text-blue-400">function:name</code> - Find functions</li>
                        <li><code className="text-blue-400">class:Name</code> - Find classes</li>
                        <li><code className="text-blue-400">import:module</code> - Find imports</li>
                    </ul>
                </div>
            )}
            
            {/* Results */}
            {results && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                        Found {results.total_results} results
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {results.results?.slice(0, 20).map((result, i) => (
                            <div key={i} className="border-l-2 border-blue-500 pl-3">
                                <div className="text-xs text-slate-400">{result.file_path}:{result.line_number}</div>
                                <code className="text-sm text-slate-300 block mt-1 overflow-x-auto">
                                    {result.line_content}
                                </code>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    )
}

// Loading State Component
function LoadingState({ message }) {
    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <div className="text-sm text-slate-400">{message}</div>
        </div>
    )
}

// Empty State Component
function EmptyState({ message }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-sm text-slate-400">{message}</div>
        </div>
    )
}

// Refactoring Panel Component
function RefactoringPanel({ report, loading }) {
    if (loading) return <LoadingState message="Analyzing refactoring opportunities..." />
    if (!report) return <EmptyState message="Click to find refactoring suggestions" />
    
    const priorityColors = {
        high: '#ef4444',
        medium: '#f59e0b',
        low: '#22c55e'
    }
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
        >
            {/* Summary */}
            <div className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
                <div>
                    <div className="text-2xl font-bold text-white">{report.total_suggestions}</div>
                    <div className="text-sm text-slate-400">Suggestions</div>
                </div>
                <div className="flex gap-3">
                    <div className="text-center">
                        <div className="text-lg font-bold text-red-400">{report.by_priority?.high || 0}</div>
                        <div className="text-xs text-slate-500">High</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-yellow-400">{report.by_priority?.medium || 0}</div>
                        <div className="text-xs text-slate-500">Medium</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-green-400">{report.by_priority?.low || 0}</div>
                        <div className="text-xs text-slate-500">Low</div>
                    </div>
                </div>
            </div>
            
            {/* Quick Wins */}
            {report.quick_wins?.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-green-400 mb-3">⚡ Quick Wins</h3>
                    <div className="space-y-2">
                        {report.quick_wins.map((win, i) => (
                            <div key={i} className="text-sm text-slate-300">
                                • {win.title}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Top Suggestions */}
            {report.suggestions?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">Top Suggestions</h3>
                    <div className="space-y-3">
                        {report.suggestions.slice(0, 8).map((suggestion, i) => (
                            <div 
                                key={i} 
                                className="border-l-2 pl-3"
                                style={{ borderColor: priorityColors[suggestion.effort] || '#6b7280' }}
                            >
                                <div className="text-sm font-medium text-white">{suggestion.title}</div>
                                <div className="text-xs text-slate-400 mt-1">{suggestion.description}</div>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                                        {suggestion.effort} effort
                                    </span>
                                    <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                                        {suggestion.type}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Recommendations */}
            {report.recommendations?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Recommendations</h3>
                    <ul className="space-y-1.5 text-sm text-slate-400">
                        {report.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </motion.div>
    )
}

// Architecture Panel Component
function ArchitecturePanel({ report, loading }) {
    if (loading) return <LoadingState message="Analyzing architecture..." />
    if (!report) return <EmptyState message="Click to analyze architecture" />
    
    const healthColors = {
        excellent: '#22c55e',
        good: '#84cc16',
        fair: '#eab308',
        needs_attention: '#ef4444'
    }
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
        >
            {/* Summary */}
            <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-sm">Architecture Health</span>
                    <span 
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ 
                            backgroundColor: `${healthColors[report.summary?.health]}20`,
                            color: healthColors[report.summary?.health]
                        }}
                    >
                        {report.summary?.health?.toUpperCase()}
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-700/30 rounded p-2">
                        <div className="text-lg font-bold text-white">{report.summary?.total_layers || 0}</div>
                        <div className="text-xs text-slate-500">Layers</div>
                    </div>
                    <div className="bg-slate-700/30 rounded p-2">
                        <div className="text-lg font-bold text-white">{report.coupling_metrics?.coupling_level || 'N/A'}</div>
                        <div className="text-xs text-slate-500">Coupling</div>
                    </div>
                    <div className="bg-slate-700/30 rounded p-2">
                        <div className="text-lg font-bold text-red-400">{report.summary?.violation_count || 0}</div>
                        <div className="text-xs text-slate-500">Violations</div>
                    </div>
                </div>
            </div>
            
            {/* Layers */}
            {report.layers && Object.keys(report.layers).length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">Detected Layers</h3>
                    <div className="space-y-2">
                        {Object.entries(report.layers).map(([name, layer]) => (
                            <div key={name} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300 capitalize">{name}</span>
                                <span className="text-slate-500">{layer.file_count} files</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Hubs */}
            {report.hubs?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">🎯 Central Hubs</h3>
                    <div className="space-y-2">
                        {report.hubs.slice(0, 5).map((hub, i) => (
                            <div key={i} className="text-sm">
                                <div className="text-slate-300 truncate">{hub.path}</div>
                                <div className="flex gap-2 text-xs text-slate-500">
                                    <span>{hub.in_degree} in</span>
                                    <span>{hub.out_degree} out</span>
                                    <span className="text-blue-400">{hub.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Layer Violations */}
            {report.layer_violations?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-red-400 mb-3">
                        ⚠️ Layer Violations ({report.layer_violations.length})
                    </h3>
                    <div className="space-y-2">
                        {report.layer_violations.slice(0, 5).map((violation, i) => (
                            <div key={i} className="text-xs text-slate-400">
                                <span className="text-slate-300">{violation.source_layer}</span>
                                <span className="text-red-400"> → </span>
                                <span className="text-slate-300">{violation.target_layer}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Insights */}
            {report.summary?.insights?.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Insights</h3>
                    <ul className="space-y-1.5 text-sm text-slate-400">
                        {report.summary.insights.map((insight, i) => (
                            <li key={i}>{insight}</li>
                        ))}
                    </ul>
                </div>
            )}
        </motion.div>
    )
}
