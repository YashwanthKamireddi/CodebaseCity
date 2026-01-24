import React, { useEffect } from 'react'
import useStore from '../store/useStore'
import CodeViewer from './CodeViewer'
import { FileCode2 } from 'lucide-react'

export default function CodePage() {
    const { fetchFileContent, setCityData } = useStore()

    useEffect(() => {
        // Parse params
        const params = new URLSearchParams(window.location.search)
        const path = params.get('path')
        const repo = params.get('repo')
        const name = params.get('name')
        const loc = params.get('loc') || 0

        if (repo) {
            // Hydrate store with minimal data needed for fetching
            setCityData({ path: repo })
        }

        if (path) {
            fetchFileContent(path)
        }
    }, [])

    const params = new URLSearchParams(window.location.search)
    const buildingStub = {
        path: params.get('path'),
        metrics: { loc: params.get('loc') }
    }

    // Force show CodeViewer in 'standalone' mode (no close button needed strictly, but good for UI)
    return (
        <div style={{ width: '100vw', height: '100vh', background: '#09090b', color: 'white' }}>
            <CodeViewer
                building={buildingStub}
                onClose={() => window.close()}
                isStandalone={true}
            />
        </div>
    )
}
