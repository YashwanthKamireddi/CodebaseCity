/**
 * zipExtractor.js — Lightweight ZIP decompression for GitHub repos
 *
 * Downloads a repo as a ZIP from GitHub's REST API and extracts
 * source files directly into memory. No IndexedDB, no LightningFS,
 * no CORS proxy needed.
 *
 * Uses `fflate` — a fast, ESM-native, zero-dependency decompression library
 * that bundles perfectly with Vite (unlike isomorphic-git's CORS approach).
 */

import { unzipSync, strFromU8 } from 'fflate'

// Skip patterns (same as fileSystemAdapter.js)
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

const MAX_FILE_SIZE = 512 * 1024 // 512KB

/**
 * Download and extract a GitHub repo as a ZIP archive.
 * Uses GitHub's REST API: GET /repos/{owner}/{repo}/zipball
 *
 * This is dramatically faster and more reliable than cloning via
 * isomorphic-git through a CORS proxy because:
 * 1. Single HTTP request instead of multiple git pack negotiations
 * 2. No CORS proxy bottleneck
 * 3. No IndexedDB writes (everything stays in RAM)
 *
 * @param {string} owner - GitHub owner (e.g. "facebook")
 * @param {string} repo - Repository name (e.g. "react")
 * @param {function} onProgress - Progress callback
 * @param {number} maxFiles - Maximum files to extract
 * @returns {Promise<{files: Array<{path: string, content: string}>, rootName: string}>}
 */
export async function downloadAndExtractZip(owner, repo, onProgress, maxFiles = 5000) {
  const rootName = `${owner}/${repo}`

  onProgress?.('cloning', 10, 100, `Downloading ${rootName} archive...`)

  // GitHub's zipball API — works for all public repos, no auth needed
  const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`

  // Fetch with timeout
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000) // 60s timeout

  let response
  try {
    response = await fetch(zipUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.github+json',
      },
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error(`Download timed out after 60s. The repository might be too large or your connection is slow.`)
    }
    throw new Error(`Failed to download ${rootName}: ${err.message}`)
  }
  clearTimeout(timeout)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository "${rootName}" not found. Make sure it exists and is public.`)
    }
    if (response.status === 403) {
      throw new Error(`GitHub API rate limit exceeded. Wait a minute and try again.`)
    }
    throw new Error(`GitHub API error (${response.status}): ${response.statusText}`)
  }

  onProgress?.('cloning', 40, 100, 'Downloading ZIP archive...')

  // Read the response as an ArrayBuffer
  const arrayBuffer = await response.arrayBuffer()
  const zipData = new Uint8Array(arrayBuffer)

  onProgress?.('cloning', 70, 100, `Decompressing ${(zipData.length / 1024 / 1024).toFixed(1)}MB archive...`)

  // Decompress using fflate (synchronous, fast)
  let unzipped
  try {
    unzipped = unzipSync(zipData)
  } catch (err) {
    throw new Error(`Failed to decompress ZIP: ${err.message}`)
  }

  onProgress?.('reading', 0, 0, 'Extracting source files...')

  // Extract files, skipping excluded patterns
  const files = []
  const entries = Object.keys(unzipped)

  // GitHub zipball has a root directory like "owner-repo-commitsha/"
  // We need to strip this prefix from all paths
  const rootPrefix = entries.length > 0
    ? entries[0].split('/')[0] + '/'
    : ''

  for (let i = 0; i < entries.length; i++) {
    if (files.length >= maxFiles) break

    const fullPath = entries[i]
    const data = unzipped[fullPath]

    // Skip directories (they have zero-length data in fflate)
    if (fullPath.endsWith('/') || data.length === 0) continue

    // Strip the GitHub root prefix (e.g. "owner-repo-abc123/")
    const relativePath = fullPath.startsWith(rootPrefix)
      ? fullPath.slice(rootPrefix.length)
      : fullPath

    if (!relativePath) continue

    // Check excluded directories
    const pathParts = relativePath.split('/')
    const hasExcludedDir = pathParts.some(part => EXCLUDED_DIRS.has(part) || part.startsWith('.'))
    if (hasExcludedDir) continue

    // Check file extension
    const fileName = pathParts[pathParts.length - 1]
    const ext = '.' + fileName.split('.').pop()?.toLowerCase()
    if (EXCLUDED_EXTENSIONS.has(ext)) continue
    if (fileName.startsWith('.')) continue

    // Check file size
    if (data.length > MAX_FILE_SIZE) continue

    // Decode content as UTF-8 text
    try {
      const content = strFromU8(data)
      files.push({ path: relativePath, content })
    } catch {
      // Skip binary/undecodable files
    }

    // Report progress periodically
    if (files.length % 100 === 0) {
      onProgress?.('reading', files.length, maxFiles, relativePath)
    }
  }

  onProgress?.('reading', files.length, files.length, `Extracted ${files.length} source files`)

  return { files, rootName }
}
