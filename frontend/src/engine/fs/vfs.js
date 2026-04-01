/**
 * vfs.js — Front-End VFS Manager
 *
 * Exposes a clean Promise-based API so Zustand slices and React hook can talk
 * to the `vfs.worker.js` safely using zero-copy transfers.
 */

const worker = new Worker(new URL('../worker/vfs.worker.js', import.meta.url), { type: 'module' });

// We keep a message queue to resolve specific fetch requests based on file paths
const _resolvers = new Map();
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
        const resolveContent = _resolvers.get(path);
        if (resolveContent) {
            if (type === 'READ_ERROR') resolveContent({ error });
            else resolveContent({ content });
            _resolvers.delete(path);
        }
    }
    else if (type === 'SEARCH_SUCCESS' || type === 'SEARCH_ERROR') {
        const resolveSearch = _resolvers.get(`search_${query}`);
        if (resolveSearch) {
            if (type === 'SEARCH_ERROR') resolveSearch({ error });
            else resolveSearch({ results });
            _resolvers.delete(`search_${query}`);
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
 */
export function readFileFromVfs(repoName, path) {
    return new Promise((resolve) => {
        _resolvers.set(path, resolve);
        worker.postMessage({
            type: 'READ_FILE',
            payload: { repoName, path }
        });
    });
}

/**
 * Searches the OPFS VFS directory for regex patterns.
 * Returns an array of file search results {"path": ..., "matches": [10, 11], "snippets": ["..."]}
 */
export function searchVfsEngine(repoName, query, isRegex) {
    return new Promise((resolve) => {
        _resolvers.set(`search_${query}`, resolve);
        worker.postMessage({
            type: 'SEARCH',
            payload: { repoName, query, isRegex }
        });
    });
}
