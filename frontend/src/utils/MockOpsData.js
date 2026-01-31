/**
 * MockOpsData.js
 *
 * Simulates external operational data for the "Operational Excellence" phase.
 * In a real app, this would fetch from AWS Cost Explorer or Snyk/NPM Audit.
 */

export const generateOpsData = (buildings) => {
    const opsData = new Map()

    buildings.forEach(b => {
        // Deterministic pseudo-random based on ID char code sum
        const seed = b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const rand = (seed % 100) / 100

        opsData.set(b.id, {
            // FinOps: Monthly Cloud Cost
            cost: rand > 0.8 ? Math.floor(rand * 5000) : Math.floor(rand * 100), // Pareto distribution: 20% of files cost 80% money

            // Security: CVE Vulnerabilities
            security: {
                hasVulnerability: rand > 0.9, // 10% infected
                severity: rand > 0.95 ? 'CRITICAL' : 'HIGH',
                cveCount: rand > 0.9 ? Math.floor(rand * 5) + 1 : 0
            }
        })
    })

    return opsData
}
