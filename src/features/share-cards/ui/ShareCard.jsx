/**
 * ShareCard.jsx - Visually Stunning City Export Card
 * 
 * Creates beautiful, shareable images of your codebase city
 * with stats, achievements, and branding.
 * 
 * Inspired by: Spotify Wrapped, GitHub Contribution Cards, Vercel Deploy Cards
 */

import { useState, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
    X, Download, Share2, Copy, Check,
    FileCode, Users, GitCommit, Activity,
    Award, Zap, Shield, Star, Code2, Layers
} from 'lucide-react'
import useStore from '../../../store/useStore'
import './ShareCard.css'

/**
 * Calculate code health score (0-100)
 */
function calculateHealthScore(cityData) {
    if (!cityData?.buildings?.length) return 0
    
    const buildings = cityData.buildings
    const metrics = cityData.metadata || {}
    
    let score = 100
    
    // Penalize for issues
    const issues = metrics.issues || {}
    const circularDeps = issues.circular_dependencies?.length || 0
    const godObjects = issues.god_objects?.length || 0
    
    score -= circularDeps * 5
    score -= godObjects * 3
    
    // Penalize for very complex files
    const highComplexity = buildings.filter(b => (b.metrics?.complexity || 0) > 30).length
    score -= highComplexity * 2
    
    // Penalize for very large files
    const largeFiles = buildings.filter(b => (b.metrics?.loc || 0) > 1000).length
    score -= largeFiles * 2
    
    return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Get earned achievements based on city data
 */
function getAchievements(cityData, healthScore) {
    const achievements = []
    const buildings = cityData?.buildings || []
    const metadata = cityData?.metadata || {}
    const issues = metadata.issues || {}
    
    // Diamond City - No circular dependencies
    if (!issues.circular_dependencies?.length) {
        achievements.push({ id: 'diamond', icon: '💎', name: 'Diamond City', desc: 'Zero circular dependencies' })
    }
    
    // Clean Code - Average LOC under 300
    const avgLoc = buildings.reduce((s, b) => s + (b.metrics?.loc || 0), 0) / Math.max(1, buildings.length)
    if (avgLoc < 300) {
        achievements.push({ id: 'clean', icon: '✨', name: 'Clean Code', desc: 'Average file under 300 LOC' })
    }
    
    // Metropolis - Over 500 files
    if (buildings.length > 500) {
        achievements.push({ id: 'metropolis', icon: '🏙️', name: 'Metropolis', desc: '500+ source files' })
    }
    
    // Healthy - Score above 90
    if (healthScore >= 90) {
        achievements.push({ id: 'healthy', icon: '💚', name: 'Healthy Codebase', desc: '90%+ health score' })
    }
    
    // Multi-lingual
    const languages = new Set(buildings.map(b => b.language).filter(Boolean))
    if (languages.size >= 3) {
        achievements.push({ id: 'polyglot', icon: '🌐', name: 'Polyglot', desc: '3+ programming languages' })
    }
    
    // Collaborative - Multiple authors
    const authors = new Set(buildings.map(b => b.author).filter(Boolean))
    if (authors.size >= 5) {
        achievements.push({ id: 'collaborative', icon: '👥', name: 'Team Effort', desc: '5+ contributors' })
    }
    
    return achievements.slice(0, 4) // Max 4 badges on card
}

/**
 * Get top language from buildings
 */
function getTopLanguage(buildings) {
    const langCounts = {}
    for (const b of buildings) {
        const lang = b.language || 'Unknown'
        langCounts[lang] = (langCounts[lang] || 0) + 1
    }
    const sorted = Object.entries(langCounts).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || 'Unknown'
}

/**
 * ShareCard Modal Component
 */
export default function ShareCard({ onClose }) {
    const cityData = useStore(s => s.cityData)
    const repoUrl = useStore(s => s.repoUrl)
    const cardRef = useRef(null)
    const [copied, setCopied] = useState(false)
    const [exporting, setExporting] = useState(false)
    
    // Calculate stats
    const stats = useMemo(() => {
        const buildings = cityData?.buildings || []
        const metadata = cityData?.metadata || {}
        
        const totalFiles = buildings.length
        const totalLoc = buildings.reduce((s, b) => s + (b.metrics?.loc || 0), 0)
        const avgComplexity = buildings.reduce((s, b) => s + (b.metrics?.complexity || 0), 0) / Math.max(1, totalFiles)
        const districts = cityData?.districts?.length || 0
        
        // Unique authors
        const authors = new Set(buildings.map(b => b.author).filter(Boolean))
        
        // Health score
        const healthScore = calculateHealthScore(cityData)
        
        // Achievements
        const achievements = getAchievements(cityData, healthScore)
        
        // Top language
        const topLang = getTopLanguage(buildings)
        
        // Repo name from URL
        const repoName = repoUrl?.split('/').slice(-2).join('/') || 'My Project'
        
        return {
            repoName,
            totalFiles,
            totalLoc,
            avgComplexity: avgComplexity.toFixed(1),
            districts,
            authors: authors.size,
            healthScore,
            achievements,
            topLang
        }
    }, [cityData, repoUrl])
    
    // Export as image
    const handleExport = useCallback(async () => {
        if (!cardRef.current) return
        setExporting(true)
        
        try {
            // Use html2canvas for export
            const html2canvas = (await import('html2canvas')).default
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: null,
                scale: 2, // High DPI
                logging: false,
                useCORS: true
            })
            
            // Download
            const link = document.createElement('a')
            link.download = `code-city-${stats.repoName.replace('/', '-')}-${Date.now()}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
        } catch (err) {
            console.error('Export failed:', err)
            // Fallback: just screenshot the visible card area
            window.alert('Export requires html2canvas. Install with: npm i html2canvas')
        }
        
        setExporting(false)
    }, [stats.repoName])
    
    // Copy stats to clipboard
    const handleCopy = useCallback(() => {
        const text = `🏙️ ${stats.repoName}
📦 ${stats.totalFiles.toLocaleString()} files
📝 ${stats.totalLoc.toLocaleString()} lines of code
👥 ${stats.authors} contributors
❤️ ${stats.healthScore}% code health

Generated with Code City`
        
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [stats])
    
    // Health color
    const healthColor = stats.healthScore >= 80 ? '#22c55e' :
                        stats.healthScore >= 60 ? '#eab308' :
                        stats.healthScore >= 40 ? '#f97316' : '#ef4444'
    
    return createPortal(
        <div className="share-card-overlay" onClick={onClose}>
            <div className="share-card-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="share-card-header">
                    <h2>
                        <Share2 size={20} />
                        Share Your City
                    </h2>
                    <button className="share-card-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                {/* The Card */}
                <div className="share-card-preview">
                    <div ref={cardRef} className="share-card">
                        {/* Background gradient */}
                        <div className="share-card-bg" />
                        
                        {/* City visualization placeholder */}
                        <div className="share-card-city-preview">
                            <div className="share-card-city-buildings">
                                {/* Stylized building silhouettes */}
                                {Array.from({ length: 20 }, (_, i) => (
                                    <div 
                                        key={i}
                                        className="share-card-building"
                                        style={{
                                            '--height': `${20 + Math.random() * 60}%`,
                                            '--delay': `${i * 0.1}s`,
                                            '--hue': 180 + Math.random() * 40
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="share-card-ground" />
                        </div>
                        
                        {/* Title */}
                        <div className="share-card-title">
                            <Code2 size={24} />
                            <span>{stats.repoName}</span>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="share-card-stats">
                            <div className="share-stat">
                                <FileCode size={18} />
                                <span className="share-stat-value">{stats.totalFiles.toLocaleString()}</span>
                                <span className="share-stat-label">Files</span>
                            </div>
                            <div className="share-stat">
                                <Layers size={18} />
                                <span className="share-stat-value">{stats.totalLoc >= 1000 ? `${(stats.totalLoc / 1000).toFixed(1)}K` : stats.totalLoc}</span>
                                <span className="share-stat-label">Lines</span>
                            </div>
                            <div className="share-stat">
                                <Users size={18} />
                                <span className="share-stat-value">{stats.authors}</span>
                                <span className="share-stat-label">Authors</span>
                            </div>
                            <div className="share-stat">
                                <Activity size={18} style={{ color: healthColor }} />
                                <span className="share-stat-value" style={{ color: healthColor }}>{stats.healthScore}%</span>
                                <span className="share-stat-label">Health</span>
                            </div>
                        </div>
                        
                        {/* Achievements */}
                        {stats.achievements.length > 0 && (
                            <div className="share-card-achievements">
                                {stats.achievements.map(a => (
                                    <div key={a.id} className="share-achievement" title={a.desc}>
                                        <span className="share-achievement-icon">{a.icon}</span>
                                        <span className="share-achievement-name">{a.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Footer */}
                        <div className="share-card-footer">
                            <div className="share-card-meta">
                                <span>{stats.districts} Districts</span>
                                <span>•</span>
                                <span>Top: {stats.topLang}</span>
                                <span>•</span>
                                <span>Complexity: {stats.avgComplexity}</span>
                            </div>
                            <div className="share-card-branding">
                                <Zap size={14} />
                                <span>Code City</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="share-card-actions">
                    <button 
                        className="share-action-btn share-action-secondary"
                        onClick={handleCopy}
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy Stats'}
                    </button>
                    <button 
                        className="share-action-btn share-action-primary"
                        onClick={handleExport}
                        disabled={exporting}
                    >
                        <Download size={18} />
                        {exporting ? 'Exporting...' : 'Download PNG'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
