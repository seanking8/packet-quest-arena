const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const createSession = (playerName) =>
  request('/sessions', { method: 'POST', body: JSON.stringify({ playerName }) })

export const joinSession = (sessionId, playerName) =>
  request(`/sessions/${sessionId}/join`, { method: 'POST', body: JSON.stringify({ playerName }) })

export const submitAction = (sessionId, action) =>
  request(`/sessions/${sessionId}/actions`, { method: 'POST', body: JSON.stringify(action) })
