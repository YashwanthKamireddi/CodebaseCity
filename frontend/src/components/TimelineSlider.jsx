import React, { useEffect, useCallback } from 'react'
import useStore from '../store/useStore'

export default function TimelineSlider() {
    const {
        commits,
        currentCommitIndex,
        historyLoading,
        currentRepoPath,
        fetchHistory,
        setCommitIndex,
        analyzeAtCommit,
        loading
    } = useStore()

    // Fetch history when repo path changes
    useEffect(() => {
        if (currentRepoPath && commits.length === 0) {
            fetchHistory(currentRepoPath)
        }
    }, [currentRepoPath, commits.length, fetchHistory])

    const handleSliderChange = useCallback((e) => {
        const index = parseInt(e.target.value, 10)
        setCommitIndex(index)
    }, [setCommitIndex])

    const handleCommitSelect = useCallback(() => {
        if (currentCommitIndex >= 0 && currentCommitIndex < commits.length) {
            const commit = commits[currentCommitIndex]
            analyzeAtCommit(commit.hash)
        }
    }, [currentCommitIndex, commits, analyzeAtCommit])

    // Don't show if no history
    if (!currentRepoPath || commits.length === 0) return null

    const currentCommit = currentCommitIndex >= 0 ? commits[currentCommitIndex] : null

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px 20px',
            zIndex: 500,
            minWidth: '400px',
            maxWidth: '600px'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
            }}>
                <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 600 }}>
                    ⏰ Git Timeline
                </span>
                <span style={{ fontSize: '11px', color: '#7a7a8c' }}>
                    {commits.length} commits
                </span>
            </div>

            {/* Slider */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                    type="range"
                    min="0"
                    max={commits.length - 1}
                    value={currentCommitIndex >= 0 ? currentCommitIndex : commits.length - 1}
                    onChange={handleSliderChange}
                    disabled={loading || historyLoading}
                    style={{
                        width: '100%',
                        height: '6px',
                        appearance: 'none',
                        background: 'linear-gradient(to right, #818cf8, #6366f1)',
                        borderRadius: '3px',
                        cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.5 : 1
                    }}
                />
            </div>

            {/* Commit Info */}
            {currentCommit && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: '12px',
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {currentCommit.message}
                        </div>
                        <div style={{ fontSize: '10px', color: '#7a7a8c' }}>
                            {currentCommit.short_hash} • {currentCommit.date} • {currentCommit.author}
                        </div>
                    </div>
                    <button
                        onClick={handleCommitSelect}
                        disabled={loading}
                        style={{
                            padding: '6px 12px',
                            background: loading ? '#4b5563' : 'linear-gradient(135deg, #818cf8, #6366f1)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: loading ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {loading ? 'Loading...' : 'Time Travel'}
                    </button>
                </div>
            )}

            {/* Current state indicator */}
            {currentCommitIndex === -1 && (
                <div style={{ fontSize: '11px', color: '#22c55e', textAlign: 'center' }}>
                    📍 Viewing current state (HEAD)
                </div>
            )}
        </div>
    )
}
