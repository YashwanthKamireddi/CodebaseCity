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

export function detectLanguage(filePath) {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase()
  return EXTENSION_MAP[ext] || 'unknown'
}

export function parseFile(filePath, content) {
  const langName = detectLanguage(filePath)
  const lines = content.split('\n')

  // Count blank and comment lines
  let blankLines = 0
  let commentLines = 0
  let inBlockComment = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
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
      if (!trimmed.includes('*/')) inBlockComment = false
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
    lines_of_code: lines.length,
    blank_lines: blankLines,
    comment_lines: commentLines,
    code_lines: lines.length - blankLines - commentLines,
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

  // ═══════════════════════════════════════════════════════════════
  // 1. IMPORT EXTRACTION
  // ═══════════════════════════════════════════════════════════════
  const importPatterns = [
    // ES6: import X from 'Y', import { X } from 'Y', import 'Y'
    /import\s+(?:[\w{}\s*,]+\s+from\s+)?['"]([^'"]+)['"]/g,
    // CommonJS: require('Y')
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    // C/C++: #include <Y> or #include "Y"
    /#include\s*[<"]([^>"]+)[>"]/g,
    // Python: from X import Y, import X
    /(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/g,
    // Go: import "Y" or import ( "Y" )
    /import\s+(?:\([\s\S]*?\)|"[^"]+"|`[^`]+`)/g,
    // Rust: use X::Y
    /use\s+([\w:]+)/g,
    // Java/Kotlin: import com.foo.bar
    /import\s+([\w.]+)/g,
  ]

  let match
  const seenImports = new Set()

  for (const pattern of importPatterns) {
    pattern.lastIndex = 0
    while ((match = pattern.exec(content)) !== null) {
      const pkg = match[1] || match[2]
      if (pkg && !seenImports.has(pkg)) {
        seenImports.add(pkg)
        result.imports.push({
          text: pkg.replace(/\./g, '/'),
        })
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. FUNCTION & CLASS EXTRACTION
  // ═══════════════════════════════════════════════════════════════
  const functionPatterns = [
    // Standard: function foo(), async function foo()
    /(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/g,
    // Arrow: const foo = (...) =>
    /(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s+)?\(?[^)]*\)?\s*=>/g,
    // Method: foo() { ... } (inside class or object)
    /^\s+([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{/gm,
    // Python: def foo(
    /def\s+([a-zA-Z_][\w]*)/g,
    // Go: func Foo( or func (r *Receiver) Foo(
    /func\s+(?:\([^)]*\)\s+)?([A-Z][\w]*)/g,
    // Rust: fn foo(
    /fn\s+([a-zA-Z_][\w]*)/g,
    // Ruby: def foo
    /def\s+([a-zA-Z_][\w?!]*)/g,
    // Java/Kotlin: public void foo(
    /(?:public|private|protected|static|final|abstract|override|suspend)\s+(?:[\w<>\[\]]+\s+)+([a-zA-Z_][\w]*)\s*\(/g,
  ]

  const seenFunctions = new Set()
  for (const pattern of functionPatterns) {
    pattern.lastIndex = 0
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1]
      if (!name || seenFunctions.has(name)) continue
      // Skip common false positives
      if (['if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'throw', 'typeof', 'instanceof'].includes(name)) continue
      seenFunctions.add(name)

      const substring = content.slice(0, match.index)
      const lineNum = (substring.match(/\n/g) || []).length + 1

      result.functions.push({
        name,
        start_line: lineNum,
        end_line: lineNum + 10, // Estimate
        line_count: 10,
      })
    }
  }

  // Class extraction
  const classPatterns = [
    /(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z_$][\w$]*)/g,
    /(?:data\s+)?class\s+([A-Z][\w]*)/g, // Kotlin
    /struct\s+([A-Z][\w]*)/g, // Rust/Go/Swift
    /interface\s+([A-Z][\w]*)/g,
    /enum\s+([A-Z][\w]*)/g,
  ]

  const seenClasses = new Set()
  for (const pattern of classPatterns) {
    pattern.lastIndex = 0
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1]
      if (!name || seenClasses.has(name)) continue
      seenClasses.add(name)

      const substring = content.slice(0, match.index)
      const lineNum = (substring.match(/\n/g) || []).length + 1

      result.classes.push({
        name,
        start_line: lineNum,
        end_line: lineNum + 20, // Estimate
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
  const branchKeywords = /\b(if|else\s+if|elif|for|while|do|switch|case|catch|except|&&|\|\||and\s|or\s|\?)\b/g
  const flowMatches = content.match(branchKeywords)
  if (flowMatches) {
    result.complexity += flowMatches.length
  }

  // Bonus complexity for deeply nested code (heuristic: indentation depth)
  const deepLines = lines.filter(l => l.match(/^\s{16,}\S/)) // 4+ levels of indentation
  result.complexity += Math.floor(deepLines.length / 5)

  return result
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
