import React from 'react'
import useStore from '../../../store/useStore'
import { AlertTriangle } from 'lucide-react'

export class CanvasErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error("Canvas Crash:", error, errorInfo)
    }

    componentDidMount() {
        // Listen for WebGL Context Loss (Browser event)
        window.addEventListener('webglcontextlost', this.handleContextLost)
    }

    componentWillUnmount() {
        window.removeEventListener('webglcontextlost', this.handleContextLost)
    }

    handleContextLost = (event) => {
        event.preventDefault()
        console.warn("WebGL Context Lost!")
        this.setState({
            hasError: true,
            error: new Error("GPU Connection Lost (WebGL Context Lost)")
        })

        // Auto-switch to List Mode via store if available
        // We can't use hooks in Class components easily without wrapping,
        // so we trust the fallback UI to guide the user.
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: '#09090b',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#e4e4e7',
                    padding: '32px',
                    textAlign: 'center'
                }}>
                    <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Rendering Engine Failed</h2>
                    <p style={{ color: '#a1a1aa', maxWidth: '400px', marginBottom: '24px' }}>
                        The 3D City visualization crashed or lost connection to your GPU.
                        This often happens if the browser runs out of video memory.
                    </p>

                    <button
                        onClick={() => {
                            // Manual Recovery Attempt
                            this.setState({ hasError: false })
                            window.location.reload()
                        }}
                        style={{
                            padding: '12px 24px',
                            background: '#27272a',
                            border: '1px solid #3f3f46',
                            color: 'white',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Reload Application
                    </button>

                    <div style={{ marginTop: '32px', fontSize: '0.8rem', opacity: 0.5 }}>
                        Error: {this.state.error?.message || 'Unknown WebGL Error'}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
