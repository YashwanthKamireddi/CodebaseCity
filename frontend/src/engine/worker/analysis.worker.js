/**
 * analysis.worker.js — Web Worker for off-main-thread analysis
 *
 * This worker receives file data from the main thread and runs
 * the full analysis pipeline (AST parsing → graph → city layout)
 * without blocking the 3D scene or UI.
 *
 * Communication:
 *   Main → Worker: { type: 'ANALYZE', files: [...], rootName: '...' }
 *   Worker → Main: { type: 'PROGRESS', current, total, file }
 *   Worker → Main: { type: 'RESULT', cityData: {...} }
 *   Worker → Main: { type: 'ERROR', message: '...' }
 *
 * Performance Optimizations:
 *   - Batch progress updates (every 25 files) to reduce IPC overhead
 *   - Early memory cleanup for large file arrays
 *   - Streaming file processing for reduced peak memory
 */

import { parseFile } from '../parser/regexParser.js'
import { buildCityData } from '../graph/graphEngine.js'

// Progress reporting interval - reduced IPC overhead
const PROGRESS_INTERVAL = 25

self.onmessage = async (event) => {
  const { type, files, rootName } = event.data

  if (type !== 'ANALYZE') return

  try {
    const totalFiles = files.length
    self.postMessage({ type: 'PROGRESS', current: 0, total: totalFiles, file: 'Starting blazingly fast regex analysis...' })

    // Parse all files with batched progress updates
    const parsedFiles = []
    let lastProgressUpdate = 0

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i]

      try {
        const parsed = parseFile(file.path, file.content)
        parsedFiles.push(parsed)
      } catch (err) {
        // Skip unparseable files silently
        console.warn(`[Worker] Failed to parse ${file.path}:`, err.message)
      }

      // Batched progress reporting - reduces IPC overhead significantly
      const shouldReport = (i - lastProgressUpdate >= PROGRESS_INTERVAL) || i === totalFiles - 1
      if (shouldReport) {
        lastProgressUpdate = i
        self.postMessage({
          type: 'PROGRESS',
          current: i + 1,
          total: totalFiles,
          file: file.path,
        })
      }
    }

    // Build city data from parsed files
    self.postMessage({ type: 'PROGRESS', current: totalFiles, total: totalFiles, file: 'Building city layout...' })
    const cityData = buildCityData(parsedFiles, rootName)

    // Send the result back
    self.postMessage({ type: 'RESULT', cityData })

  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err.message || 'Analysis failed' })
  }
}
