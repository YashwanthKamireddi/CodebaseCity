/**
 * VS Code Sync Hook
 * Handles bidirectional communication between Codebase City and VS Code
 */

import { useEffect, useRef, useCallback } from 'react'
import useStore from '../store/useStore'

const WS_URL = 'ws://localhost:8000/ws/frontend'

export function useVSCodeSync() {
    const wsRef = useRef(null)
    const reconnectTimer = useRef(null)
    const {
        selectBuilding,
        cityData,
        setHoveredBuilding,
        setVSCodeConnected
    } = useStore()

    // Find building by file path
    const findBuildingByPath = useCallback((path) => {
        if (!cityData?.buildings) return null

        // Normalize path for comparison
        const normalizedPath = path.replace(/\\/g, '/')

        return cityData.buildings.find(b => {
            const buildingPath = b.path?.replace(/\\/g, '/') || ''
            return buildingPath.endsWith(normalizedPath) ||
                   normalizedPath.endsWith(buildingPath) ||
                   buildingPath === normalizedPath
        })
    }, [cityData])

    // Send message to WebSocket
    const send = useCallback((type, payload) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, payload }))
        }
    }, [])

    // Notify VS Code when a building is selected
    const notifyBuildingSelected = useCallback((building) => {
        if (building) {
            send('building_selected', {
                id: building.id,
                path: building.path,
                name: building.name
            })
        }
    }, [send])

    // Notify VS Code when hovering a building
    const notifyBuildingHovered = useCallback((building) => {
        if (building) {
            send('building_hovered', {
                id: building.id,
                path: building.path
            })
        }
    }, [send])

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        try {
            wsRef.current = new WebSocket(WS_URL)

            wsRef.current.onopen = () => {
                console.log('Connected to Codebase City sync server')
                // Request current state
                send('request_sync', {})
                // Notify that city is loaded
                if (cityData) {
                    send('city_loaded', {
                        name: cityData.name,
                        buildingCount: cityData.buildings?.length
                    })
                }
            }

            wsRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data)
                    handleMessage(message)
                } catch (e) {
                    console.error('Failed to parse sync message:', e)
                }
            }

            wsRef.current.onclose = () => {
                console.log('Disconnected from sync server')
                setVSCodeConnected?.(false)
                scheduleReconnect()
            }

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error)
            }

        } catch (error) {
            console.error('Failed to connect to sync server:', error)
            scheduleReconnect()
        }
    }, [cityData, send])

    // Handle incoming messages
    const handleMessage = useCallback((message) => {
        const { type, payload } = message

        switch (type) {
            case 'vscode_connected':
                console.log('VS Code connected:', payload.workspace)
                setVSCodeConnected?.(true)
                break

            case 'vscode_disconnected':
                console.log('VS Code disconnected')
                setVSCodeConnected?.(false)
                break

            case 'highlight_building':
                // VS Code wants to highlight a building
                const building = findBuildingByPath(payload.path)
                if (building) {
                    selectBuilding(building)
                    // Optionally scroll/fly to building
                    window.dispatchEvent(new CustomEvent('flyToBuilding', {
                        detail: { building }
                    }))
                }
                break

            case 'cursor_position':
                // VS Code cursor moved - could show line indicator
                console.log('Cursor at:', payload.path, 'line', payload.line)
                break

            case 'sync_state':
                // Received current state
                setVSCodeConnected?.(payload.vscode_connected)
                if (payload.current_file) {
                    const building = findBuildingByPath(payload.current_file)
                    if (building) {
                        setHoveredBuilding(building)
                    }
                }
                break

            default:
                console.log('Unknown sync message:', type)
        }
    }, [findBuildingByPath, selectBuilding, setHoveredBuilding, setVSCodeConnected])

    // Schedule reconnection
    const scheduleReconnect = useCallback(() => {
        if (reconnectTimer.current) return
        reconnectTimer.current = setTimeout(() => {
            reconnectTimer.current = null
            connect()
        }, 5000)
    }, [connect])

    // Connect on mount
    useEffect(() => {
        connect()

        return () => {
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current)
            }
            wsRef.current?.close()
        }
    }, [connect])

    // Reconnect when city data changes
    useEffect(() => {
        if (cityData && wsRef.current?.readyState === WebSocket.OPEN) {
            send('city_loaded', {
                name: cityData.name,
                buildingCount: cityData.buildings?.length
            })
        }
    }, [cityData, send])

    // Heartbeat to keep connection alive
    useEffect(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        const interval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                send('ping', { timestamp: Date.now() })
            }
        }, 30000)

        return () => clearInterval(interval)
    }, [send, cityData]) // Re-run if city data changes (connection refresh) or just on mount/connection state?
    // Actually best to tie to connection status, but we don't track it deeply here yet.

    return {
        notifyBuildingSelected,
        notifyBuildingHovered,
        isConnected: wsRef.current?.readyState === WebSocket.OPEN
    }
}

export default useVSCodeSync
