/**
 * vfs.js — Front-End VFS Manager
 *
 * Exposes a clean Promise-based API so Zustand slices and React hook can talk
 * to the `vfs.worker.js` safely using zero-copy transfers.
 */

const worker = new Worker(new URL('../worker/vfs.worker.js', import.meta.url), { type: 'module' });

// We keep a message queue to resolve specific fetch requests based on file paths
const _resolvers = new Map();
const _inflight = new Map(); // Deduplicate in-flight requests
let _treeResolver = null;

// The global callback for ingestion progress (hooked into the Zustand City Slice)
export let onVfsProgress = () => {};
export function setVfsProgressCallback(fn) {
    onVfsProgress = fn;
}

worker.onmessage = (event) => {
    const { type, payload, message, current, total, tree, repoName, path, content, error, query, results } = event.data;

    if (type === 'PROGRESS') {
        // e.g. "Decompressing Zipball to OPFS" or "Written 500 / 1000 files..."
        onVfsProgress({ message, current, total });
    }
    else if (type === 'INGEST_SUCCESS') {
        if (_treeResolver) {
            _treeResolver({ tree, repoName });
            _treeResolver = null;
        }
    }
    else if (type === 'READ_SUCCESS' || type === 'READ_ERROR') {
        // Resolve ALL waiting callbacks for this path (deduplicated requests)
        const callbacks = _resolvers.get(path);
        if (callbacks) {
            const result = type === 'READ_ERROR' ? { error } : { content };
            for (const resolve of callbacks) {
                resolve(result);
            }
            _resolvers.delete(path);
            _inflight.delete(path);
        }
    }
    else if (type === 'SEARCH_SUCCESS' || type === 'SEARCH_ERROR') {
        const key = `search_${query}`;
        const callbacks = _resolvers.get(key);
        if (callbacks) {
            const result = type === 'SEARCH_ERROR' ? { error } : { results };
            for (const resolve of callbacks) {
                resolve(result);
            }
            _resolvers.delete(key);
            _inflight.delete(key);
        }
    }
    else if (type === 'CRITICAL_ERROR') {
        console.error("VFS Critical Error:", event.data);
    }
};

/**
 * Push the zipball to the VFS for ingestion over OPFS.
 * Returns the layout graph structure mappings.
 */
export function ingestZipballToVfs(arrayBuffer, repoName) {
    return new Promise((resolve) => {
        _treeResolver = resolve;

        // Zero-copy transfer: by passing [arrayBuffer] as the second argument,
        // Chrome literally moves the memory pointer rather than cloning it!
        // This is world-class micro-optimization (Transferable Objects).
        worker.postMessage({
            type: 'INGEST_ZIPBALL',
            payload: { buffer: arrayBuffer, repoName }
        }, [arrayBuffer]);
    });
}

/**
 * Returns a promise that resolves when the file text is fetched from OPFS inside the Worker.
 * Deduplicates concurrent requests for the same file.
 */
export function readFileFromVfs(repoName, path) {
    // Deduplicate in-flight requests
    if (_inflight.has(path)) {
        return _inflight.get(path);
    }

    const promise = new Promise((resolve) => {
        // Add to callbacks array (allows multiple waiters)
        const callbacks = _resolvers.get(path) || [];
        callbacks.push(resolve);
        _resolvers.set(path, callbacks);

        // Only post message if this is the first request
        if (callbacks.length === 1) {
            worker.postMessage({
                type: 'READ_FILE',
                payload: { repoName, path }
            });
        }
    });

    _inflight.set(path, promise);
    return promise;
}

/**
 * Searches the OPFS VFS directory for regex patterns.
 * Returns an array of file search results {"path": ..., "matches": [10, 11], "snippets": ["..."]}
 * Deduplicates concurrent searches for the same query.
 */
export function searchVfsEngine(repoName, query, isRegex) {
    const key = `search_${query}`;

    // Deduplicate in-flight searches
    if (_inflight.has(key)) {
        return _inflight.get(key);
    }

    const promise = new Promise((resolve) => {
        const callbacks = _resolvers.get(key) || [];
        callbacks.push(resolve);
        _resolvers.set(key, callbacks);

        if (callbacks.length === 1) {
            worker.postMessage({
                type: 'SEARCH',
                payload: { repoName, query, isRegex }
            });
        }
    });

    _inflight.set(key, promise);
    return promise;
}
