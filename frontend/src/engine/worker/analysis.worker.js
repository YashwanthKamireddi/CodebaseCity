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

self.onmessage = async (event) => {
  const { type, files, rootName } = event.data

  if (type !== 'ANALYZE') return

  try {
    const totalFiles = files.length
    self.postMessage({ type: 'PROGRESS', current: 0, total: totalFiles, file: 'Starting blazingly fast regex analysis...' })

    // Parse all files with time-based progress updates
    const parsedFiles = []
    const parseErrors = []
    let lastReportTime = performance.now()

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i]

      try {
        const parsed = parseFile(file.path, file.content)
        parsedFiles.push(parsed)
      } catch (err) {
        parseErrors.push({
          file: file.path,
          stage: 'parse',
          error: err.message,
        })
      }

      // Time-based progress reporting — fire every ~100ms to keep UI responsive
      const now = performance.now()
      const shouldReport = (now - lastReportTime > 100) || i === totalFiles - 1
      if (shouldReport) {
        lastReportTime = now
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

    let cityData
    try {
      cityData = buildCityData(parsedFiles, rootName)
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        stage: 'graph',
        message: `City layout failed: ${err.message}`,
        details: { parsedCount: parsedFiles.length, errorCount: parseErrors.length },
      })
      return
    }

    // Attach diagnostics so the UI can surface warnings
    if (parseErrors.length > 0) {
      cityData.metadata = cityData.metadata || {}
      cityData.metadata.parseErrors = parseErrors
    }

    self.postMessage({ type: 'RESULT', cityData })

  } catch (err) {
    self.postMessage({
      type: 'ERROR',
      stage: 'unknown',
      message: err.message || 'Analysis failed',
    })
  }
}
