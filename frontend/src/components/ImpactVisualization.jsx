/**
 * ImpactVisualization
 * Shows the blast radius when a file is selected.
 * Highlights affected files in the 3D city view.
 */

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'

const riskColors = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
}

export default function ImpactVisualization() {
    const {
        selectedBuilding,
        impactAnalysis,
        fetchImpactAnalysis,
        checkSafeDelete,
        intelligenceLoading
    } = useStore()

    const [safeDeleteResult, setSafeDeleteResult] = useState(null)
    const [showPanel, setShowPanel] = useState(false)

    // Fetch impact when building selected
    useEffect(() => {
        if (selectedBuilding?.id) {
            fetchImpactAnalysis(selectedBuilding.id)
            setShowPanel(true)
        } else {
            setShowPanel(false)
        }
    }, [selectedBuilding?.id])

    const handleCheckDelete = async () => {
        if (selectedBuilding?.id) {
            const result = await checkSafeDelete(selectedBuilding.id)
            setSafeDeleteResult(result)
        }
    }

    if (!showPanel || !selectedBuilding) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-4 left-4 w-80 bg-slate-900/95 backdrop-blur-xl
                           rounded-xl border border-slate-700/50 shadow-2xl z-50 overflow-hidden"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            🎯 Change Impact
                        </h3>
                        <button
                            onClick={() => setShowPanel(false)}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 truncate">
                        {selectedBuilding.path}
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    {intelligenceLoading.impact ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : impactAnalysis ? (
                        <div className="space-y-4">
                            {/* Risk Score */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Risk Level</span>
                                <span
                                    className="px-2 py-0.5 rounded text-xs font-semibold"
                                    style={{
                                        backgroundColor: `${riskColors[impactAnalysis.risk_level]}20`,
                                        color: riskColors[impactAnalysis.risk_level]
                                    }}
                                >
                                    {impactAnalysis.risk_level?.toUpperCase()}
                                </span>
                            </div>

                            {/* Affected Files Count */}
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-slate-500">Total Affected</span>
                                    <span className="text-lg font-bold text-white">
                                        {impactAnalysis.total_affected}
                                    </span>
                                </div>

                                {/* Levels breakdown */}
                                <div className="space-y-1.5">
                                    {Object.entries(impactAnalysis.levels || {}).map(([level, files]) => (
                                        <div key={level} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">
                                                {level.replace('_', ' ').replace('level', 'Level')}
                                            </span>
                                            <span className="text-slate-300">{files.length} files</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendation */}
                            <div className="text-xs text-slate-400 bg-slate-800/30 rounded p-2">
                                {impactAnalysis.recommendation}
                            </div>

                            {/* Safe Delete Check */}
                            <button
                                onClick={handleCheckDelete}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30
                                           text-red-400 py-2 rounded-lg text-sm transition-colors"
                            >
                                🗑️ Can I safely delete this?
                            </button>

                            {/* Safe Delete Result */}
                            {safeDeleteResult && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className={`rounded-lg p-3 ${
                                        safeDeleteResult.safe
                                            ? 'bg-green-500/10 border border-green-500/30'
                                            : 'bg-red-500/10 border border-red-500/30'
                                    }`}
                                >
                                    <div className={`font-semibold text-sm mb-1 ${
                                        safeDeleteResult.safe ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {safeDeleteResult.safe ? '✅ Safe to delete' : '❌ Not safe to delete'}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {safeDeleteResult.reason}
                                    </div>

                                    {safeDeleteResult.breaking_files?.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            <div className="text-xs text-red-400 font-medium">Would break:</div>
                                            {safeDeleteResult.breaking_files.slice(0, 3).map((file, i) => (
                                                <div key={i} className="text-xs text-slate-400 truncate">
                                                    • {file.path}
                                                </div>
                                            ))}
                                            {safeDeleteResult.total_breaking > 3 && (
                                                <div className="text-xs text-slate-500">
                                                    +{safeDeleteResult.total_breaking - 3} more
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {safeDeleteResult.warnings?.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {safeDeleteResult.warnings.map((warning, i) => (
                                                <div key={i} className="text-xs text-yellow-400">
                                                    ⚠️ {warning}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-sm text-slate-400">
                            Select a building to see impact analysis
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
