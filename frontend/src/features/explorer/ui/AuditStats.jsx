import { useMemo } from 'react'
import { Activity, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react'
import { BuildingModel } from '../../../entities/building/model'

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
        <div className="as-grid">
            <StatCard
                label="Architecture Grade" val={stats.grade}
                sub={`${stats.avgHealth}% Health Score`}
                icon={<ShieldCheck size={18} />}
                variant={stats.grade === 'A' || stats.grade === 'B' ? 'success' : 'warning'}
                big
            />
            <StatCard
                label="Critical Hotspots" val={stats.criticalFiles}
                sub="Files requiring attention"
                icon={<AlertTriangle size={18} />}
                variant="danger"
            />
            <StatCard
                label="High Churn Risk" val={stats.highChurnFiles}
                sub="Files changing frequently"
                icon={<Activity size={18} />}
                variant="warning"
            />
            <StatCard
                label="Technical Debt" val={`${stats.debtRatio}%`}
                sub="Of codebase is critical"
                icon={<TrendingUp size={18} />}
                variant={stats.debtRatio < 10 ? 'info' : 'danger'}
            />

            <style>{`
                .as-grid {
                    display: grid; grid-template-columns: repeat(4, 1fr);
                    gap: var(--space-4); margin-bottom: var(--space-6);
                }
                @media (max-width: 1200px) { .as-grid { grid-template-columns: repeat(2, 1fr); } }
                .as-card {
                    padding: var(--space-5); border-radius: var(--radius-xl);
                    display: flex; flex-direction: column; justify-content: space-between;
                    border: 1px solid var(--glass-border-strong); position: relative; overflow: hidden;
                    background: var(--glass-bg-elevated);
                    backdrop-filter: blur(var(--glass-blur));
                    -webkit-backdrop-filter: blur(var(--glass-blur));
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
                }
                .as-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl), 0 0 0 1px var(--color-text-secondary) inset;
                }
                .as-card-top {
                    display: flex; justify-content: space-between; align-items: flex-start;
                    margin-bottom: var(--space-4);
                }
                .as-card-label {
                    font-size: var(--text-xs); color: var(--color-text-tertiary);
                    font-weight: var(--font-medium); text-transform: uppercase;
                    letter-spacing: var(--tracking-wide);
                }
                .as-card-icon {
                    width: 36px; height: 36px; border-radius: var(--radius-lg);
                    display: flex; align-items: center; justify-content: center;
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .as-card:hover .as-card-icon { transform: scale(1.1) rotate(-5deg); }
                .as-card-icon--success { background: var(--color-success-muted); color: var(--color-success); }
                .as-card-icon--warning { background: var(--color-warning-muted); color: var(--color-warning); }
                .as-card-icon--danger  { background: var(--color-error-muted); color: var(--color-error); }
                .as-card-icon--info    { background: var(--color-info-muted); color: var(--color-info); }
                .as-card-value {
                    font-weight: var(--font-bold); color: var(--color-text-primary);
                    line-height: 1; margin-bottom: var(--space-1);
                    font-family: var(--font-display);
                }
                .as-card-value--big  { font-size: var(--text-4xl); }
                .as-card-value--std  { font-size: var(--text-3xl); }
                .as-card-sub { font-size: var(--text-xs); color: var(--color-text-muted); }
                .as-glow {
                    position: absolute; top: -50%; right: -50%;
                    width: 100%; height: 100%; pointer-events: none;
                }
                .as-glow--success { background: radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%); }
                .as-glow--warning { background: radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%); }
                .as-glow--danger  { background: radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%); }
                .as-glow--info    { background: radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%); }
                .as-card-accent {
                    position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
                }
                .as-card-accent--success { background: linear-gradient(90deg, var(--color-success), transparent); }
                .as-card-accent--warning { background: linear-gradient(90deg, var(--color-warning), transparent); }
                .as-card-accent--danger  { background: linear-gradient(90deg, var(--color-error), transparent); }
                .as-card-accent--info    { background: linear-gradient(90deg, var(--color-info), transparent); }
            `}</style>
        </div>
    )
}

function StatCard({ label, val, sub, icon, variant = 'info', big = false }) {
    return (
        <div className="as-card anim-slide-up">
            <div className="as-card-top">
                <span className="as-card-label">{label}</span>
                <div className={`as-card-icon as-card-icon--${variant}`}>{icon}</div>
            </div>
            <div>
                <div className={`as-card-value ${big ? 'as-card-value--big' : 'as-card-value--std'}`}>{val}</div>
                <div className="as-card-sub">{sub}</div>
            </div>
            <div className={`as-glow as-glow--${variant}`} />
            <div className={`as-card-accent as-card-accent--${variant}`} />
        </div>
    )
}
