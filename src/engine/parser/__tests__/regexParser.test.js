/**
 * regexParser.test.js — Comprehensive tests for the regex-based source parser
 */

import { describe, it, expect } from 'vitest'
import { detectLanguage, parseFile } from '../regexParser'

// ─── detectLanguage ───────────────────────────────────────────────────────────

describe('detectLanguage', () => {
  it.each([
    ['index.js', 'javascript'],
    ['App.jsx', 'javascript'],
    ['main.ts', 'typescript'],
    ['Component.tsx', 'tsx'],
    ['script.py', 'python'],
    ['Main.java', 'java'],
    ['main.go', 'go'],
    ['lib.rs', 'rust'],
    ['util.c', 'c'],
    ['util.h', 'c'],
    ['algo.cpp', 'cpp'],
    ['algo.cc', 'cpp'],
    ['app.rb', 'ruby'],
    ['index.php', 'php'],
    ['App.swift', 'swift'],
    ['App.kt', 'kotlin'],
    ['Program.cs', 'c_sharp'],
    ['README.md', 'markdown'],
    ['styles.css', 'css'],
    ['unknown.xyz', 'unknown'],
  ])('%s → %s', (file, expected) => {
    expect(detectLanguage(file)).toBe(expected)
  })
})

// ─── JavaScript / TypeScript ──────────────────────────────────────────────────

describe('parseFile — JavaScript', () => {
  it('detects named function declarations', () => {
    const result = parseFile('app.js', `
      function greet(name) { return 'hello ' + name }
      async function loadData() { return fetch('/api') }
    `)
    const names = result.functions.map(f => f.name)
    expect(names).toContain('greet')
    expect(names).toContain('loadData')
  })

  it('detects arrow function assignments', () => {
    const result = parseFile('app.js', `
      const add = (a, b) => a + b
      const fetchUser = async (id) => { return api.get(id) }
    `)
    const names = result.functions.map(f => f.name)
    expect(names).toContain('add')
    expect(names).toContain('fetchUser')
  })

  it('detects class declarations', () => {
    const result = parseFile('app.js', `
      class UserService {
        constructor() {}
      }
      export default class ApiClient {}
    `)
    const names = result.classes.map(c => c.name)
    expect(names).toContain('UserService')
    expect(names).toContain('ApiClient')
  })

  it('detects ES module imports', () => {
    const result = parseFile('app.js', `
      import React from 'react'
      import { useState, useEffect } from 'react'
      import axios from 'axios'
    `)
    const texts = result.imports.map(i => i.text)
    expect(texts).toContain('react')
    expect(texts).toContain('axios')
  })

  it('detects require() imports', () => {
    const result = parseFile('server.js', `
      const fs = require('fs')
      const path = require('path')
      const express = require('express')
    `)
    const texts = result.imports.map(i => i.text)
    expect(texts).toContain('fs')
    expect(texts).toContain('express')
  })

  it('detects export statements', () => {
    const result = parseFile('app.js', `
      export function helper() {}
      export const API_KEY = 'x'
      export default class MyClass {}
    `)
    expect(result.exports).toContain('helper')
    expect(result.exports).toContain('MyClass')
  })

  it('does not count false positive identifiers as functions', () => {
    const result = parseFile('app.js', `
      if (condition) { doSomething() }
      for (let i = 0; i < 10; i++) {}
      while (running) {}
    `)
    const names = result.functions.map(f => f.name)
    expect(names).not.toContain('if')
    expect(names).not.toContain('for')
    expect(names).not.toContain('while')
  })

  it('computes correct line count', () => {
    const content = 'const a = 1\nconst b = 2\nconst c = 3'
    const result = parseFile('app.js', content)
    expect(result.lines_of_code).toBe(3)
  })

  it('counts blank lines accurately', () => {
    const content = 'const a = 1\n\n\nconst b = 2'
    const result = parseFile('app.js', content)
    expect(result.blank_lines).toBe(2)
  })

  it('counts comment lines', () => {
    const content = '// single line\n/* block */\nconst x = 1'
    const result = parseFile('app.js', content)
    expect(result.comment_lines).toBe(2)
  })

  it('computes cyclomatic complexity', () => {
    const content = `
      function check(a, b) {
        if (a > 0) {
          if (b < 0) return false
        } else if (a === 0) {
          return null
        }
        for (let i = 0; i < 10; i++) {
          if (i % 2 === 0) continue
        }
        return true
      }
    `
    const result = parseFile('app.js', content)
    expect(result.complexity).toBeGreaterThan(1)
  })

  it('does not parse non-code files', () => {
    const result = parseFile('data.json', '{"key":"value"}')
    expect(result.functions).toHaveLength(0)
    expect(result.classes).toHaveLength(0)
  })
})

// ─── Python ───────────────────────────────────────────────────────────────────

describe('parseFile — Python', () => {
  it('detects def functions', () => {
    const result = parseFile('utils.py', `
def greet(name):
    return f"hello {name}"

async def fetch_data(url):
    pass

def _private_helper():
    pass
    `)
    const names = result.functions.map(f => f.name)
    expect(names).toContain('greet')
    expect(names).toContain('fetch_data')
    expect(names).toContain('_private_helper')
  })

  it('detects class declarations', () => {
    const result = parseFile('models.py', `
class User:
    pass

class AdminUser(User):
    pass
    `)
    const names = result.classes.map(c => c.name)
    expect(names).toContain('User')
    expect(names).toContain('AdminUser')
  })

  it('detects import statements', () => {
    const result = parseFile('app.py', `
import os
import sys
from pathlib import Path
from collections import defaultdict
    `)
    const texts = result.imports.map(i => i.text)
    expect(texts).toContain('os')
    expect(texts).toContain('sys')
    expect(texts).toContain('pathlib')
    expect(texts).toContain('collections')
  })
})

// ─── Java ─────────────────────────────────────────────────────────────────────

describe('parseFile — Java', () => {
  it('detects class declarations', () => {
    const result = parseFile('Service.java', `
public class UserService {
    private String name;
}
interface Repository {}
enum Status { ACTIVE, INACTIVE }
    `)
    const names = result.classes.map(c => c.name)
    expect(names).toContain('UserService')
    expect(names).toContain('Repository')
    expect(names).toContain('Status')
  })

  it('detects method declarations', () => {
    const result = parseFile('Service.java', `
public class MyClass {
    public String getName() { return name; }
    private void setName(String n) { this.name = n; }
    protected static int compute(int x) { return x * 2; }
}
    `)
    const names = result.functions.map(f => f.name)
    expect(names).toContain('getName')
    expect(names).toContain('setName')
    expect(names).toContain('compute')
  })

  it('detects import statements', () => {
    const result = parseFile('App.java', `
import java.util.List;
import java.util.ArrayList;
import com.example.model.User;
    `)
    const texts = result.imports.map(i => i.text)
    expect(texts).toContain('java/util/List')
    expect(texts).toContain('com/example/model/User')
  })
})

// ─── Go ───────────────────────────────────────────────────────────────────────

describe('parseFile — Go', () => {
  it('detects func declarations', () => {
    const result = parseFile('server.go', `
func main() {
    fmt.Println("hello")
}
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {}
func NewServer(port int) *Server { return &Server{} }
    `)
    const names = result.functions.map(f => f.name)
    expect(names).toContain('main')
    expect(names).toContain('ServeHTTP')
    expect(names).toContain('NewServer')
  })

  it('detects struct declarations (as classes)', () => {
    const result = parseFile('types.go', `
struct Server { port int }
    `)
    const names = result.classes.map(c => c.name)
    expect(names).toContain('Server')
  })
})

// ─── Rust ─────────────────────────────────────────────────────────────────────

describe('parseFile — Rust', () => {
  it('detects fn declarations', () => {
    const result = parseFile('lib.rs', `
fn main() {}
pub fn add(a: i32, b: i32) -> i32 { a + b }
async fn fetch() -> Result<(), Error> { Ok(()) }
    `)
    const names = result.functions.map(f => f.name)
    expect(names).toContain('main')
    expect(names).toContain('add')
    expect(names).toContain('fetch')
  })

  it('detects struct and enum', () => {
    const result = parseFile('models.rs', `
struct Config { debug: bool }
enum Status { Active, Inactive }
    `)
    const names = result.classes.map(c => c.name)
    expect(names).toContain('Config')
    expect(names).toContain('Status')
  })
})

// ─── Ruby ─────────────────────────────────────────────────────────────────────

describe('parseFile — Ruby', () => {
  it('detects def methods', () => {
    const result = parseFile('user.rb', `
def greet
  "hello"
end

def save!
  db.save
end

def valid?
  !name.nil?
end
    `)
    const names = result.functions.map(f => f.name)
    expect(names).toContain('greet')
    expect(names).toContain('save!')
    expect(names).toContain('valid?')
  })
})

// ─── C/C++ ────────────────────────────────────────────────────────────────────

describe('parseFile — C/C++', () => {
  it('detects #include directives', () => {
    const result = parseFile('main.c', `
#include <stdio.h>
#include <stdlib.h>
#include "myheader.h"
    `)
    const texts = result.imports.map(i => i.text)
    // The parser replaces '.' with '/' in import text (e.g. stdio.h → stdio/h)
    expect(texts).toContain('stdio/h')
    expect(texts).toContain('stdlib/h')
    expect(texts).toContain('myheader/h')
  })

  it('detects class declarations in C++', () => {
    const result = parseFile('engine.cpp', `
class RenderEngine {
public:
    void render();
};
struct Point { float x; float y; };
    `)
    const names = result.classes.map(c => c.name)
    expect(names).toContain('RenderEngine')
    expect(names).toContain('Point')
  })
})

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('parseFile — edge cases', () => {
  it('handles empty file', () => {
    const result = parseFile('empty.js', '')
    expect(result.lines_of_code).toBe(1) // split('') gives ['']
    expect(result.functions).toHaveLength(0)
    expect(result.imports).toHaveLength(0)
  })

  it('deduplicates repeated imports', () => {
    const result = parseFile('app.js', `
      import React from 'react'
      import React from 'react'
    `)
    const reactImports = result.imports.filter(i => i.text === 'react')
    expect(reactImports).toHaveLength(1)
  })

  it('deduplicates repeated function names', () => {
    const result = parseFile('app.js', `
      function process() {}
      function process() {}
    `)
    const processCount = result.functions.filter(f => f.name === 'process').length
    expect(processCount).toBe(1)
  })

  it('records start_line for functions', () => {
    const result = parseFile('app.js', 'const a = 1\nfunction myFn() {}')
    const fn = result.functions.find(f => f.name === 'myFn')
    expect(fn).toBeDefined()
    expect(fn.start_line).toBe(2)
  })

  it('returns language in result', () => {
    const result = parseFile('script.py', 'x = 1')
    expect(result.language).toBe('python')
  })

  it('base complexity is at least 1', () => {
    const result = parseFile('trivial.js', 'const x = 1')
    expect(result.complexity).toBeGreaterThanOrEqual(1)
  })
})
