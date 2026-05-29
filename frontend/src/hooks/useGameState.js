import { useEffect, useState } from 'react'
import { getState } from '../services/api'

/**
 * Subscribes to a session's authoritative game state.
 *
 * Primary transport is the backend WebSocket (broadcast-only). If it fails to
 * open or drops, we fall back to polling GET /state every 1.5s. Either way the
 * client never mutates state — it only renders what the backend sends.
 *
 * @returns {{ state: object|null, transport: string, error: string|null }}
 */
export default function useGameState(sessionId) {
  const [state, setState] = useState(null)
  const [transport, setTransport] = useState('connecting')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) return undefined

    let active = true
    let ws
    let pollTimer

    const apply = (next) => {
      if (active) setState(next)
    }

    const startPolling = () => {
      if (pollTimer || !active) return
      setTransport('polling')
      const fetchState = () =>
        getState(sessionId)
          .then(apply)
          .catch((e) => active && setError(e.message))
      fetchState()
      pollTimer = setInterval(fetchState, 1500)
    }

    // Seed with an initial snapshot regardless of transport.
    getState(sessionId).then(apply).catch(() => {})

    try {
      const host = window.location.hostname || 'localhost'
      ws = new WebSocket(`ws://${host}:8080/ws/game/${sessionId}`)
      ws.onopen = () => active && setTransport('websocket')
      ws.onmessage = (event) => {
        try {
          apply(JSON.parse(event.data))
        } catch {
          /* ignore malformed frame */
        }
      }
      ws.onerror = () => {
        try {
          ws.close()
        } catch {
          /* noop */
        }
      }
      ws.onclose = () => startPolling()
    } catch {
      startPolling()
    }

    return () => {
      active = false
      if (ws) try { ws.close() } catch { /* noop */ }
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [sessionId])

  return { state, transport, error }
}
