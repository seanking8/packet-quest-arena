import { useState, useEffect } from 'react'

// Polls the REST game-state endpoint. When real-time updates (story 15) land,
// only this hook changes - swap polling for a WebSocket.
export default function useGameState(sessionId) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    let active = true

    async function fetchState() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/state`)
        if (!res.ok) throw new Error(`State request failed (${res.status})`)
        const data = await res.json()
        if (active) { setState(data); setError(null) }
      } catch (e) {
        if (active) setError(e.message)
      }
    }

    fetchState()                         // fetch immediately
    const interval = setInterval(fetchState, 2000)  // then every 2s
    return () => { active = false; clearInterval(interval) }
  }, [sessionId])

  return { state, error }
}