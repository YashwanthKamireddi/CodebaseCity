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
 */

import { parseFile } from '../parser/regexParser.js'
import { buildCityData } from '../graph/graphEngine.js'

self.onmessage = async (event) => {
  const { type, files, rootName } = event.data

  if (type !== 'ANALYZE') return

  try {
    // Regex parser requires no initialization, it's instant!
    self.postMessage({ type: 'PROGRESS', current: 0, total: files.length, file: 'Starting blazingly fast regex analysis...' })

    // Parse all files
    const parsedFiles = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        const parsed = parseFile(file.path, file.content)
        parsedFiles.push(parsed)
      } catch (err) {
        // Skip unparseable files silently
        console.warn(`[Worker] Failed to parse ${file.path}:`, err.message)
      }

      // Report progress every 10 files to avoid flooding main thread
      if (i % 10 === 0 || i === files.length - 1) {
        self.postMessage({
          type: 'PROGRESS',
          current: i + 1,
          total: files.length,
          file: file.path,
        })
      }
    }

    // Build city data from parsed files
    self.postMessage({ type: 'PROGRESS', current: files.length, total: files.length, file: 'Building city layout...' })
    const cityData = buildCityData(parsedFiles, rootName)

    // Send the result back
    self.postMessage({ type: 'RESULT', cityData })

  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err.message || 'Analysis failed' })
  }
}
