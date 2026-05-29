// REST client for the Packet Quest Arena backend.
// The backend is authoritative; the client only sends actions and reads state.

const BASE = '/api'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new ApiError(0, 'Backend unavailable — is the server running on :8080?')
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body && body.message) message = body.message
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return null
  return res.json()
}

/** POST /api/sessions -> { sessionId, status } */
export const createSession = () => request('/sessions', { method: 'POST' })

/** POST /api/sessions/{id}/players -> { player, state } */
export const joinSession = (sessionId, displayName) =>
  request(`/sessions/${sessionId}/players`, {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  })

/** POST /api/sessions/{id}/start -> GameStateDto */
export const startMatch = (sessionId) =>
  request(`/sessions/${sessionId}/start`, { method: 'POST' })

/** GET /api/sessions/{id}/state -> GameStateDto */
export const getState = (sessionId) => request(`/sessions/${sessionId}/state`)

/** POST /api/sessions/{id}/actions/route -> RouteResultResponse */
export const submitRoute = (sessionId, { playerId, packetFlowId, path }) =>
  request(`/sessions/${sessionId}/actions/route`, {
    method: 'POST',
    body: JSON.stringify({ playerId, packetFlowId, path }),
  })

/** POST /api/sessions/{id}/tick -> GameStateDto */
export const tick = (sessionId) =>
  request(`/sessions/${sessionId}/tick`, { method: 'POST' })
