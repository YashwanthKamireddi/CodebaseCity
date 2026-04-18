import React, { useCallback, useState, useRef, useEffect } from 'react'
import useStore from '../../store/useStore'
import { Download, Copy, X, Check, Loader2 } from 'lucide-react'

/**
 * ShareCardGenerator - Generates beautiful, downloadable image cards
 * showing the city visualization with stats overlay.
 * Card dimensions: 1200x630px (optimized for social sharing)
 */
export default function ShareCardGenerator({ onClose }) {
  const cityData = useStore((s) => s.cityData)
  const previewRef = useRef(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  // Generate preview on mount
  useEffect(() => {
    generateCard().then(setPreviewUrl)
  }, [])

  /**
   * Captures Three.js canvas and generates the share card
   */
  const generateCard = useCallback(async () => {
    // 1. Get Three.js canvas screenshot
    const threeCanvas = document.querySelector('canvas')
    if (!threeCanvas) {
      console.warn('No Three.js canvas found')
    }

    // 2. Create card canvas (1200x630 for social sharing)
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    const ctx = canvas.getContext('2d')

    // 3. Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 630)
    gradient.addColorStop(0, '#0a0a12')
    gradient.addColorStop(0.5, '#080810')
    gradient.addColorStop(1, '#050508')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1200, 630)

    // Add subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
    ctx.lineWidth = 1
    for (let x = 0; x < 1200; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 630)
      ctx.stroke()
    }
    for (let y = 0; y < 630; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(1200, y)
      ctx.stroke()
    }

    // 4. Draw city screenshot with rounded corners
    if (threeCanvas) {
      const screenshotX = 40
      const screenshotY = 75
      const screenshotWidth = 1120
      const screenshotHeight = 360
      const borderRadius = 12

      // Save context for clipping
      ctx.save()

      // Create rounded rectangle path
      ctx.beginPath()
      ctx.roundRect(screenshotX, screenshotY, screenshotWidth, screenshotHeight, borderRadius)
      ctx.clip()

      // Draw the Three.js canvas
      ctx.drawImage(threeCanvas, screenshotX, screenshotY, screenshotWidth, screenshotHeight)

      // Restore context
      ctx.restore()

      // Draw border around screenshot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(screenshotX, screenshotY, screenshotWidth, screenshotHeight, borderRadius)
      ctx.stroke()

      // Add subtle vignette overlay on screenshot
      const vignette = ctx.createRadialGradient(
        screenshotX + screenshotWidth / 2,
        screenshotY + screenshotHeight / 2,
        screenshotWidth * 0.3,
        screenshotX + screenshotWidth / 2,
        screenshotY + screenshotHeight / 2,
        screenshotWidth * 0.7
      )
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(screenshotX, screenshotY, screenshotWidth, screenshotHeight, borderRadius)
      ctx.clip()
      ctx.fillStyle = vignette
      ctx.fillRect(screenshotX, screenshotY, screenshotWidth, screenshotHeight)
      ctx.restore()
    }

    // 5. Draw header - Title and logo area
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px Inter, -apple-system, sans-serif'
    ctx.fillText('CODEBASE CITY', 40, 50)

    // Draw logo icon (simplified city icon)
    drawCityLogo(ctx, 1120, 28, 32)

    // 6. Draw stats cards
    const stats = [
      { icon: '📁', value: cityData?.buildings?.length || 0, label: 'Files' },
      { icon: '🏘️', value: cityData?.stats?.total_districts || cityData?.districts?.length || 0, label: 'Districts' },
      { icon: '⚡', value: calculateHealthScore(cityData), label: 'Health' },
      { icon: '🔗', value: calculateDependencies(cityData), label: 'Deps' },
    ]

    const statBoxWidth = 260
    const statBoxHeight = 60
    const statStartX = 40
    const statStartY = 455
    const statGap = 20

    stats.forEach((stat, index) => {
      const x = statStartX + (statBoxWidth + statGap) * index
      const y = statStartY

      // Draw stat box background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.beginPath()
      ctx.roundRect(x, y, statBoxWidth, statBoxHeight, 8)
      ctx.fill()

      // Draw stat box border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x, y, statBoxWidth, statBoxHeight, 8)
      ctx.stroke()

      // Draw icon
      ctx.font = '24px Apple Color Emoji, Segoe UI Emoji, sans-serif'
      ctx.fillText(stat.icon, x + 16, y + 40)

      // Draw value
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 22px Inter, -apple-system, sans-serif'
      ctx.fillText(formatNumber(stat.value), x + 56, y + 28)

      // Draw label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.font = '14px Inter, -apple-system, sans-serif'
      ctx.fillText(stat.label, x + 56, y + 48)
    })

    // 7. Draw footer
    const footerY = 540

    // Repository name and date
    const repoName = cityData?.name || 'Repository'
    const currentDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '16px Inter, -apple-system, sans-serif'
    ctx.fillText(`${repoName} • Analyzed ${currentDate}`, 40, footerY)

    // Separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(40, footerY + 20)
    ctx.lineTo(1160, footerY + 20)
    ctx.stroke()

    // Branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.font = '14px Inter, -apple-system, sans-serif'
    ctx.fillText('codebasecity.vercel.app', 40, footerY + 50)

    // Draw accent glow at bottom
    const bottomGlow = ctx.createLinearGradient(0, 600, 0, 630)
    bottomGlow.addColorStop(0, 'rgba(99, 102, 241, 0)')
    bottomGlow.addColorStop(1, 'rgba(99, 102, 241, 0.1)')
    ctx.fillStyle = bottomGlow
    ctx.fillRect(0, 600, 1200, 30)

    return canvas.toDataURL('image/png')
  }, [cityData])

  /**
   * Download the generated card as PNG
   */
  const handleDownload = async () => {
    setGenerating(true)
    try {
      const dataUrl = await generateCard()
      const link = document.createElement('a')
      const fileName = `codebase-city-${sanitizeFilename(cityData?.name || 'export')}.png`
      link.download = fileName
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to generate card:', error)
    } finally {
      setGenerating(false)
    }
  }

  /**
   * Copy the generated card to clipboard
   */
  const handleCopy = async () => {
    setGenerating(true)
    try {
      const dataUrl = await generateCard()
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      // ClipboardItem is a browser API
      // eslint-disable-next-line no-undef
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback: try to copy as text (data URL)
      try {
        const dataUrl = await generateCard()
        await navigator.clipboard.writeText(dataUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError)
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="share-generator-overlay" onClick={onClose}>
      <div
        className="share-generator-modal glass-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="share-generator-header">
          <h3 className="share-generator-title">Share Your City</h3>
          <button
            className="share-generator-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Preview */}
        <div className="share-generator-preview" ref={previewRef}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Share card preview"
              className="share-generator-preview-image"
            />
          ) : (
            <div className="share-generator-preview-loading">
              <Loader2 size={24} className="animate-spin" />
              <span>Generating preview...</span>
            </div>
          )}
        </div>

        {/* Stats summary */}
        <div className="share-generator-stats">
          <div className="share-generator-stat">
            <span className="share-generator-stat-value">
              {cityData?.buildings?.length || 0}
            </span>
            <span className="share-generator-stat-label">Files</span>
          </div>
          <div className="share-generator-stat">
            <span className="share-generator-stat-value">
              {cityData?.stats?.total_districts || cityData?.districts?.length || 0}
            </span>
            <span className="share-generator-stat-label">Districts</span>
          </div>
          <div className="share-generator-stat">
            <span className="share-generator-stat-value">
              {calculateHealthScore(cityData)}
            </span>
            <span className="share-generator-stat-label">Health</span>
          </div>
          <div className="share-generator-stat">
            <span className="share-generator-stat-value">
              {calculateDependencies(cityData)}
            </span>
            <span className="share-generator-stat-label">Dependencies</span>
          </div>
        </div>

        {/* Actions */}
        <div className="share-generator-actions">
          <button
            onClick={handleDownload}
            disabled={generating}
            className="btn-primary share-generator-btn"
          >
            {generating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            Download PNG
          </button>
          <button
            onClick={handleCopy}
            disabled={generating}
            className="btn-secondary share-generator-btn"
          >
            {copied ? (
              <>
                <Check size={18} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>

        {/* Footer hint */}
        <p className="share-generator-hint">
          Perfect for sharing on Twitter, LinkedIn, or your README
        </p>
      </div>

      <style>{`
        .share-generator-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: var(--z-modal, 50);
          animation: fadeIn 0.2s ease-out;
        }

        .share-generator-modal {
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          padding: var(--space-6, 24px);
          border-radius: var(--radius-xl, 12px);
          animation: scaleIn 0.2s ease-out;
        }

        .share-generator-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-5, 20px);
        }

        .share-generator-title {
          font-size: var(--text-lg, 17px);
          font-weight: var(--font-semibold, 600);
          color: var(--color-text-primary, #f0f0f4);
          margin: 0;
        }

        .share-generator-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md, 6px);
          color: var(--color-text-secondary, #b0b3c5);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .share-generator-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-text-primary, #f0f0f4);
        }

        .share-generator-preview {
          width: 100%;
          aspect-ratio: 1200 / 630;
          background: rgba(0, 0, 0, 0.3);
          border-radius: var(--radius-lg, 8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          margin-bottom: var(--space-5, 20px);
        }

        .share-generator-preview-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .share-generator-preview-loading {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-3, 12px);
          color: var(--color-text-tertiary, #7a7e95);
        }

        .share-generator-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-3, 12px);
          margin-bottom: var(--space-5, 20px);
        }

        .share-generator-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-3, 12px);
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-md, 6px);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .share-generator-stat-value {
          font-size: var(--text-xl, 20px);
          font-weight: var(--font-bold, 700);
          color: var(--color-text-primary, #f0f0f4);
        }

        .share-generator-stat-label {
          font-size: var(--text-xs, 11px);
          color: var(--color-text-tertiary, #7a7e95);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: var(--space-1, 4px);
        }

        .share-generator-actions {
          display: flex;
          gap: var(--space-3, 12px);
        }

        .share-generator-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2, 8px);
          padding: var(--space-3, 12px) var(--space-4, 16px);
          border-radius: var(--radius-md, 6px);
          font-size: var(--text-sm, 13px);
          font-weight: var(--font-medium, 500);
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
        }

        .share-generator-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--color-accent, #ffffff);
          color: #000000;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--color-accent-hover, #f4f4f5);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: var(--color-text-primary, #f0f0f4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
        }

        .share-generator-hint {
          margin-top: var(--space-4, 16px);
          text-align: center;
          font-size: var(--text-xs, 11px);
          color: var(--color-text-muted, #555870);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .share-generator-modal {
            margin: var(--space-4, 16px);
            padding: var(--space-4, 16px);
          }

          .share-generator-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .share-generator-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Draw a simplified city logo icon
 */
function drawCityLogo(ctx, x, y, size) {
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'

  // Draw 3 buildings of varying heights
  const buildingWidth = size / 4
  const gap = size / 12

  // Building 1 (short)
  ctx.fillRect(x, y + size * 0.4, buildingWidth, size * 0.6)

  // Building 2 (tall, middle)
  ctx.fillRect(x + buildingWidth + gap, y, buildingWidth, size)

  // Building 3 (medium)
  ctx.fillRect(x + (buildingWidth + gap) * 2, y + size * 0.25, buildingWidth, size * 0.75)

  ctx.restore()
}

/**
 * Calculate a health score from city data (0-100)
 */
function calculateHealthScore(cityData) {
  if (!cityData?.buildings?.length) return 0

  const buildings = cityData.buildings
  let totalScore = 0
  let count = 0

  buildings.forEach((b) => {
    if (b.metrics) {
      // Lower complexity = better health
      const complexity = b.metrics.complexity || 0
      const complexityScore = Math.max(0, 100 - complexity * 2)

      // Consider decay level if available
      const decayPenalty = (b.decay_level || 0) * 10

      totalScore += Math.max(0, complexityScore - decayPenalty)
      count++
    }
  })

  return count > 0 ? Math.round(totalScore / count) : 0
}

/**
 * Calculate total dependencies from city data
 */
function calculateDependencies(cityData) {
  if (!cityData?.buildings?.length) return 0

  return cityData.buildings.reduce((total, b) => {
    return total + (b.metrics?.dependencies_in || 0) + (b.metrics?.coupling || 0)
  }, 0)
}

/**
 * Format large numbers with K/M suffix
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return String(num)
}

/**
 * Sanitize filename for download
 */
function sanitizeFilename(name) {
  return name
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}
