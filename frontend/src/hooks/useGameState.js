import { useState, useEffect } from 'react'

export default function useGameState(sessionId) {
  const [state, setState] = useState({ topology: null, flows: [], scores: [] })

  useEffect(() => {
    if (!sessionId) return
    const ws = new WebSocket(`ws://localhost:8080/ws/game/${sessionId}`)
    ws.onmessage = event => setState(JSON.parse(event.data))
    return () => ws.close()
  }, [sessionId])

  return state
}
