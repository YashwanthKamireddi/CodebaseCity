/**
 * fileSystemAdapter.js — Unified file access for browser-based analysis
 *
 * Strategy:
 * 1. LOCAL: File System Access API (showDirectoryPicker) — zero-server, code stays on device
 * 2. GITHUB: isomorphic-git clone into LightningFS — fully in-browser, no backend
 * 3. FALLBACK: <input webkitdirectory> for Firefox/Safari
 *
 * NOTE: isomorphic-git and LightningFS are loaded lazily via dynamic import
 * to avoid Vite CJS resolution errors at build time.
 */
import logger from '../../utils/logger'

// Skip file patterns
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist',
  'build', '.next', '.cache', 'coverage', '.idea', '.vscode',
  '.DS_Store', 'target', 'vendor', '.tox', 'egg-info',
])

const EXCLUDED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.avi', '.mov', '.mkv',
  '.zip', '.gz', '.tar', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.pyc', '.class', '.o', '.so', '.dll', '.exe',
  '.lock', '.map', '.min.js', '.min.css',
  '.wasm',
])

const MAX_FILE_SIZE = 512 * 1024 // 512KB — skip huge generated files

// CORS proxy for GitHub API requests from browser
const CORS_PROXY = 'https://cors.isomorphic-git.org'

/**
 * Check if the File System Access API is available
 */
export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Parse a GitHub URL into owner/repo format.
 * Supports: github.com/owner/repo, https://github.com/owner/repo.git, etc.
 *
 * @param {string} url - GitHub URL or owner/repo string
 * @returns {{ owner: string, repo: string, cloneUrl: string } | null}
 */
export function parseGitHubUrl(url) {
  // Strip trailing slashes and .git
  const cleaned = url.trim().replace(/\/+$/, '').replace(/\.git$/, '')

  // Match github.com/owner/repo patterns
  const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/)
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      cloneUrl: `https://github.com/${match[1]}/${match[2]}`,
    }
  }

  // Match bare owner/repo format
  const bareMatch = cleaned.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/)
  if (bareMatch) {
    return {
      owner: bareMatch[1],
      repo: bareMatch[2],
      cloneUrl: `https://github.com/${bareMatch[1]}/${bareMatch[2]}`,
    }
  }

  return null
}

/**
 * Clone a GitHub repo in-browser and read all source files.
 * Uses isomorphic-git + LightningFS (IndexedDB-backed virtual filesystem).
 *
 * @param {string} repoUrl - GitHub URL or owner/repo
 * @param {function} onProgress - (phase, current, total, detail) => void
 * @param {number} maxFiles - Maximum files to read
 * @returns {Promise<{files: Array, rootName: string}>}
 */
export async function cloneGitHubRepo(repoUrl, onProgress = null, maxFiles = 5000) {
  const parsed = parseGitHubUrl(repoUrl)
  if (!parsed) {
    throw new Error(`Invalid GitHub URL: "${repoUrl}". Use format: github.com/owner/repo`)
  }

  const { owner, repo } = parsed
  const rootName = `${owner}/${repo}`

  // ===== PRIMARY METHOD: GitHub ZIP API (fast, reliable, no CORS proxy) =====
  try {
    const { downloadAndExtractZip } = await import('./zipExtractor.js')
    const result = await downloadAndExtractZip(owner, repo, onProgress, maxFiles)
    return result
  } catch (zipErr) {
    logger.warn(`[ZIP] Failed for ${rootName}, falling back to git clone:`, zipErr.message)
    // Fall through to isomorphic-git fallback
  }

  // ===== FALLBACK: isomorphic-git clone (slower, needs CORS proxy) =====
  onProgress?.('cloning', 0, 100, `ZIP failed, trying git clone for ${rootName}...`)

  const { cloneUrl } = parsed
  const dir = `/${repo}`

  const [gitModule, httpModule, lfModule, bufferModule] = await Promise.all([
    import('isomorphic-git'),
    import('isomorphic-git/http/web'),
    import('@isomorphic-git/lightning-fs'),
    import('buffer'),
  ])
  const git = gitModule.default || gitModule
  const http = httpModule.default || httpModule
  const LightningFS = lfModule.default || lfModule

  if (typeof globalThis.Buffer === 'undefined') {
    globalThis.Buffer = bufferModule.Buffer
  }

  // Clean up old IndexedDB databases
  try {
    if (window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases()
      for (const db of dbs) {
        if (db.name && db.name.startsWith('codecity_')) {
          window.indexedDB.deleteDatabase(db.name)
        }
      }
    }
  } catch (err) {
    logger.warn('[LightningFS] Could not clear old DBs:', err)
  }

  const dbSessionName = `codecity_${owner}_${repo}_${Date.now()}`
  const fs = new LightningFS(dbSessionName)
  const pfs = fs.promises

  try {
    await pfs.mkdir(dir)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }

  try {
    await git.clone({
      fs,
      http,
      dir,
      url: cloneUrl,
      corsProxy: CORS_PROXY,
      depth: 1,
      singleBranch: true,
      onProgress: (event) => {
        const phase = event.phase || 'cloning'
        const loaded = event.loaded || 0
        const total = event.total || 100
        onProgress?.('cloning', loaded, total, `${phase}: ${Math.round((loaded / total) * 100)}%`)
      },
    })
  } catch (err) {
    try { await pfs.rmdir(dir, { recursive: true }) } catch {}
    throw new Error(`Failed to clone ${rootName}: ${err.message}`, { cause: err })
  }

  onProgress?.('reading', 0, 0, 'Reading cloned files...')

  const files = []
  await walkLightningFS(pfs, dir, '', files, maxFiles, onProgress)

  try {
    await pfs.rmdir(dir, { recursive: true })
  } catch {
    // Best-effort cleanup
  }

  return { files, rootName }
}

/**
 * Recursively walk a LightningFS directory and collect source files.
 */
async function walkLightningFS(pfs, baseDir, relativePath, results, maxFiles, onProgress) {
  if (results.length >= maxFiles) return

  const fullPath = relativePath ? `${baseDir}/${relativePath}` : baseDir
  const entries = await pfs.readdir(fullPath)

  for (const entry of entries) {
    if (results.length >= maxFiles) return

    const entryRelative = relativePath ? `${relativePath}/${entry}` : entry
    const entryFull = `${baseDir}/${entryRelative}`

    try {
      const stat = await pfs.stat(entryFull)

      if (stat.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry) || entry.startsWith('.')) continue
        await walkLightningFS(pfs, baseDir, entryRelative, results, maxFiles, onProgress)
      } else {
        const ext = '.' + entry.split('.').pop()?.toLowerCase()
        if (EXCLUDED_EXTENSIONS.has(ext)) continue
        if (entry.startsWith('.')) continue
        if (stat.size > MAX_FILE_SIZE) continue

        const content = await pfs.readFile(entryFull, { encoding: 'utf8' })
        results.push({ path: entryRelative, content })

        if (results.length % 50 === 0) {
          onProgress?.('reading', results.length, maxFiles, entryRelative)
        }
      }
    } catch {
      // Skip unreadable entries
    }
  }
}

/**
 * Read a local directory using the File System Access API.
 * Returns an array of { path, content } objects.
 *
 * @param {function} onProgress - Callback with (current, total, filePath)
 * @param {number} maxFiles - Maximum files to read (0 = unlimited)
 * @returns {Promise<{files: Array, rootName: string}>}
 */
export async function readLocalDirectory(onProgress = null, maxFiles = 5000) {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser. Use Chrome or Edge.')
  }

  const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
  const rootName = dirHandle.name

  // Phase 1: Collect file handles (fast — no I/O)
  const fileHandles = []
  await collectFileHandles(dirHandle, '', fileHandles, maxFiles)

  // Phase 2: Read file contents in batches (controlled I/O)
  const files = []
  const total = fileHandles.length
  const BATCH_SIZE = 50

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = fileHandles.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async ({ handle, path }) => {
        try {
          const file = await handle.getFile()
          if (file.size > MAX_FILE_SIZE) return null
          const content = await file.text()
          return { path, content }
        } catch {
          return null
        }
      })
    )

    for (const result of batchResults) {
      if (result) files.push(result)
    }

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, total), total, batch[batch.length - 1]?.path)
    }
  }

  return { files, rootName }
}

/**
 * Recursively collect file handles from a directory handle.
 * This is extremely fast since it only reads directory listings, not file contents.
 */
async function collectFileHandles(dirHandle, basePath, results, maxFiles) {
  if (results.length >= maxFiles) return

  for await (const [name, handle] of dirHandle.entries()) {
    if (results.length >= maxFiles) return

    if (handle.kind === 'directory') {
      if (EXCLUDED_DIRS.has(name) || name.startsWith('.')) continue
      await collectFileHandles(handle, `${basePath}${name}/`, results, maxFiles)
    } else {
      const ext = '.' + name.split('.').pop()?.toLowerCase()
      if (EXCLUDED_EXTENSIONS.has(ext)) continue
      if (name.startsWith('.')) continue

      results.push({
        handle,
        path: `${basePath}${name}`,
      })
    }
  }
}

/**
 * Fallback: Upload a directory using <input webkitdirectory>
 * Works in Firefox, Safari, and all other browsers.
 *
 * @returns {Promise<{files: Array, rootName: string}>}
 */
export function readDirectoryViaInput() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.multiple = true

    input.onchange = async () => {
      const fileList = Array.from(input.files || [])
      if (fileList.length === 0) {
        reject(new Error('No files selected'))
        return
      }

      // Derive root from common path prefix
      const rootName = fileList[0]?.webkitRelativePath?.split('/')[0] || 'project'

      const files = []
      for (const file of fileList) {
        // webkitRelativePath: "projectName/src/index.js"
        const path = file.webkitRelativePath.replace(`${rootName}/`, '')
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        const dirParts = path.split('/')

        // Apply same filters
        if (EXCLUDED_EXTENSIONS.has(ext)) continue
        if (dirParts.some(p => EXCLUDED_DIRS.has(p) || p.startsWith('.'))) continue
        if (file.size > MAX_FILE_SIZE) continue

        try {
          const content = await file.text()
          files.push({ path, content })
        } catch {
          // Skip unreadable files
        }
      }

      resolve({ files, rootName })
    }

    input.oncancel = () => reject(new Error('File selection cancelled'))
    input.click()
  })
}
