import React from 'react'

export default class CityErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error("3D Engine Crash:", error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: '#0f172a', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', color: '#ef4444',
                    fontFamily: 'sans-serif', zIndex: 9999
                }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️ VISUAL SYSTEM FAILURE</h2>
                    <p style={{ fontFamily: 'monospace', maxWidth: '600px', background: '#1e293b', padding: '1rem', borderRadius: '4px' }}>
                        {this.state.error?.message || "Unknown WebGL Error"}
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false })
                            window.location.reload()
                        }}
                        style={{
                            marginTop: '2rem', padding: '12px 24px', background: '#ef4444',
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                            fontSize: '1rem', fontWeight: 'bold'
                        }}
                    >
                        REBOOT SYSTEM
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
