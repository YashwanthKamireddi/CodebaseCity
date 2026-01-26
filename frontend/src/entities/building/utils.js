// Pattern detection based on CodeCity paper metrics
export function detectPattern(building) {
    const metrics = building.metrics || {}
    const loc = metrics.loc || 0
    const complexity = metrics.complexity || 0
    const methods = metrics.methods || metrics.complexity || 0  // Use complexity as proxy for methods
    const attributes = metrics.dependencies_in || 0  // Use dependencies as proxy for attributes

    // God Class: Too many methods and attributes
    if ((loc > 400 && complexity > 20) || building.is_hotspot) {
        return { type: 'god_class', label: 'God Class', color: '#ef4444', severity: 'critical' }
    }

    // Data Class: Many attributes, few methods
    if (attributes > 10 && methods < 3) {
        return { type: 'data_class', label: 'Data Class', color: '#f59e0b', severity: 'warning' }
    }

    // Lazy Class: Almost no functionality
    if (loc < 50 && methods < 3 && !building.is_hotspot) {
        return { type: 'lazy_class', label: 'Lazy Class', color: '#6b7280', severity: 'info' }
    }

    // Brain Class: High complexity
    if (complexity > 25) {
        return { type: 'brain_class', label: 'Brain Class', color: '#8b5cf6', severity: 'warning' }
    }

    // Blob: Very large file
    if (loc > 800) {
        return { type: 'blob', label: 'Blob', color: '#dc2626', severity: 'critical' }
    }

    return null
}
