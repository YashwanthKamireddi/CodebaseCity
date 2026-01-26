import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Activity, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react'
import { BuildingModel } from '../../../entities/building/model' // FIXED_PATH

export default function AuditStats({ buildings }) {
    const stats = useMemo(() => {
        if (!buildings.length) return null

        let totalHealth = 0
        let criticalFiles = 0
        let highChurnFiles = 0
        let totalLoc = 0

        buildings.forEach(b => {
            if (!b.metrics) return

            const health = BuildingModel.calculateHealth(b.metrics, b.decay_level)
            const status = BuildingModel.getStatus(health, b.metrics.churn)

            totalHealth += health
            totalLoc += (b.metrics.loc || 0)

            if (status === 'critical') criticalFiles++
            if (status === 'high-churn') highChurnFiles++
        })

        const avgHealth = Math.round(totalHealth / buildings.length)
        const grade = BuildingModel.getGrade(avgHealth)

        return {
            grade,
            avgHealth,
            criticalFiles,
            highChurnFiles,
            totalLoc,
            debtRatio: Math.round((criticalFiles / buildings.length) * 100)
        }
    }, [buildings])

    if (!stats) return null

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px'
        }}>
            {/* Health Grade Card */}
            <StatCard
                label="Architecture Grade"
                val={stats.grade}
                sub={`${stats.avgHealth}% Health Score`}
                icon={<ShieldCheck size={20} />}
                color={stats.grade === 'A' || stats.grade === 'B' ? '#10b981' : '#f59e0b'}
                big
            />

            {/* Critical Files */}
            <StatCard
                label="Critical Hotspots"
                val={stats.criticalFiles}
                sub="Files requiring immediate attention"
                icon={<AlertTriangle size={20} />}
                color="#ef4444"
            />

            {/* Churn Risk */}
            <StatCard
                label="High Churn Risk"
                val={stats.highChurnFiles}
                sub="Files changing frequently"
                icon={<Activity size={20} />}
                color="#fbbf24"
            />

            {/* Debt Ratio */}
            <StatCard
                label="Technical Debt Ratio"
                val={`${stats.debtRatio}%`}
                sub="Of codebase is critical"
                icon={<TrendingUp size={20} />}
                color={stats.debtRatio < 10 ? '#3b82f6' : '#d946ef'}
            />
        </div>
    )
}

function StatCard({ label, val, sub, icon, color, big = false }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-glass"
            style={{
                padding: '20px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                <div style={{
                    padding: '8px',
                    borderRadius: '50%',
                    background: `${color}20`,
                    color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {icon}
                </div>
            </div>

            <div>
                <div style={{
                    fontSize: big ? '2.5rem' : '1.8rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    lineHeight: 1,
                    marginBottom: '4px',
                    fontFamily: 'var(--font-mono)'
                }}>
                    {val}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {sub}
                </div>
            </div>

            {/* Glow Effect */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-50%',
                width: '100%',
                height: '100%',
                background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
                pointerEvents: 'none'
            }} />
        </motion.div>
    )
}
