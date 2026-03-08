import { create } from 'zustand'
import { createCitySlice } from './slices/createCitySlice'
import { createUISlice } from './slices/createUISlice'
import { createInteractionSlice } from './slices/createInteractionSlice'
import { createTimeSlice } from './slices/createTimeSlice'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const useStore = create((set, get) => ({
    ...createCitySlice(set, get),
    ...createUISlice(set, get),
    ...createInteractionSlice(set, get),
    ...createTimeSlice(set, get),

    // Direct Ref for Performance (avoiding React re-renders)
    cityMeshRef: { current: null },

    // Chat State
    messages: [],
    chatLoading: false,
    chatOpen: false,
    agentStatus: 'idle',

    // User's own API key (stored in localStorage, never sent to any server)
    geminiApiKey: localStorage.getItem('codebase_city_gemini_key') || '',
    setGeminiApiKey: (key) => {
        if (key) {
            localStorage.setItem('codebase_city_gemini_key', key)
        } else {
            localStorage.removeItem('codebase_city_gemini_key')
        }
        set({ geminiApiKey: key })
    },

    sendMessage: async (content) => {
        const { messages, cityData, selectedBuilding, geminiApiKey } = get()

        if (!geminiApiKey) {
            set({
                messages: [...get().messages, {
                    role: 'user', content
                }, {
                    role: 'assistant',
                    content: 'Please set your Gemini API key first. Click the key icon in the chat header to add your API key.\n\nYou can get a free key from [Google AI Studio](https://aistudio.google.com/apikey).'
                }]
            })
            return
        }

        const userMessage = { role: 'user', content }
        set({
            messages: [...messages, userMessage],
            chatLoading: true,
            agentStatus: 'thinking'
        })

        try {
            set({ agentStatus: 'analyzing' })

            // Build context about the current city
            const context = []
            if (cityData) {
                context.push(`The user is viewing a 3D code city visualization of "${cityData.name || 'a project'}" with ${cityData.buildings?.length || 0} files and ${cityData.stats?.total_districts || 0} districts.`)
            }
            if (selectedBuilding) {
                context.push(`Currently selected file: ${selectedBuilding.name} (${selectedBuilding.file_path || selectedBuilding.path}), ${selectedBuilding.metrics?.lines || 0} lines, complexity: ${selectedBuilding.metrics?.complexity || 0}, functions: ${selectedBuilding.functions?.length || 0}`)
            }

            const systemPrompt = `You are an expert code architecture assistant integrated into Code City, a 3D codebase visualization tool. ${context.join(' ')} Help the user understand their codebase architecture, identify issues, and suggest improvements. Be concise and actionable.`

            const conversationHistory = messages.slice(-8).map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }))

            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000)

            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiApiKey
                },
                signal: controller.signal,
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [
                        ...conversationHistory,
                        { role: 'user', parts: [{ text: content }] }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                const status = response.status
                if (status === 401 || status === 403) throw new Error('Invalid API key')
                if (status === 429) throw new Error('Rate limit exceeded — try again in a minute')
                throw new Error(`Request failed (${status})`)
            }

            const data = await response.json()
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.'

            set((state) => ({
                messages: [...state.messages, { role: 'assistant', content: reply }],
                chatLoading: false,
                agentStatus: 'idle'
            }))
        } catch (error) {
            const msg = error.name === 'AbortError'
                ? 'Request timed out — the API took too long to respond.'
                : error.message
            set((state) => ({
                messages: [...state.messages, {
                    role: 'assistant',
                    content: `${msg}\n\nCheck that your API key is valid. Get one free at [Google AI Studio](https://aistudio.google.com/apikey).`
                }],
                chatLoading: false,
                agentStatus: 'idle'
            }))
        }
    }
}))

export default useStore
