/**
 * DependencyGraph.jsx
 *
 * Premium 2D interactive dependency graph visualization
 * Uses D3.js force simulation for layout
 * World-class UI inspired by GitHub's dependency graph
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw,
    Filter, Download, Search, Circle, ArrowRight, Layers
} from 'lucide-react'
import * as d3 from 'd3'
import useStore from '../../../store/useStore'
import './DependencyGraph.css'

export default function DependencyGraph({ isOpen, onClose }) {
    const { cityData, selectBuilding } = useStore()
    const svgRef = useRef(null)
    const containerRef = useRef(null)

    const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
    const [loading, setLoading] = useState(false)
    const [selectedNode, setSelectedNode] = useState(null)
    const [filter, setFilter] = useState('all') // all, high-complexity, hotspots
    const [searchQuery, setSearchQuery] = useState('')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [zoom, setZoom] = useState(1)

    // Color scheme by language
    const languageColors = {
        python: '#3776ab',
        javascript: '#f7df1e',
        typescript: '#3178c6',
        java: '#ed8b00',
        go: '#00add8',
        rust: '#dea584',
        cpp: '#00599c',
        c: '#555555',
        unknown: '#6b7280'
    }

    // Build graph data from cityData
    useEffect(() => {
        if (!cityData?.buildings) return

        const nodes = cityData.buildings.map(b => ({
            id: b.id,
            name: b.name,
            path: b.path,
            language: b.language,
            loc: b.metrics?.loc || 0,
            complexity: b.metrics?.complexity || 1,
            isHotspot: b.is_hotspot,
            districtId: b.district_id,
            x: b.position?.x || Math.random() * 800,
            y: b.position?.z || Math.random() * 600
        }))

        const edges = cityData.roads?.map(r => ({
            source: r.source,
            target: r.target,
            weight: r.weight || 1
        })) || []

        setGraphData({ nodes, edges })
    }, [cityData])

    // Filter nodes based on current filter
    const filteredData = useMemo(() => {
        let nodes = [...graphData.nodes]

        if (filter === 'high-complexity') {
            nodes = nodes.filter(n => n.complexity > 10)
        } else if (filter === 'hotspots') {
            nodes = nodes.filter(n => n.isHotspot)
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            nodes = nodes.filter(n =>
                n.name.toLowerCase().includes(query) ||
                n.path.toLowerCase().includes(query)
            )
        }

        const nodeIds = new Set(nodes.map(n => n.id))
        const edges = graphData.edges.filter(e =>
            nodeIds.has(e.source) && nodeIds.has(e.target)
        )

        return { nodes, edges }
    }, [graphData, filter, searchQuery])

    // D3 Force Simulation
    useEffect(() => {
        if (!svgRef.current || !isOpen || filteredData.nodes.length === 0) return

        const svg = d3.select(svgRef.current)
        const container = containerRef.current
        const width = container?.clientWidth || 800
        const height = container?.clientHeight || 600

        svg.selectAll('*').remove()

        // Create main group for zoom/pan
        const g = svg.append('g')

        // Zoom behavior
        const zoomBehavior = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform)
                setZoom(event.transform.k)
            })

        svg.call(zoomBehavior)

        // Create simulation
        const simulation = d3.forceSimulation(filteredData.nodes)
            .force('link', d3.forceLink(filteredData.edges)
                .id(d => d.id)
                .distance(100)
                .strength(0.5))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.complexity * 10) + 20))

        // Draw edges
        const links = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(filteredData.edges)
            .join('line')
            .attr('stroke', 'rgba(100, 150, 200, 0.3)')
            .attr('stroke-width', d => Math.max(1, d.weight))
            .attr('stroke-linecap', 'round')

        // Draw nodes
        const nodes = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(filteredData.nodes)
            .join('g')
            .attr('class', 'node')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart()
                    d.fx = d.x
                    d.fy = d.y
                })
                .on('drag', (event, d) => {
                    d.fx = event.x
                    d.fy = event.y
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0)
                    d.fx = null
                    d.fy = null
                }))

        // Node circles
        nodes.append('circle')
            .attr('r', d => Math.max(8, Math.sqrt(d.complexity * 10)))
            .attr('fill', d => languageColors[d.language] || languageColors.unknown)
            .attr('stroke', d => d.isHotspot ? '#ef4444' : 'rgba(255,255,255,0.2)')
            .attr('stroke-width', d => d.isHotspot ? 3 : 1)
            .style('filter', d => d.isHotspot ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))' : 'none')

        // Node labels
        nodes.append('text')
            .text(d => d.name.length > 15 ? d.name.slice(0, 15) + '...' : d.name)
            .attr('x', 0)
            .attr('y', d => Math.max(8, Math.sqrt(d.complexity * 10)) + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgba(255,255,255,0.7)')
            .attr('font-size', '10px')
            .attr('font-family', 'var(--font-mono)')

        // Click handler
        nodes.on('click', (event, d) => {
            event.stopPropagation()
            setSelectedNode(d)
            // Find the building and select it in the 3D view
            const building = cityData?.buildings?.find(b => b.id === d.id)
            if (building) {
                selectBuilding(building)
            }
        })

        // Hover effects
        nodes
            .on('mouseenter', function (event, d) {
                d3.select(this).select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d => Math.max(10, Math.sqrt(d.complexity * 10) + 4))

                // Highlight connected edges
                links
                    .attr('stroke', e =>
                        e.source.id === d.id || e.target.id === d.id
                            ? '#3b82f6'
                            : 'rgba(100, 150, 200, 0.15)')
                    .attr('stroke-width', e =>
                        e.source.id === d.id || e.target.id === d.id
                            ? 2
                            : 1)
            })
            .on('mouseleave', function (event, d) {
                d3.select(this).select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d => Math.max(8, Math.sqrt(d.complexity * 10)))

                links
                    .attr('stroke', 'rgba(100, 150, 200, 0.3)')
                    .attr('stroke-width', d => Math.max(1, d.weight))
            })

        // Update positions on tick
        simulation.on('tick', () => {
            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y)

            nodes.attr('transform', d => `translate(${d.x},${d.y})`)
        })

        // Cleanup
        return () => simulation.stop()

    }, [filteredData, isOpen, cityData])

    // Handle zoom controls
    const handleZoom = useCallback((direction) => {
        const svg = d3.select(svgRef.current)
        const zoomBehavior = d3.zoom().scaleExtent([0.1, 4])

        if (direction === 'in') {
            svg.transition().call(zoomBehavior.scaleBy, 1.3)
        } else if (direction === 'out') {
            svg.transition().call(zoomBehavior.scaleBy, 0.7)
        } else if (direction === 'reset') {
            svg.transition().call(zoomBehavior.transform, d3.zoomIdentity)
        }
    }, [])

    // Export as SVG
    const handleExport = useCallback(() => {
        if (!svgRef.current) return

        const svgData = new XMLSerializer().serializeToString(svgRef.current)
        const blob = new Blob([svgData], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `${cityData?.name || 'dependency-graph'}.svg`
        a.click()

        URL.revokeObjectURL(url)
    }, [cityData])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                className={`dependency-graph-overlay ${isFullscreen ? 'fullscreen' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="dependency-graph-container"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Header */}
                    <div className="dg-header">
                        <div className="dg-title">
                            <Layers size={20} />
                            <h2>Dependency Graph</h2>
                            <span className="dg-stats">
                                {filteredData.nodes.length} nodes · {filteredData.edges.length} edges
                            </span>
                        </div>

                        <div className="dg-actions">
                            {/* Search */}
                            <div className="dg-search">
                                <Search size={14} />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Filter */}
                            <select
                                className="dg-filter"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            >
                                <option value="all">All Files</option>
                                <option value="high-complexity">High Complexity</option>
                                <option value="hotspots">Hotspots Only</option>
                            </select>

                            {/* Zoom Controls */}
                            <div className="dg-zoom-controls">
                                <button onClick={() => handleZoom('out')} title="Zoom Out">
                                    <ZoomOut size={16} />
                                </button>
                                <span className="dg-zoom-level">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => handleZoom('in')} title="Zoom In">
                                    <ZoomIn size={16} />
                                </button>
                                <button onClick={() => handleZoom('reset')} title="Reset">
                                    <RotateCcw size={16} />
                                </button>
                            </div>

                            {/* Export */}
                            <button className="dg-btn" onClick={handleExport} title="Export SVG">
                                <Download size={16} />
                            </button>

                            {/* Fullscreen */}
                            <button
                                className="dg-btn"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            >
                                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>

                            {/* Close */}
                            <button className="dg-btn dg-close" onClick={onClose}>
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Graph Container */}
                    <div className="dg-graph" ref={containerRef}>
                        <svg ref={svgRef} width="100%" height="100%" />

                        {/* Legend */}
                        <div className="dg-legend">
                            <h4>Languages</h4>
                            {Object.entries(languageColors).slice(0, 6).map(([lang, color]) => (
                                <div key={lang} className="dg-legend-item">
                                    <Circle size={10} fill={color} stroke="none" />
                                    <span>{lang}</span>
                                </div>
                            ))}
                            <div className="dg-legend-item dg-legend-hotspot">
                                <Circle size={10} fill="#ef4444" stroke="#ef4444" />
                                <span>Hotspot</span>
                            </div>
                        </div>
                    </div>

                    {/* Selected Node Details */}
                    {selectedNode && (
                        <motion.div
                            className="dg-details"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                        >
                            <div className="dg-details-header">
                                <h3>{selectedNode.name}</h3>
                                <button onClick={() => setSelectedNode(null)}>
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="dg-details-content">
                                <div className="dg-detail-row">
                                    <span>Path</span>
                                    <code>{selectedNode.path}</code>
                                </div>
                                <div className="dg-detail-row">
                                    <span>Language</span>
                                    <span style={{ color: languageColors[selectedNode.language] }}>
                                        {selectedNode.language}
                                    </span>
                                </div>
                                <div className="dg-detail-row">
                                    <span>Cyclomatic Cost</span>
                                    <span className={selectedNode.complexity > 15 ? 'warning' : ''}>
                                        {selectedNode.complexity}
                                    </span>
                                </div>
                                {selectedNode.isHotspot && (
                                    <div className="dg-hotspot-badge">⚠️ Hotspot File</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
