import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, Trash2, Camera, X, ArrowRight } from 'lucide-react'
import { useBookmarksStore } from '../model/useBookmarksStore'
import useStore from '../../../store/useStore'

export default function BookmarksPanel() {
    const { isPanelOpen, setPanelOpen, bookmarks, addBookmark, removeBookmark, captureView } = useBookmarksStore()
    const { setCameraAction } = useStore()

    const [newBookmarkName, setNewBookmarkName] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const handleCreate = (e) => {
        e.preventDefault()
        if (!newBookmarkName.trim()) return

        const view = captureView()
        if (!view) {
            console.error("Camera capture failed")
            return
        }

        addBookmark({
            name: newBookmarkName,
            view
        })
        setNewBookmarkName('')
        setIsCreating(false)
    }

    const handleRestore = (view) => {
        // Dispatch action to camera controller
        setCameraAction({
            type: 'FLY_TO',
            target: view.target,
            position: view.position,
            timestamp: Date.now()
        })
    }

    if (!isPanelOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: '80px',
                    left: '24px',
                    width: '320px',
                    maxHeight: 'calc(100vh - 120px)',
                    background: 'var(--glass-surface)',
                    backdropFilter: 'var(--glass-backdrop)',
                    WebkitBackdropFilter: 'var(--glass-backdrop)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    fontFamily: 'var(--font-sans)'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--glass-border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}>
                            <MapPin size={16} color="white" />
                        </div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'white' }}>Bookmarks</h2>
                    </div>
                    <button
                        onClick={() => setPanelOpen(false)}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Create New Area */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                    {!isCreating ? (
                        <button
                            onClick={() => setIsCreating(true)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px dashed rgba(255,255,255,0.2)',
                                borderRadius: '12px',
                                color: 'rgba(255,255,255,0.7)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <Camera size={16} /> Capture Current View
                        </button>
                    ) : (
                        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '8px' }}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Name this view..."
                                value={newBookmarkName}
                                onChange={e => setNewBookmarkName(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    background: '#10b981',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '40px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'white'
                                }}
                            >
                                <Plus size={20} />
                            </button>
                        </form>
                    )}
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {bookmarks.length === 0 && !isCreating && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
                            <MapPin size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                            <div style={{ fontSize: '0.9rem' }}>No bookmarks yet.</div>
                            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Move camera & click capture.</div>
                        </div>
                    )}

                    {bookmarks.map(b => (
                        <BookmarkItem
                            key={b.id}
                            bookmark={b}
                            onRestore={() => handleRestore(b.view)}
                            onDelete={() => removeBookmark(b.id)}
                        />
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

function BookmarkItem({ bookmark, onRestore, onDelete }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background 0.2s',
            cursor: 'pointer'
        }}
            onClick={onRestore}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        >
            <div>
                <div style={{ fontWeight: 600, color: '#e4e4e7', fontSize: '0.95rem' }}>{bookmark.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                    {new Date(bookmark.createdAt).toLocaleDateString()}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete() }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(239, 68, 68, 0.6)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'flex'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.6)' }}
                >
                    <Trash2 size={14} />
                </button>
                <ArrowRight size={16} color="rgba(255,255,255,0.4)" />
            </div>
        </div>
    )
}
