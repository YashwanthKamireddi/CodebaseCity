/**
 * GraphNavigator.js
 *
 * Client-side pathfinding for Dependency GPS.
 * Performs weighted BFS/Dijkstra on the city dependency graph.
 */

export class GraphNavigator {
    constructor(cityData) {
        this.nodes = new Map() // id -> { id, neighbors: [] }
        this.edges = cityData.roads || []

        // Build Adjacency List
        if (cityData.buildings) {
            cityData.buildings.forEach(b => {
                this.nodes.set(b.id, { id: b.id, neighbors: [] })
            })
        }

        this.edges.forEach(edge => {
            const source = this.nodes.get(edge.source)
            const target = this.nodes.get(edge.target)

            // Directed Graph (Dependency Flow)
            if (source && target) {
                source.neighbors.push(target.id)
            }
        })
    }

    /**
     * Find shortest path between source and target IDs
     * Uses BFS for unweighted shortest path
     */
    findPath(startId, endId) {
        if (!this.nodes.has(startId) || !this.nodes.has(endId)) return null

        const queue = [[startId]]
        const visited = new Set([startId])

        while (queue.length > 0) {
            const path = queue.shift()
            const node = path[path.length - 1]

            if (node === endId) return path

            const neighbors = this.nodes.get(node)?.neighbors || []

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor)
                    queue.push([...path, neighbor])
                }
            }
        }

        return null // No path found
    }
}
