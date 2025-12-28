import React from 'react'
import useStore from '../store/useStore'

export default function LoadingScreen() {
    const { analysisProgress } = useStore()

    return (
        <div className="loading-overlay">
            <div className="loading-spinner" />
            <div className="loading-text">Building your city...</div>
            {analysisProgress > 0 && analysisProgress < 100 && (
                <div className="loading-progress">
                    <div
                        className="loading-progress-bar"
                        style={{
                            width: `${analysisProgress}%`,
                            animation: 'none'
                        }}
                    />
                </div>
            )}
        </div>
    )
}
