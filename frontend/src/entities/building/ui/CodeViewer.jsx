import React, { useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Copy, FileCode2, Check } from 'lucide-react'
import useStore from '../../../store/useStore'

/* ── Lightweight syntax highlighting ─────────────────────────────────── */

const T = { KW: 'kw', STR: 'st', CMT: 'cm', NUM: 'nm', FN: 'fn', TYPE: 'ty', OP: 'op', PLAIN: '' }

const COLORS = {
    [T.KW]:   '#c678dd',  // purple  — keywords
    [T.STR]:  '#98c379',  // green   — strings
    [T.CMT]:  '#5c6370',  // grey    — comments (italic)
    [T.NUM]:  '#d19a66',  // orange  — numbers
    [T.FN]:   '#61afef',  // blue    — function names
    [T.TYPE]: '#e5c07b',  // gold    — types / classes
    [T.OP]:   '#56b6c2',  // cyan    — operators / punctuation
}

// Common keywords across popular languages
const KW_SET = new Set([
    'abstract','as','async','await','break','case','catch','class','const','continue',
    'debugger','default','def','del','delete','do','else','elif','enum','export',
    'extends','extern','false','final','finally','fn','for','from','func','function',
    'get','go','goto','if','impl','implements','import','in','instanceof','interface',
    'is','lambda','let','loop','match','mod','module','mut','new','nil','none','not',
    'null','of','or','override','package','pass','private','protected','pub','public',
    'raise','readonly','ref','return','self','set','static','struct','super','switch',
    'then','this','throw','trait','true','try','type','typeof','unsafe','use','using',
    'val','var','void','where','while','with','yield',
    'print','println','printf','console','require','include','define','ifdef','endif',
    'namespace','template','typename','virtual','constexpr','noexcept','nullptr',
    'String','Vec','Option','Result','Some','None','Ok','Err','Box','Rc','Arc',
])

const TYPE_RE = /^[A-Z][A-Za-z0-9_]*$/

// LRU-ish cache for tokenized lines — avoids re-tokenizing on every render/scroll
const _tokenCache = new Map()
const TOKEN_CACHE_MAX = 500
const MAX_DISPLAY_LINES = 10000

function tokenizeLine(line) {
    const cached = _tokenCache.get(line)
    if (cached) return cached

    const tokens = []
    let i = 0
    const len = line.length

    while (i < len) {
        // Whitespace
        if (line[i] === ' ' || line[i] === '\t') {
            let start = i
            while (i < len && (line[i] === ' ' || line[i] === '\t')) i++
            tokens.push({ type: T.PLAIN, text: line.slice(start, i) })
            continue
        }

        // Single-line comments
        if (line[i] === '/' && i + 1 < len && (line[i + 1] === '/' || line[i + 1] === '*')) {
            if (line[i + 1] === '/') {
                tokens.push({ type: T.CMT, text: line.slice(i) })
                return tokens
            }
            // block comment start on this line
            let end = line.indexOf('*/', i + 2)
            if (end === -1) { tokens.push({ type: T.CMT, text: line.slice(i) }); return tokens }
            tokens.push({ type: T.CMT, text: line.slice(i, end + 2) })
            i = end + 2
            continue
        }
        if (line[i] === '#' && (i === 0 || line.slice(0, i).trim() === '')) {
            // Python/Ruby/shell comment (only if at start of meaningful content)
            tokens.push({ type: T.CMT, text: line.slice(i) })
            return tokens
        }
        if (line[i] === '-' && i + 1 < len && line[i + 1] === '-') {
            // Lua/SQL/Haskell comment
            tokens.push({ type: T.CMT, text: line.slice(i) })
            return tokens
        }

        // Strings
        if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
            const q = line[i]
            let j = i + 1
            while (j < len && line[j] !== q) { if (line[j] === '\\') j++; j++ }
            if (j < len) j++ // include closing quote
            tokens.push({ type: T.STR, text: line.slice(i, j) })
            i = j
            continue
        }

        // Numbers
        if (/[0-9]/.test(line[i]) || (line[i] === '.' && i + 1 < len && /[0-9]/.test(line[i + 1]))) {
            let j = i
            if (line[j] === '0' && j + 1 < len && (line[j + 1] === 'x' || line[j + 1] === 'X' || line[j + 1] === 'b' || line[j + 1] === 'o')) j += 2
            while (j < len && /[0-9a-fA-F._]/.test(line[j])) j++
            if (j < len && /[eE]/.test(line[j])) { j++; if (j < len && /[+-]/.test(line[j])) j++; while (j < len && /[0-9]/.test(line[j])) j++ }
            // Suffix like u32, f64, i64, L, ULL
            while (j < len && /[a-zA-Z]/.test(line[j])) j++
            tokens.push({ type: T.NUM, text: line.slice(i, j) })
            i = j
            continue
        }

        // Identifiers / keywords
        if (/[a-zA-Z_$@]/.test(line[i])) {
            let j = i
            while (j < len && /[a-zA-Z0-9_$]/.test(line[j])) j++
            const word = line.slice(i, j)

            // Check if it's a function call (word followed by `(`)
            let afterSpace = j
            while (afterSpace < len && line[afterSpace] === ' ') afterSpace++
            const isCall = afterSpace < len && line[afterSpace] === '('

            if (KW_SET.has(word)) {
                tokens.push({ type: T.KW, text: word })
            } else if (isCall) {
                tokens.push({ type: T.FN, text: word })
            } else if (TYPE_RE.test(word) && !KW_SET.has(word)) {
                tokens.push({ type: T.TYPE, text: word })
            } else {
                tokens.push({ type: T.PLAIN, text: word })
            }
            i = j
            continue
        }

        // Operators / punctuation
        if (/[+\-*/%=<>!&|^~?:;,.{}()\[\]@#\\]/.test(line[i])) {
            let j = i + 1
            // Multi-char operators
            if (j < len && /[=<>&|+\->/]/.test(line[j])) j++
            if (j < len && line[j] === '=') j++
            tokens.push({ type: T.OP, text: line.slice(i, j) })
            i = j
            continue
        }

        // Anything else
        tokens.push({ type: T.PLAIN, text: line[i] })
        i++
    }

    // Store in cache (evict oldest if full)
    if (_tokenCache.size >= TOKEN_CACHE_MAX) {
        const firstKey = _tokenCache.keys().next().value
        _tokenCache.delete(firstKey)
    }
    _tokenCache.set(line, tokens)

    return tokens
}

const HighlightedLine = React.memo(({ text }) => {
    const tokens = tokenizeLine(text)
    return (
        <>
            {tokens.map((tk, i) => (
                tk.type === T.PLAIN
                    ? <span key={i}>{tk.text}</span>
                    : <span key={i} style={{
                        color: COLORS[tk.type],
                        fontStyle: tk.type === T.CMT ? 'italic' : undefined,
                    }}>{tk.text}</span>
            ))}
        </>
    )
})
HighlightedLine.displayName = 'HighlightedLine'

/* ── Loading skeleton ────────────────────────────────────────────────── */

const SKELETON_WIDTHS = [60, 80, 45, 90, 70, 55, 85, 40, 75, 65, 50, 88, 72, 58, 82]

function LoadingSkeleton() {
    return (
        <div style={{ padding: '0 24px' }}>
            {SKELETON_WIDTHS.map((w, i) => (
                <div
                    key={i}
                    style={{
                        height: '18px', marginBottom: '4px',
                        display: 'flex', alignItems: 'center', gap: '16px',
                    }}
                >
                    <div style={{
                        width: '3em', textAlign: 'right', color: 'rgba(255,255,255,0.08)',
                        fontSize: '12px', fontFamily: 'var(--font-mono)', flexShrink: 0,
                    }}>{i + 1}</div>
                    <div
                        style={{
                            width: `${w}%`, height: '10px', borderRadius: '4px',
                            background: 'rgba(255,255,255,0.08)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 50}ms`,
                        }}
                    />
                </div>
            ))}
        </div>
    )
}

/* ── Virtualized line renderer ────────────────────────────────────────── */

const LINE_HEIGHT = 20  // px per line — must match lineHeight in code body
const OVERSCAN = 20     // extra lines rendered above/below viewport

function VirtualizedCode({ lines, gutterWidth }) {
    const containerRef = useRef(null)
    const [scrollTop, setScrollTop] = useState(0)
    const [containerHeight, setContainerHeight] = useState(0)

    const handleScroll = useCallback((e) => {
        setScrollTop(e.currentTarget.scrollTop)
    }, [])

    // Measure container on mount and resize
    React.useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const measure = () => setContainerHeight(el.clientHeight)
        measure()
        const ro = new window.ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const totalHeight = lines.length * LINE_HEIGHT
    const startIdx = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN)
    const visibleCount = Math.ceil(containerHeight / LINE_HEIGHT) + OVERSCAN * 2
    const endIdx = Math.min(lines.length, startIdx + visibleCount)

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            style={{
                flex: 1, overflow: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px', lineHeight: `${LINE_HEIGHT}px`,
                background: '#0a0c10',
            }}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <table style={{
                    borderCollapse: 'collapse', width: '100%',
                    fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit',
                    position: 'absolute',
                    top: startIdx * LINE_HEIGHT,
                    left: 0, right: 0,
                }}>
                    <tbody>
                        {lines.slice(startIdx, endIdx).map((line, offset) => {
                            const i = startIdx + offset
                            return (
                                <tr key={i}>
                                    <td style={{
                                        width: `${gutterWidth + 1}em`, minWidth: `${gutterWidth + 1}em`,
                                        textAlign: 'right', paddingRight: '16px', paddingLeft: '16px',
                                        color: 'rgba(255,255,255,0.15)', userSelect: 'none',
                                        verticalAlign: 'top', whiteSpace: 'nowrap',
                                        borderRight: '1px solid rgba(255,255,255,0.04)',
                                        height: LINE_HEIGHT,
                                    }}>{i + 1}</td>
                                    <td style={{
                                        paddingLeft: '16px', paddingRight: '24px',
                                        whiteSpace: 'pre', color: '#abb2bf',
                                        height: LINE_HEIGHT,
                                    }}>
                                        <HighlightedLine text={line} />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/* ── Main CodeViewer ─────────────────────────────────────────────────── */

export default React.memo(function CodeViewer({ building, onClose }) {
    const fileContent = useStore(s => s.fileContent)
    const fetchFileContent = useStore(s => s.fetchFileContent)
    const [copied, setCopied] = React.useState(false)

    // Self-fetch: ensure content is loaded for this building (don't rely solely on BuildingPanel)
    React.useEffect(() => {
        if (!building?.path) return
        const fc = useStore.getState().fileContent
        if (!fc || fc.path !== building.path || (!fc.content && !fc.loading && !fc.error)) {
            fetchFileContent(building.path)
        }
    }, [building?.path, fetchFileContent])

    React.useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    const { lines, truncated, lineCount } = useMemo(() => {
        const content = fileContent?.content || ''
        const allLines = content.split('\n')
        const total = allLines.length
        if (total > MAX_DISPLAY_LINES) {
            return { lines: allLines.slice(0, MAX_DISPLAY_LINES), truncated: true, lineCount: total }
        }
        return { lines: allLines, truncated: false, lineCount: total }
    }, [fileContent?.content])
    const gutterWidth = Math.max(3, String(lineCount).length)

    if (!building) return null

    const handleCopy = () => {
        if (fileContent?.content) {
            navigator.clipboard.writeText(fileContent.content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleDownload = () => {
        if (!fileContent?.content) return
        const blob = new Blob([fileContent.content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = building.path.split('/').pop() || 'file.txt'
        a.click()
        URL.revokeObjectURL(url)
    }

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                zIndex: 2147483647,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '1100px',
                    height: '88vh',
                    background: '#0a0c10',
                    color: '#e4e4e7',
                    borderRadius: '16px',
                    boxShadow: '0 50px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px rgba(99,102,241,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                    {/* ── Header ── */}
                    <div style={{
                        height: '46px', flexShrink: 0,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0 16px', userSelect: 'none', position: 'relative',
                    }}>
                        {/* Traffic dots */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div onClick={onClose} title="Close (Esc)" style={{
                                width: '12px', height: '12px', borderRadius: '50%', cursor: 'pointer',
                                background: '#ff5f57', transition: 'filter 0.15s',
                            }} onMouseEnter={e => e.target.style.filter='brightness(1.3)'} onMouseLeave={e => e.target.style.filter='none'} />
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e' }} />
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840' }} />
                        </div>

                        {/* File tab */}
                        <div
                            style={{
                                position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'rgba(255,255,255,0.04)', padding: '4px 14px',
                                borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <FileCode2 size={13} style={{ opacity: 0.5 }} />
                            <span style={{
                                fontSize: '0.78rem', fontWeight: 500, fontFamily: 'var(--font-mono)',
                                letterSpacing: '0.01em', color: '#d4d4d8',
                            }}>
                                {building.path.split('/').pop()}
                            </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <HeaderButton onClick={handleDownload} label="Download">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </HeaderButton>
                            <HeaderButton onClick={handleCopy} label={copied ? 'Copied!' : 'Copy'} active={copied}>
                                {copied
                                    ? <Check size={14} />
                                    : <Copy size={14} />
                                }
                            </HeaderButton>
                        </div>
                    </div>

                    {/* ── Breadcrumb path ── */}
                    <div
                        style={{
                            padding: '6px 20px', flexShrink: 0,
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                            color: 'rgba(255,255,255,0.3)', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                    >
                        {building.path.split('/').map((seg, i, arr) => (
                            <React.Fragment key={i}>
                                <span style={{ color: i === arr.length - 1 ? 'rgba(255,255,255,0.6)' : undefined }}>{seg}</span>
                                {i < arr.length - 1 && <span style={{ margin: '0 4px', opacity: 0.4 }}>/</span>}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* ── Code body ── */}
                    {fileContent?.loading ? (
                        <div style={{
                            flex: 1, overflow: 'hidden',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '13px', lineHeight: '20px',
                            background: '#0a0c10',
                            paddingTop: '24px',
                        }}>
                            <LoadingSkeleton />
                        </div>
                    ) : fileContent?.error ? (
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '16px', padding: '40px',
                            background: '#0a0c10',
                        }}>
                            <FileCode2 size={48} style={{ opacity: 0.4 }} />
                            <div style={{ fontWeight: 600, color: '#ef4444', fontSize: '1rem' }}>
                                Unable to load source
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#71717a', textAlign: 'center', maxWidth: '360px', lineHeight: 1.6 }}>
                                Re-analyze the repository to refresh the connection, or check that the file exists in the repo.
                            </div>
                        </div>
                    ) : !fileContent?.content ? (
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '12px', color: '#3f3f46',
                            background: '#0a0c10',
                        }}>
                            <FileCode2 size={40} />
                            <div style={{ fontSize: '0.85rem' }}>No content available</div>
                        </div>
                    ) : (
                        <>
                            <VirtualizedCode lines={lines} gutterWidth={gutterWidth} />
                            {truncated && (
                                <div style={{
                                    padding: '8px 16px', textAlign: 'center',
                                    fontSize: '0.75rem', color: '#f59e0b',
                                    background: 'rgba(245,158,11,0.06)',
                                    borderTop: '1px solid rgba(245,158,11,0.12)',
                                }}>
                                    Showing first {MAX_DISPLAY_LINES.toLocaleString()} of {lineCount.toLocaleString()} lines
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Footer ── */}
                    <div
                        style={{
                            height: '30px', flexShrink: 0,
                            background: 'rgba(255,255,255,0.02)',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0 16px', fontSize: '0.7rem',
                            fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.35)',
                            letterSpacing: '0.04em',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <span style={{
                                background: 'rgba(255,255,255,0.05)', padding: '1px 8px',
                                borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600,
                            }}>{building.language || 'Text'}</span>
                            {lineCount > 0 && <span>{lineCount} lines</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <span>Complexity: {building.metrics?.complexity || 1}</span>
                            <span>UTF-8</span>
                        </div>
                    </div>
                </div>
            </div>,
        document.body
    )
})

/* ── Header button sub-component ─────────────────────────────────────── */

function HeaderButton({ onClick, label, active, children }) {
    return (
        <button
            onClick={onClick}
            title={label}
            style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.4)',
                border: '1px solid transparent',
                padding: '5px 10px', borderRadius: '6px',
                fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s', outline: 'none',
                fontFamily: 'var(--font-mono)',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = '#d4d4d8'
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = active ? 'rgba(255,255,255,0.1)' : 'transparent'
                e.currentTarget.style.color = active ? '#ffffff' : 'rgba(255,255,255,0.4)'
            }}
        >
            {children}
            <span>{label}</span>
        </button>
    )
}
