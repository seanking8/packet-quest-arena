const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`)
  return data
}

export const createSession = (playerName) =>
    request('/sessions', { method: 'POST', body: JSON.stringify({ playerName }) })

export const joinSession = (joinCode, playerName) =>
    request(`/sessions/${joinCode}/join`, { method: 'POST', body: JSON.stringify({ playerName }) })

export const routeFlow = (sessionId, playerId, flowId, path) =>
    request(`/sessions/${sessionId}/actions/route`, {
      method: 'POST',
      body: JSON.stringify({ playerId, flowId, path }),
    })