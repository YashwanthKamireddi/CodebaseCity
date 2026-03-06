/**
 * ClientAnalyzer.js — Main thread orchestrator for client-side analysis
 *
 * This is the single entry point the UI calls. It handles:
 * 1. LOCAL: Reads files via File System Access API
 * 2. GITHUB: Clones repos in-browser via isomorphic-git
 * 3. Both use a Web Worker for AST parsing + graph analysis
 *
 * Usage:
 *   import { analyzeLocal, analyzeGitHub } from './engine/ClientAnalyzer'
 *   const cityData = await analyzeLocal({ onProgress })
 *   const cityData = await analyzeGitHub({ url, onProgress })
 */

import {
  readLocalDirectory,
  readDirectoryViaInput,
  isFileSystemAccessSupported,
  cloneGitHubRepo,
  parseGitHubUrl,
} from './fs/fileSystemAdapter.js'

/**
 * Analyze a local directory entirely client-side.
 */
export async function analyzeLocal({ onProgress = null, maxFiles = 5000 } = {}) {
  onProgress?.('reading', 0, 0, 'Opening folder picker...')

  let files, rootName
  if (isFileSystemAccessSupported()) {
    const result = await readLocalDirectory(
      (current, total, filePath) => {
        onProgress?.('reading', current, total, filePath)
      },
      maxFiles
    )
    files = result.files
    rootName = result.rootName
  } else {
    onProgress?.('reading', 0, 0, 'Select your project folder...')
    const result = await readDirectoryViaInput()
    files = result.files
    rootName = result.rootName
  }

  if (files.length === 0) {
    throw new Error('No source files found in the selected directory.')
  }

  onProgress?.('reading', files.length, files.length, `Read ${files.length} files from "${rootName}"`)

  return runWorkerAnalysis(files, rootName, onProgress, 'client')
}

/**
 * Analyze a GitHub repo entirely client-side.
 * Clones into an in-browser virtual filesystem, parses, and generates the city.
 *
 * @param {object} options
 * @param {string} options.url - GitHub URL (e.g. "https://github.com/owner/repo")
 * @param {function} options.onProgress - (phase, current, total, detail) => void
 * @param {number} options.maxFiles - Maximum files to read (default: 5000)
 * @returns {Promise<object>} CityData compatible with the store
 */
export async function analyzeGitHub({ url, onProgress = null, maxFiles = 5000 } = {}) {
  const parsed = parseGitHubUrl(url)
  if (!parsed) {
    throw new Error(`Invalid GitHub URL: "${url}". Expected format: github.com/owner/repo`)
  }

  onProgress?.('cloning', 0, 100, `Cloning ${parsed.owner}/${parsed.repo}...`)

  const { files, rootName } = await cloneGitHubRepo(
    url,
    (phase, current, total, detail) => {
      onProgress?.(phase, current, total, detail)
    },
    maxFiles
  )

  if (files.length === 0) {
    throw new Error(`No source files found in ${rootName}.`)
  }

  onProgress?.('reading', files.length, files.length, `Read ${files.length} files from ${rootName}`)

  return runWorkerAnalysis(files, rootName, onProgress, 'github-client')
}

/**
 * Shared: spawn a Web Worker and run the parsing + graph analysis pipeline.
 * Also builds a fileContents map so the Code Viewer can display source code.
 */
function runWorkerAnalysis(files, rootName, onProgress, source) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./worker/analysis.worker.js', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (event) => {
      const { type, current, total, file, cityData, message } = event.data

      switch (type) {
        case 'PROGRESS':
          onProgress?.('analyzing', current, total, file)
          break

        case 'RESULT':
          cityData.path = rootName
          cityData.city_id = `${source}_${rootName}_${Date.now()}`
          cityData.analyzed_at = new Date().toISOString()
          cityData.source = source

          // Attach file contents for Code Viewer (max 50MB budget)
          const fileContents = {}
          let totalSize = 0
          const MAX_CONTENT_SIZE = 50 * 1024 * 1024 // 50MB
          for (const f of files) {
            if (totalSize > MAX_CONTENT_SIZE) break
            fileContents[f.path] = f.content
            totalSize += f.content.length
          }
          cityData.fileContents = fileContents

          worker.terminate()
          resolve(cityData)
          break

        case 'ERROR':
          worker.terminate()
          reject(new Error(message))
          break
      }
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(new Error(`Worker error: ${err.message}`))
    }

    worker.postMessage({ type: 'ANALYZE', files, rootName })
  })
}

/**
 * Check if client-side analysis is supported in this browser.
 */
export function isClientAnalysisSupported() {
  return typeof Worker !== 'undefined'
}

/**
 * Check if a URL looks like a GitHub repo.
 */
export function isGitHubUrl(url) {
  return parseGitHubUrl(url) !== null
}
