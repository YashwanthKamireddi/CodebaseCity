/**
 * logger.js — Production-safe logging utility
 *
 * In development: logs to console normally
 * In production: silences all debug logs, only shows errors
 */

const isDev = import.meta.env?.DEV ?? (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')

export const logger = {
  debug: (...args) => { if (isDev) console.log('[CodeCity]', ...args) },
  info: (...args) => { if (isDev) console.info('[CodeCity]', ...args) },
  warn: (...args) => console.warn('[CodeCity]', ...args),
  error: (...args) => console.error('[CodeCity]', ...args),
  time: (label) => { if (isDev) console.time(label) },
  timeEnd: (label) => { if (isDev) console.timeEnd(label) },
}

export default logger
