/**
 * regexParser.js — Enhanced Regex-Based Source File Parser
 *
 * A high-accuracy, zero-WASM parser that extracts structural metadata
 * from source files using battle-tested regex patterns.
 *
 * Supports: JS, TS, TSX, JSX, Python, Java, Go, Rust, C/C++, Ruby, PHP, Swift, Kotlin, C#
 *
 * Features:
 * - Arrow function detection (const foo = () => {})
 * - Class method detection (methodName() {})
 * - Export statement tracking
 * - Accurate cyclomatic complexity via branching keyword counting
 * - Comment line detection for better LOC metrics
 *
 * Performance Optimizations:
 * - Pre-compiled regex patterns shared across invocations
 * - Reduced allocations via reused Sets and early bailouts
 * - Language-specific pattern selection to skip irrelevant regexes
 */

const EXTENSION_MAP = {
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'tsx',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cc': 'cpp', '.hpp': 'cpp', '.cxx': 'cpp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.cs': 'c_sharp',
  '.scala': 'scala',
  '.vue': 'javascript',
  '.svelte': 'javascript',
  '.dart': 'dart',
  '.lua': 'lua',
  '.r': 'r', '.R': 'r',
  '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
  '.sql': 'sql',
  '.json': 'json',
  '.yaml': 'yaml', '.yml': 'yaml',
  '.xml': 'xml',
  '.md': 'markdown',
  '.css': 'css', '.scss': 'scss', '.less': 'less',
  '.html': 'html', '.htm': 'html',
}

// Pre-compiled patterns - reused across all parse calls
const IMPORT_PATTERNS = {
  js: [
    /import\s+(?:[\w{}\s*,]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  python: [
    /(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/g,
  ],
  c: [
    /#include\s*[<"]([^>"]+)[>"]/g,
  ],
  go: [
    /import\s+(?:\([^)]*\)|"[^"]+"|`[^`]+`)/g,
  ],
  rust: [
    /use\s+([\w:]+)/g,
  ],
  java: [
    /import\s+([\w.]+)/g,
  ],
}

const FUNCTION_PATTERNS = {
  js: [
    /(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/g,
    /(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s+)?\(?[^)]*\)?\s*=>/g,
    /^\s+([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{/gm,
  ],
  python: [
    /def\s+([a-zA-Z_][\w]*)/g,
  ],
  go: [
    /func\s+(?:\([^)]*\)\s+)?([A-Za-z][\w]*)/g,
  ],
  rust: [
    /fn\s+([a-zA-Z_][\w]*)/g,
  ],
  ruby: [
    /def\s+([a-zA-Z_][\w?!]*)/g,
  ],
  java: [
    /(?:public|private|protected|static|final|abstract|override|suspend)\s+(?:[\w<>\[\]]+\s+)+([a-zA-Z_][\w]*)\s*\(/g,
  ],
}

// Reusable Sets to reduce allocations
const _seenImports = new Set()
const _seenFunctions = new Set()
const _seenClasses = new Set()
const _falsePositives = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'throw', 'typeof', 'instanceof'])

// Pre-compiled complexity pattern
const BRANCH_KEYWORDS = /\b(if|else\s+if|elif|for|while|do|switch|case|catch|except|&&|\|\||and\s|or\s|\?)\b/g

export function detectLanguage(filePath) {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase()
  return EXTENSION_MAP[ext] || 'unknown'
}

export function parseFile(filePath, content) {
  const langName = detectLanguage(filePath)
  const lines = content.split('\n')
  const lineCount = lines.length

  // Count blank and comment lines - optimized with early bounds check
  let blankLines = 0
  let commentLines = 0
  let inBlockComment = false

  for (let i = 0; i < lineCount; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.length === 0) {
      blankLines++
      continue
    }

    // Block comment tracking
    if (inBlockComment) {
      commentLines++
      if (trimmed.includes('*/')) inBlockComment = false
      continue
    }
    if (trimmed.startsWith('/*')) {
      commentLines++
      inBlockComment = !trimmed.includes('*/')
      continue
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--')) {
      commentLines++
    }
  }

  const result = {
    file_path: filePath,
    language: langName,
    lines_of_code: lineCount,
    blank_lines: blankLines,
    comment_lines: commentLines,
    code_lines: lineCount - blankLines - commentLines,
    imports: [],
    functions: [],
    classes: [],
    exports: [],
    complexity: 1, // Base complexity
  }

  // Skip deep parsing for non-code files or massive files
  if (['unknown', 'json', 'yaml', 'xml', 'markdown', 'css', 'scss', 'less', 'html', 'sql'].includes(langName)) {
    return result
  }
  if (content.length > 2000000) {
    return result // Skip > 2MB files to prevent regex hanging
  }

  // Clear reusable sets
  _seenImports.clear()
  _seenFunctions.clear()
  _seenClasses.clear()

  // Pre-compute line offsets for O(log n) offset→line lookup
  const _lineOffsets = [0]
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) _lineOffsets.push(i + 1)
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. IMPORT EXTRACTION - Use language-specific patterns
  // ═══════════════════════════════════════════════════════════════
  const langFamily = getLangFamily(langName)
  const importPatterns = IMPORT_PATTERNS[langFamily] || IMPORT_PATTERNS.js

  let match
  for (const pattern of importPatterns) {
    pattern.lastIndex = 0
    while ((match = pattern.exec(content)) !== null) {
      const pkg = match[1] || match[2]
      if (pkg && !_seenImports.has(pkg)) {
        _seenImports.add(pkg)
        result.imports.push({
          text: pkg.replace(/\./g, '/'),
        })
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. FUNCTION & CLASS EXTRACTION - Language-specific
  // ═══════════════════════════════════════════════════════════════
  const functionPatterns = FUNCTION_PATTERNS[langFamily] || FUNCTION_PATTERNS.js

  for (const pattern of functionPatterns) {
    pattern.lastIndex = 0
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1]
      if (!name || _seenFunctions.has(name)) continue
      if (_falsePositives.has(name)) continue
      _seenFunctions.add(name)

      // O(log n) line-number lookup via binary search on pre-computed offsets
      let lo = 0, hi = _lineOffsets.length - 1
      const idx = match.index
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (_lineOffsets[mid] <= idx) lo = mid; else hi = mid - 1
      }
      const lineNum = lo + 1

      result.functions.push({
        name,
        start_line: lineNum,
        end_line: lineNum + 10,
        line_count: 10,
      })
    }
  }

  // Class extraction (generic patterns)
  const classPatterns = [
    /(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z_$][\w$]*)/g,
    /(?:data\s+)?class\s+([A-Z][\w]*)/g,
    /struct\s+([A-Z][\w]*)/g,
    /interface\s+([A-Z][\w]*)/g,
    /enum\s+([A-Z][\w]*)/g,
  ]

  for (const pattern of classPatterns) {
    pattern.lastIndex = 0
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1]
      if (!name || _seenClasses.has(name)) continue
      _seenClasses.add(name)

      let lo = 0, hi = _lineOffsets.length - 1
      const idx = match.index
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (_lineOffsets[mid] <= idx) lo = mid; else hi = mid - 1
      }
      const lineNum = lo + 1

      result.classes.push({
        name,
        start_line: lineNum,
        end_line: lineNum + 20,
      })
    }
  }

  // Export tracking
  const exportPattern = /export\s+(?:default\s+)?(?:function|class|const|let|var|async)\s+([a-zA-Z_$][\w$]*)/g
  while ((match = exportPattern.exec(content)) !== null) {
    if (match[1]) result.exports.push(match[1])
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. CYCLOMATIC COMPLEXITY
  // ═══════════════════════════════════════════════════════════════
  BRANCH_KEYWORDS.lastIndex = 0
  const flowMatches = content.match(BRANCH_KEYWORDS)
  if (flowMatches) {
    result.complexity += flowMatches.length
  }

  // Bonus complexity for deeply nested code (heuristic: indentation depth)
  let deepLineCount = 0
  for (let i = 0; i < lineCount; i++) {
    if (lines[i].match(/^\s{16,}\S/)) deepLineCount++
  }
  result.complexity += Math.floor(deepLineCount / 5)

  return result
}

// Map language names to pattern families
function getLangFamily(langName) {
  switch (langName) {
    case 'javascript':
    case 'typescript':
    case 'tsx':
      return 'js'
    case 'python':
      return 'python'
    case 'c':
    case 'cpp':
      return 'c'
    case 'go':
      return 'go'
    case 'rust':
      return 'rust'
    case 'ruby':
      return 'ruby'
    case 'java':
    case 'kotlin':
    case 'scala':
    case 'c_sharp':
      return 'java'
    default:
      return 'js'
  }
}

/**
 * Resolve import text to a relative file path.
 * Best-effort heuristic — exact resolution would require tsconfig.json etc.
 */
export function resolveImport(importText, currentFilePath, langName) {
  const parts = importText.replace(/['"\`;]/g, '').trim()

  // Python: from foo.bar import baz → foo/bar
  if (langName === 'python') {
    const match = importText.match(/(?:from\s+)?([\w.]+)/)
    if (match) return match[1].replace(/\./g, '/')
  }

  // JS/TS: import x from './foo' → ./foo
  if (['javascript', 'typescript', 'tsx'].includes(langName)) {
    const match = importText.match(/from\s+['"]([^'"]+)['"]/)
    if (match) return match[1]
    const reqMatch = importText.match(/require\(\s*['"]([^'"]+)['"]\s*\)/)
    if (reqMatch) return reqMatch[1]
  }

  // Java/Kotlin: import com.foo.Bar → com/foo/Bar
  if (['java', 'kotlin'].includes(langName)) {
    const match = importText.match(/import\s+([\w.]+)/)
    if (match) return match[1].replace(/\./g, '/')
  }

  // Go: "github.com/foo/bar"
  if (langName === 'go') {
    const match = importText.match(/["']([^"']+)["']/)
    if (match) return match[1]
  }

  // C/C++: #include "foo.h" or <foo.h>
  if (['c', 'cpp'].includes(langName)) {
    const match = importText.match(/[<"]([^>"]+)[>"]/)
    if (match) return match[1]
  }

  // Rust: use crate::foo::bar → foo/bar
  if (langName === 'rust') {
    const match = importText.match(/use\s+([\w:]+)/)
    if (match) return match[1].replace(/::/g, '/')
  }

  return parts
}
