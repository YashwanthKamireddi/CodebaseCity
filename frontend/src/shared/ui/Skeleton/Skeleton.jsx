import React from 'react'
import './Skeleton.css'

/**
 * Skeleton Loading Component
 *
 * Professional shimmer loading placeholders for better perceived performance.
 * Follows Material Design and Apple HIG loading patterns.
 */
export function Skeleton({
    variant = 'text',
    width,
    height,
    className = '',
    animation = 'shimmer',
    borderRadius,
    count = 1,
    gap = 8,
    ...props
}) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'text':
                return { height: height || '1em', width: width || '100%' }
            case 'heading':
                return { height: height || '1.5em', width: width || '60%' }
            case 'circle':
                return {
                    width: width || 40,
                    height: height || width || 40,
                    borderRadius: '50%'
                }
            case 'rect':
                return {
                    width: width || '100%',
                    height: height || 100,
                    borderRadius: borderRadius || 8
                }
            case 'card':
                return {
                    width: width || '100%',
                    height: height || 200,
                    borderRadius: borderRadius || 12
                }
            default:
                return { width, height }
        }
    }

    const styles = {
        ...getVariantStyles(),
        ...(borderRadius && { borderRadius })
    }

    if (count > 1) {
        return (
            <div className="skeleton-group" style={{ gap }}>
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className={`skeleton skeleton--${animation} ${className}`}
                        style={styles}
                        aria-hidden="true"
                        {...props}
                    />
                ))}
            </div>
        )
    }

    return (
        <div
            className={`skeleton skeleton--${animation} ${className}`}
            style={styles}
            aria-hidden="true"
            {...props}
        />
    )
}

/**
 * Pre-built skeleton layouts for common UI patterns
 */
export function SkeletonCard() {
    return (
        <div className="skeleton-card" aria-label="Loading...">
            <Skeleton variant="rect" height={180} />
            <div className="skeleton-card__content">
                <Skeleton variant="heading" width="75%" />
                <Skeleton variant="text" count={2} />
                <div className="skeleton-card__footer">
                    <Skeleton variant="circle" width={32} height={32} />
                    <Skeleton variant="text" width={100} />
                </div>
            </div>
        </div>
    )
}

export function SkeletonListItem() {
    return (
        <div className="skeleton-list-item" aria-label="Loading...">
            <Skeleton variant="circle" width={48} height={48} />
            <div className="skeleton-list-item__content">
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="70%" />
            </div>
        </div>
    )
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
    return (
        <div className="skeleton-table" aria-label="Loading table...">
            <div className="skeleton-table__header">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} variant="text" height="1.25em" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="skeleton-table__row">
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <Skeleton key={colIdx} variant="text" />
                    ))}
                </div>
            ))}
        </div>
    )
}

export function SkeletonBuilding() {
    return (
        <div className="skeleton-building" aria-label="Loading building...">
            <Skeleton variant="rect" height={120} borderRadius={8} />
            <div className="skeleton-building__info">
                <Skeleton variant="heading" width="60%" />
                <Skeleton variant="text" width="80%" />
                <div className="skeleton-building__stats">
                    <Skeleton variant="rect" height={40} width="30%" borderRadius={6} />
                    <Skeleton variant="rect" height={40} width="30%" borderRadius={6} />
                    <Skeleton variant="rect" height={40} width="30%" borderRadius={6} />
                </div>
            </div>
        </div>
    )
}
