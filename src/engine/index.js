/**
 * @fileoverview Engine barrel export - Core analysis and data processing
 * @module @engine
 */

export { default as ClientAnalyzer } from './ClientAnalyzer'

// Graph algorithms
export { default as NativeGraph } from './graph/NativeGraph'
export { default as graphEngine } from './graph/graphEngine'
export { default as layoutEngine } from './graph/layoutEngine'
export { louvain } from './graph/louvain'
export { mergeCommunitiesAggressively, mergeCommunities } from './graph/communityMerger'
export { buildDependencyGraph } from './graph/dependencyBuilder'
export { generateDistricts } from './graph/districtGenerator'

// Parser
export { analyzeCode, detectLanguage, SUPPORTED_LANGUAGES } from './parser/regexParser'

// File System
export { ingestZipballToVfs, readFileFromVfs, searchVfsEngine, setVfsProgressCallback } from './fs/vfs'
export { FileSystemAdapter } from './fs/fileSystemAdapter'

// API
export { GitHubAPI } from './api/githubApi'
