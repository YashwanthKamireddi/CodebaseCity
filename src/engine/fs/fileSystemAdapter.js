/**
 * fileSystemAdapter.js — Unified file access for browser-based analysis
 *
 * Strategy:
 * 1. LOCAL: File System Access API (showDirectoryPicker) — zero-server, code stays on device
 * 2. FALLBACK: <input webkitdirectory> for Firefox/Safari
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

/**
 * Check if the File System Access API is available
 */
export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
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
