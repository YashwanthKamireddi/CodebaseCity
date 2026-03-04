import { create } from 'zustand'
import { createCitySlice } from './slices/createCitySlice'
import { createUISlice } from './slices/createUISlice'
import { createInteractionSlice } from './slices/createInteractionSlice'
import { createTimeSlice } from './slices/createTimeSlice'
import { createIntelligenceSlice } from './slices/createIntelligenceSlice'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const useStore = create((set, get) => ({
    ...createCitySlice(set, get),
    ...createUISlice(set, get),
    ...createInteractionSlice(set, get),
    ...createTimeSlice(set, get),
    ...createIntelligenceSlice(set, get),

    // Direct Ref for Performance (avoiding React re-renders)
    cityMeshRef: { current: null }, // Accessed by CameraController

    // Chat State (Pending Phase 1.1 Move)
    messages: [],
    chatLoading: false,
    agentStatus: 'idle', // 'idle' | 'thinking' | 'analyzing' | 'writing'

    sendMessage: async (content) => {
        const { messages, cityData, selectedBuilding } = get()

        const userMessage = { role: 'user', content }
        set({
            messages: [...messages, userMessage],
            chatLoading: true,
            agentStatus: 'thinking'
        })

        try {
            set({ agentStatus: 'analyzing' })
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    context: {
                        current_building: selectedBuilding?.id,
                        city_stats: cityData?.stats
                    },
                    history: messages.slice(-6)
                })
            })

            if (!response.ok) throw new Error('Chat failed')

            const data = await response.json()
            set((state) => ({
                messages: [...state.messages, { role: 'assistant', content: data.message }],
                chatLoading: false,
                agentStatus: 'idle'
            }))
        } catch (error) {
            set((state) => ({
                messages: [...state.messages, {
                    role: 'assistant',
                    content: 'Unable to connect to the AI assistant. Please ensure the backend server is running.'
                }],
                chatLoading: false,
                agentStatus: 'idle'
            }))
        }
    }
}))

export default useStore
