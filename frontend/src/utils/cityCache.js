/**
 * cityCache — IndexedDB-backed persistence for analyzed city data.
 *
 * Cache key  : stable repo path  (e.g. "github:owner/repo")
 * TTL        : 24 hours
 * Failure    : all errors are swallowed — the cache is best-effort only.
 */
import { openDB } from 'idb'

const DB_NAME = 'code-city'
const STORE   = 'cities'
const VERSION = 1
const TTL     = 24 * 60 * 60 * 1000 // 24 hours in ms

let _dbPromise = null

function getDB() {
    if (!_dbPromise) {
        _dbPromise = openDB(DB_NAME, VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'id' })
                }
            },
        })
    }
    return _dbPromise
}

/**
 * Return cached cityData for the given key, or null if expired / not found.
 */
export async function getCachedCity(id) {
    try {
        const db = await getDB()
        const entry = await db.get(STORE, id)
        if (!entry) return null
        if (Date.now() - entry.savedAt > TTL) {
            db.delete(STORE, id).catch(() => {})
            return null
        }
        return entry.data
    } catch {
        return null
    }
}

/**
 * Persist cityData under key.  Non-blocking — caller does not need to await.
 */
export async function cacheCity(id, data) {
    try {
        const db = await getDB()
        await db.put(STORE, { id, data, savedAt: Date.now() })
    } catch {
        // Non-critical — silently fail on quota errors or private browsing
    }
}

/**
 * Remove a single entry (e.g. after a forced re-analysis).
 */
export async function invalidateCachedCity(id) {
    try {
        const db = await getDB()
        await db.delete(STORE, id)
    } catch {
        // ignore
    }
}
