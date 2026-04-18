/**
 * ExportReport.jsx
 *
 * Premium export report modal
 * Generate and download analysis reports in multiple formats
 */

import { useState, useCallback } from 'react'

import {
    X, Download, FileText, FileCode, Globe, Loader2,
    CheckCircle2, BarChart3, GitBranch, AlertTriangle
} from 'lucide-react'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'
import './ExportReport.css'

export default function ExportReport({ isOpen, onClose }) {
    const cityData = useStore(s => s.cityData)

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

    // Client-side export (works without backend)
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
        <div
                className="export-overlay anim-fade-in"
                onClick={onClose}
            >
                <div
                    className="export-modal anim-scale-in"
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
                                    <span><BarChart3 size={14} /> {cityData.metrics?.total_files || cityData.buildings?.length || 0} files</span>
                                    <span><GitBranch size={14} /> {cityData.roads?.length || 0} deps</span>
                                    <span><AlertTriangle size={14} /> {cityData.buildings?.filter(b => b.is_hotspot)?.length || 0} hotspots</span>
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
                </div>
            </div>
    )
}

// Helper: Infer folder/district purpose for Knowledge Retrieval
function inferPurpose(name, files) {
    if (!name) return 'General Purpose Module'
    const n = name.toLowerCase()
    if (n.includes('test') || n.includes('spec') || n.includes('__test__')) return 'Testing and Quality Assurance. Contains tests to verify stability.'
    if (n.includes('ui') || n.includes('components') || n.includes('views') || n.includes('pages')) return 'User Interface and Frontend View Layer. Responsible for rendering state.'
    if (n.includes('api') || n.includes('services') || n.includes('network') || n.includes('fetch')) return 'External Communication and API Services. Handles network requests.'
    if (n.includes('model') || n.includes('db') || n.includes('schema')) return 'Data Models and Database Schema. Defines core data constraints.'
    if (n.includes('utils') || n.includes('helpers') || n.includes('common')) return 'Shared Utilities. Contains reusable, stateless functions.'
    if (n.includes('store') || n.includes('state') || n.includes('reducers') || n.includes('slice')) return 'Global State Management. Centralizes business logic.'
    if (n.includes('config') || n.includes('setup')) return 'Configuration and Initialization. Bootstraps the application.'
    if (n.includes('worker') || n.includes('engine') || n.includes('core')) return 'Core Engine. Handles heavy computation or central orchestration.'
    if (n.includes('auth') || n.includes('security')) return 'Authentication and Security. Manages sessions and permissions.'
    return 'General Core Logic / Domain Module.'
}

// Helper: Generate Markdown report for Universal Knowledge Retrieval (Obsidian Ready)
function generateMarkdown(city) {
    const hotspots = city.buildings?.filter(b => b.is_hotspot) || []
    const sortedBuildings = [...(city.buildings || [])].sort((a, b) => (b.complexity || 0) - (a.complexity || 0))

    // Build reverse-lookup for files to districts
    const fileToDistrict = {}
    city.districts?.forEach(d => {
        d.buildings?.forEach(bid => { fileToDistrict[bid] = d.name })
    })

    return `# 🧠 Codebase Knowledge Retrieval: ${city.name}

> **Generated by Codebase City on ${new Date().toLocaleDateString()}**
> This document provides a highly detailed structural understanding of the repository for LLM context, RAG orchestration, and Obsidian graph traversal.

## 📊 1. Repository Ontology & Global Metrics

| Metric | Value | Interpretation |
|--------|-------|----------------|
| **Total Files** | ${city.metrics?.total_files || city.buildings?.length || 0} | Overall scale of the codebase. |
| **Lines of Code** | ${(city.metrics?.total_lines || 0).toLocaleString()} | Development effort and physical footprint. |
| **Districts** | ${city.districts?.length || 0} | Micro-architectural domains detected via semantic grouping. |
| **Edges (Dependencies)** | ${city.roads?.length || 0} | Internal interconnectivity and coupling between modules. |
| **Hotspots** | ${city.buildings?.filter(b => b.is_hotspot)?.length || 0} | High-risk areas requiring technical debt management. |

---

## 🗺️ 2. Architectural Districts (Domain Breakdown)

*The repository is divided into logical neighborhoods based on deep dependency graph analysis. Each district represents a cohesive sub-system.*

${city.districts?.map(d => `### District: [[${d.name || 'Root'}]]
- **Inferred Role:** ${inferPurpose(d.name, d.buildings)}
- **Size:** ${d.building_count} files
- **Primary Domain:** Integrates localized logic to serve a specific architectural purpose.
`).join('\n') || 'No districts found.'}

---

## 💠 3. File Context & Knowledge Graph (Detailed)

*Detailed telemetry for the files. Use this for RAG routing and function traversal.*

${sortedBuildings.map(b => `### File: \`${b.path}\`
- **Language:** ${b.language}
- **District / Domain:** [[${fileToDistrict[b.id] || b.directory || 'Unknown'}]]
- **Complexity Score:** ${b.metrics?.complexity || b.complexity || 0}
- **Lines of Code:** ${b.metrics?.loc || b.lines_of_code || 0}
- **Coupling (In-Degree):** ${b.in_degree || b.metrics?.dependencies_in || 0} files depend on this.
${b.functions && b.functions.length > 0 ? `- **Key Functions:** ${b.functions.join(', ')}` : ''}
${b.classes && b.classes.length > 0 ? `- **Classes Defined:** ${b.classes.join(', ')}` : ''}
${b.imports && b.imports.length > 0 ? `- **Imports:** ${b.imports.map(i => `\`${i}\``).join(', ')}` : ''}
`).join('\n\n')}

---

## ⚠️ 4. Debt & Complexity Hotspots

*Files demanding immediate architectural attention.*

${hotspots.length > 0 ? hotspots.map(h => `- **[[${h.name}]]** (\`${h.path}\`) - Complexity: ${h.metrics?.complexity}, Churn: ${h.metrics?.churn || 0}`).join('\n') : '*No extreme hotspots detected. System is currently stable.*'}
`
}

// Helper: Escape HTML to prevent XSS in exported reports
function escapeHtml(str) {
    if (!str) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
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
    <title>Codebase City Report: ${city.name}</title>
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
        <h1>🏙️ ${escapeHtml(city.name)}</h1>

        <div class="stats">
            <div class="stat">
                <div class="stat-value">${city.metrics?.total_files || city.buildings?.length || 0}</div>
                <div class="stat-label">Files</div>
            </div>
            <div class="stat">
                <div class="stat-value">${(city.metrics?.total_lines || 0).toLocaleString()}</div>
                <div class="stat-label">Lines of Code</div>
            </div>
            <div class="stat">
                <div class="stat-value">${city.districts?.length || 0}</div>
                <div class="stat-label">Districts</div>
            </div>
            <div class="stat">
                <div class="stat-value">${city.roads?.length || 0}</div>
                <div class="stat-label">Dependencies</div>
            </div>
            <div class="stat">
                <div class="stat-value">${city.buildings?.filter(b => b.is_hotspot)?.length || 0}</div>
                <div class="stat-label">Hotspots</div>
            </div>
        </div>

        <h2>Districts</h2>
        ${city.districts?.map(d => `
        <div class="district" style="border-color: ${d.color}">
            <div class="district-name">${escapeHtml(d.name)}</div>
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
                    <td><code>${escapeHtml(b.path)}</code></td>
                    <td><span class="badge ${b.metrics?.complexity > 20 ? 'badge-danger' : b.metrics?.complexity > 10 ? 'badge-warning' : 'badge-success'}">${b.metrics?.complexity || 0}</span></td>
                    <td>${b.metrics?.loc || 0}</td>
                    <td>${escapeHtml(b.language)}</td>
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
                    <td><code>${escapeHtml(h.path)}</code></td>
                    <td>${h.metrics?.complexity || 0}</td>
                    <td>${h.metrics?.churn || 0}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        <div class="footer">
            Generated by Codebase City • ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
    </div>
</body>
</html>`
}
