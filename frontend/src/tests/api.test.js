import { beforeEach, expect, test, vi } from 'vitest'
import { createSession, joinSession, previewRoute, submitRoute, ApiError } from '../services/api'

beforeEach(() => {
  global.fetch = vi.fn()
})

test('createSession posts to /api/sessions', async () => {
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ sessionId: 's1', status: 'WAITING' }) })
  const res = await createSession()
  expect(fetch).toHaveBeenCalledWith('/api/sessions', expect.objectContaining({ method: 'POST' }))
  expect(res.sessionId).toBe('s1')
})

test('joinSession sends displayName', async () => {
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ player: { id: 'p1' }, state: {} }) })
  await joinSession('s1', 'Alice')
  expect(fetch).toHaveBeenCalledWith('/api/sessions/s1/players', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ displayName: 'Alice' }),
  }))
})

test('error response is surfaced as ApiError with backend message', async () => {
  fetch.mockResolvedValue({ ok: false, status: 409, json: async () => ({ status: 409, message: 'session is full' }) })
  await expect(joinSession('s1', 'Eve')).rejects.toMatchObject({ status: 409, message: 'session is full' })
})

test('previewRoute posts path to the preview endpoint without mutating state', async () => {
  const estimate = { valid: true, estimatedLatencyMs: 12, packetLossRisk: 'LOW', warnings: [], estimatedScoreRange: { min: 120, max: 120 } }
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => estimate })
  const res = await previewRoute('s1', { playerId: 'p1', packetFlowId: 'pkt1', path: ['A', 'B'] })
  expect(fetch).toHaveBeenCalledWith('/api/sessions/s1/routes/preview', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ playerId: 'p1', packetFlowId: 'pkt1', path: ['A', 'B'] }),
  }))
  expect(res.packetLossRisk).toBe('LOW')
})

test('submitRoute sends only playerId, packetFlowId and path (no score/latency)', async () => {
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ packetStatus: 'DELIVERED', latencyMs: 4, scoreDelta: 120 }) })
  // A caller could pass extra fields; the client must not forward score/latency/result.
  await submitRoute('s1', { playerId: 'p1', packetFlowId: 'pkt1', path: ['A', 'B'], score: 99999, latencyMs: 1 })
  const [, options] = fetch.mock.calls[0]
  expect(fetch.mock.calls[0][0]).toBe('/api/sessions/s1/actions/route')
  expect(JSON.parse(options.body)).toEqual({ playerId: 'p1', packetFlowId: 'pkt1', path: ['A', 'B'] })
})

test('network failure becomes a friendly ApiError', async () => {
  fetch.mockRejectedValue(new TypeError('failed to fetch'))
  await expect(createSession()).rejects.toBeInstanceOf(ApiError)
})
