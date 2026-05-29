import { beforeEach, expect, test, vi } from 'vitest'
import { createSession, joinSession, ApiError } from '../services/api'

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

test('network failure becomes a friendly ApiError', async () => {
  fetch.mockRejectedValue(new TypeError('failed to fetch'))
  await expect(createSession()).rejects.toBeInstanceOf(ApiError)
})
