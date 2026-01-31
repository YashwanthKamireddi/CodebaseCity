/**
 * ExportReport.jsx
 *
 * Premium export report modal
 * Generate and download analysis reports in multiple formats
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Download, FileText, FileCode, Globe, Loader2,
    CheckCircle2, BarChart3, GitBranch, AlertTriangle
} from 'lucide-react'
import useStore from '../../../store/useStore'
import './ExportReport.css'

const API_BASE = '/api'

export default function ExportReport({ isOpen, onClose }) {
    const { cityData } = useStore()

    const [format, setFormat] = useState('html')
    const [exporting, setExporting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState(null)

    // Options
    const [options, setOptions] = useState({
        includeMetrics: true,
        includeGraph: true,
        includeIssues: true,
        includeHotspots: true
    })

    const formats = [
        { id: 'html', name: 'HTML Report', icon: Globe, description: 'Interactive web report' },
        { id: 'markdown', name: 'Markdown', icon: FileText, description: 'For documentation' },
        { id: 'json', name: 'JSON Data', icon: FileCode, description: 'Raw data export' }
    ]

    const handleExport = useCallback(async () => {
        if (!cityData) return

        setExporting(true)
        setError(null)

        try {
            // Generate cache key from city name
            const cacheKey = cityData.path?.replace(/[/:\\]/g, '_').replace(/^_/, '') || 'demo'

            const response = await fetch(`${API_BASE}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city_id: cacheKey,
                    format,
                    ...options
                })
            })

            if (!response.ok) {
                throw new Error('Export failed')
            }

            const data = await response.json()

            // Download the file
            let content, filename, mimeType

            if (format === 'json') {
                content = JSON.stringify(data, null, 2)
                filename = `${cityData.name || 'report'}-analysis.json`
                mimeType = 'application/json'
            } else if (format === 'markdown') {
                content = data.content
                filename = `${cityData.name || 'report'}-analysis.md`
                mimeType = 'text/markdown'
            } else {
                content = data.content
                filename = `${cityData.name || 'report'}-analysis.html`
                mimeType = 'text/html'
            }

            const blob = new Blob([content], { type: mimeType })
            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.click()

            URL.revokeObjectURL(url)

            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                onClose()
            }, 1500)

        } catch (err) {
            console.error('Export failed:', err)
            setError(err.message)
        } finally {
            setExporting(false)
        }
    }, [cityData, format, options, onClose])

    // Client-side export fallback (works without backend)
    const handleClientExport = useCallback(() => {
        if (!cityData) return

        setExporting(true)

        setTimeout(() => {
            let content, filename, mimeType

            if (format === 'json') {
                content = JSON.stringify(cityData, null, 2)
                filename = `${cityData.name || 'report'}-analysis.json`
                mimeType = 'application/json'
            } else if (format === 'markdown') {
                content = generateMarkdown(cityData)
                filename = `${cityData.name || 'report'}-analysis.md`
                mimeType = 'text/markdown'
            } else {
                content = generateHTML(cityData)
                filename = `${cityData.name || 'report'}-analysis.html`
                mimeType = 'text/html'
            }

            const blob = new Blob([content], { type: mimeType })
            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.click()

            URL.revokeObjectURL(url)

            setSuccess(true)
            setExporting(false)

            setTimeout(() => {
                setSuccess(false)
                onClose()
            }, 1500)
        }, 500)
    }, [cityData, format, onClose])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                className="export-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="export-modal"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="export-header">
                        <div className="export-title">
                            <Download size={20} />
                            <h2>Export Report</h2>
                        </div>
                        <button className="export-close" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="export-content">
                        {/* Project Info */}
                        {cityData && (
                            <div className="export-project">
                                <h3>{cityData.name}</h3>
                                <div className="export-project-stats">
                                    <span><BarChart3 size={14} /> {cityData.stats?.total_files || 0} files</span>
                                    <span><GitBranch size={14} /> {cityData.stats?.total_dependencies || 0} deps</span>
                                    <span><AlertTriangle size={14} /> {cityData.stats?.hotspots || 0} hotspots</span>
                                </div>
                            </div>
                        )}

                        {/* Format Selection */}
                        <div className="export-section">
                            <label>Export Format</label>
                            <div className="export-formats">
                                {formats.map((f) => (
                                    <button
                                        key={f.id}
                                        className={`export-format ${format === f.id ? 'active' : ''}`}
                                        onClick={() => setFormat(f.id)}
                                    >
                                        <f.icon size={20} />
                                        <div>
                                            <span className="export-format-name">{f.name}</span>
                                            <span className="export-format-desc">{f.description}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="export-section">
                            <label>Include</label>
                            <div className="export-options">
                                {Object.entries({
                                    includeMetrics: 'Code Metrics',
                                    includeGraph: 'Dependency Data',
                                    includeIssues: 'Issues & Warnings',
                                    includeHotspots: 'Hotspot Analysis'
                                }).map(([key, label]) => (
                                    <label key={key} className="export-option">
                                        <input
                                            type="checkbox"
                                            checked={options[key]}
                                            onChange={(e) => setOptions(o => ({ ...o, [key]: e.target.checked }))}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="export-error">
                                <AlertTriangle size={16} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="export-footer">
                        <button className="export-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="export-submit"
                            onClick={handleClientExport}
                            disabled={exporting || !cityData}
                        >
                            {exporting ? (
                                <>
                                    <Loader2 size={16} className="spin" />
                                    Generating...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 size={16} />
                                    Downloaded!
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Export Report
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

// Helper: Generate Markdown report
function generateMarkdown(city) {
    const hotspots = city.buildings?.filter(b => b.is_hotspot) || []
    const topComplexity = [...(city.buildings || [])].sort((a, b) =>
        (b.metrics?.complexity || 0) - (a.metrics?.complexity || 0)
    ).slice(0, 10)

    return `# 🏙️ Code City Report: ${city.name}

## Summary

| Metric | Value |
|--------|-------|
| Total Files | ${city.stats?.total_files || 0} |
| Lines of Code | ${(city.stats?.total_loc || 0).toLocaleString()} |
| Districts | ${city.stats?.total_districts || 0} |
| Dependencies | ${city.stats?.total_dependencies || 0} |
| Hotspots | ${city.stats?.hotspots || 0} |

## Districts

${city.districts?.map(d => `### ${d.name}
- **Buildings:** ${d.building_count}
- **Color:** ${d.color}
${d.description ? `- **Description:** ${d.description}` : ''}
`).join('\n') || 'No districts found.'}

## Top Files by Complexity

| File | Complexity | LOC | Language |
|------|------------|-----|----------|
${topComplexity.map(b => `| \`${b.path}\` | ${b.metrics?.complexity || 0} | ${b.metrics?.loc || 0} | ${b.language} |`).join('\n')}

## Hotspots

${hotspots.length > 0 ? hotspots.map(h => `- **${h.name}** (\`${h.path}\`) - Complexity: ${h.metrics?.complexity}, Churn: ${h.metrics?.churn}`).join('\n') : 'No hotspots detected.'}

---
*Generated by Code City on ${new Date().toLocaleDateString()}*
`
}

// Helper: Generate HTML report
function generateHTML(city) {
    const hotspots = city.buildings?.filter(b => b.is_hotspot) || []
    const topComplexity = [...(city.buildings || [])].sort((a, b) =>
        (b.metrics?.complexity || 0) - (a.metrics?.complexity || 0)
    ).slice(0, 10)

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code City Report: ${city.name}</title>
    <style>
        :root {
            --bg: #0f172a;
            --surface: #1e293b;
            --border: #334155;
            --text: #e2e8f0;
            --text-muted: #94a3b8;
            --accent: #3b82f6;
            --success: #22c55e;
            --warning: #f59e0b;
            --danger: #ef4444;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 2rem;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { color: var(--accent); margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem; }
        h2 { color: var(--text); margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
        h3 { color: var(--text-muted); margin: 1rem 0 0.5rem; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat { background: var(--surface); padding: 1.25rem; border-radius: 12px; text-align: center; border: 1px solid var(--border); }
        .stat-value { font-size: 2rem; font-weight: 700; color: var(--accent); }
        .stat-label { font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; background: var(--surface); border-radius: 12px; overflow: hidden; }
        th, td { padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
        th { background: rgba(0,0,0,0.3); font-weight: 600; color: var(--text-muted); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        tr:last-child td { border-bottom: none; }
        code { background: rgba(0,0,0,0.3); padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.875rem; font-family: 'SF Mono', Monaco, monospace; }
        .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        .badge-warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
        .badge-danger { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .badge-success { background: rgba(34, 197, 94, 0.2); color: var(--success); }
        .district { background: var(--surface); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border-left: 4px solid; }
        .district-name { font-weight: 600; margin-bottom: 0.25rem; }
        .district-meta { font-size: 0.875rem; color: var(--text-muted); }
        .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); text-align: center; color: var(--text-muted); font-size: 0.875rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏙️ ${city.name}</h1>

        <div class="stats">
            <div class="stat">
                <div class="stat-value">${city.stats?.total_files || 0}</div>
                <div class="stat-label">Files</div>
            </div>
            <div class="stat">
                <div class="stat-value">${(city.stats?.total_loc || 0).toLocaleString()}</div>
                <div class="stat-label">Lines of Code</div>
            </div>
            <div class="stat">
                <div class="stat-value">${city.stats?.total_districts || 0}</div>
                <div class="stat-label">Districts</div>
            </div>
            <div class="stat">
                <div class="stat-value">${city.stats?.total_dependencies || 0}</div>
                <div class="stat-label">Dependencies</div>
            </div>
            <div class="stat">
                <div class="stat-value">${city.stats?.hotspots || 0}</div>
                <div class="stat-label">Hotspots</div>
            </div>
        </div>

        <h2>Districts</h2>
        ${city.districts?.map(d => `
        <div class="district" style="border-color: ${d.color}">
            <div class="district-name">${d.name}</div>
            <div class="district-meta">${d.building_count} buildings</div>
        </div>
        `).join('') || '<p>No districts found.</p>'}

        <h2>Top Files by Complexity</h2>
        <table>
            <thead>
                <tr>
                    <th>File</th>
                    <th>Complexity</th>
                    <th>LOC</th>
                    <th>Language</th>
                </tr>
            </thead>
            <tbody>
                ${topComplexity.map(b => `
                <tr>
                    <td><code>${b.path}</code></td>
                    <td><span class="badge ${b.metrics?.complexity > 20 ? 'badge-danger' : b.metrics?.complexity > 10 ? 'badge-warning' : 'badge-success'}">${b.metrics?.complexity || 0}</span></td>
                    <td>${b.metrics?.loc || 0}</td>
                    <td>${b.language}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        ${hotspots.length > 0 ? `
        <h2>⚠️ Hotspots</h2>
        <table>
            <thead>
                <tr>
                    <th>File</th>
                    <th>Complexity</th>
                    <th>Churn</th>
                </tr>
            </thead>
            <tbody>
                ${hotspots.map(h => `
                <tr>
                    <td><code>${h.path}</code></td>
                    <td>${h.metrics?.complexity || 0}</td>
                    <td>${h.metrics?.churn || 0}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        <div class="footer">
            Generated by Code City • ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
    </div>
</body>
</html>`
}
