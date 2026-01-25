import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from 'd3-force-3d'

let simulation = null

self.onmessage = (e) => {
    const { type, nodes, links, config } = e.data

    if (type === 'start') {
        const { strength, distance } = config || { strength: -400, distance: 100 }

        // Initialize Nodes
        // d3-force mutates objects, so we work on copies if needed, but worker memory is isolated.
        const simulationNodes = nodes.map(n => ({
            id: n.id,
            r: n.radius || 10,
            x: n.x || (Math.random() - 0.5) * 100, // Initial scatter
            y: n.y || (Math.random() - 0.5) * 100,
            z: n.z || (Math.random() - 0.5) * 100
        }))

        const simulationLinks = links.map(l => ({
            source: l.source,
            target: l.target,
            value: l.weight || 1
        }))

        // Stop previous
        if (simulation) simulation.stop()

        console.log('[PhysicsWorker] Starting Galaxy Simulation', { nodes: nodes.length })

        simulation = forceSimulation(simulationNodes, 3)
            .force('charge', forceManyBody().strength(strength))
            .force('link', forceLink(simulationLinks).id(d => d.id).distance(distance))
            .force('center', forceCenter(0, 0, 0))
            .force('collide', forceCollide(d => d.r * 1.5))
            .alphaMin(0.01)
            .on('tick', () => {
                // Send buffers back (Transferable objects for perf)
                // We send a flat Float32Array: [x1, y1, z1, x2, y2, z2...]
                const positions = new Float32Array(simulationNodes.length * 3)
                for (let i = 0; i < simulationNodes.length; i++) {
                    const n = simulationNodes[i]
                    positions[i * 3] = n.x
                    positions[i * 3 + 1] = n.y
                    positions[i * 3 + 2] = n.z
                }

                self.postMessage({ type: 'tick', positions }, [positions.buffer])
            })
            .on('end', () => {
                 self.postMessage({ type: 'end' })
            })
    }

    if (type === 'stop') {
        if (simulation) simulation.stop()
    }
}
