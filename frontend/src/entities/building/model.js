/**
 * Building Domain Model
 * Centralizes all business logic for Code Buildings.
 * strictly pure functions. No UI dependencies.
 */

export const BuildingModel = {
    /**
     * Calculate Health Score (0-100)
     * @param {Object} metrics - { complexity, loc, churn, age_days }
     * @param {number} decay - decay level (0-1)
     */
    calculateHealth: (metrics, decay = 0) => {
        if (!metrics) return 100

        const { complexity = 0, dependencies_in = 0 } = metrics
        let health = 100

        // Architectural Risk Penalties (ARM)
        health -= Math.min(40, complexity * 2.0)           // Severe Complexity penalty
        health -= Math.min(25, decay * 30)                 // Age/Decay penalty
        health -= Math.min(25, dependencies_in * 3.0)      // Coupling / Blast Radius penalty

        return Math.max(0, Math.round(health))
    },

    /**
     * Get Grade (A-F) based on health
     */
    getGrade: (health) => {
        if (health >= 90) return 'A'
        if (health >= 80) return 'B'
        if (health >= 60) return 'C'
        if (health >= 40) return 'D'
        return 'F'
    },

    /**
     * Get Status Status (Critical, Warning, Stable)
     */
    getStatus: (health, churn = 0) => {
        if (health < 50) return 'critical'
        if (churn > 15) return 'high-churn'
        if (health < 75) return 'warning'
        return 'stable'
    },

    /**
     * Format a compact metric display
     */
    formatMetric: (value, type) => {
        if (value === undefined || value === null) return '-'

        switch(type) {
            case 'loc':
                return value.toLocaleString()
            case 'age':
                return `${Math.round(value)}d`
            default:
                return value.toString()
        }
    }
}
