import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Mock the API module the hook depends on.
vi.mock('../services/api', () => ({
  getState: vi.fn(),
}))
import { getState } from '../services/api'
import useGameState from '../hooks/useGameState'

// Minimal WebSocket stub we can drive in tests.
class FakeWS {
  constructor() { FakeWS.instances.push(this); this.readyState = 0 }
  close() { this.readyState = 3; this.onclose && this.onclose() }
}
FakeWS.instances = []

beforeEach(() => {
  FakeWS.instances = []
  globalThis.WebSocket = FakeWS
  getState.mockReset()
})
afterEach(() => { vi.useRealTimers() })

describe('useGameState', () => {
  test('returns null state for no sessionId', () => {
    const { result } = renderHook(() => useGameState(null))
    expect(result.current.state).toBeNull()
  })

  test('seeds state from the initial getState snapshot', async () => {
    getState.mockResolvedValue({ status: 'WAITING', players: [] })
    const { result } = renderHook(() => useGameState('s1'))
    await waitFor(() => expect(result.current.state).toEqual({ status: 'WAITING', players: [] }))
    expect(getState).toHaveBeenCalledWith('s1')
  })

  test('applies a websocket message over the current state', async () => {
    getState.mockResolvedValue({ status: 'WAITING' })
    const { result } = renderHook(() => useGameState('s1'))
    await waitFor(() => expect(result.current.state).toBeTruthy())
    const ws = FakeWS.instances[0]
    act(() => { ws.onopen() })
    expect(result.current.transport).toBe('websocket')
    act(() => { ws.onmessage({ data: JSON.stringify({ status: 'ACTIVE' }) }) })
    expect(result.current.state.status).toBe('ACTIVE')
  })

  test('flags notFound when the initial fetch 404s', async () => {
    getState.mockRejectedValue(Object.assign(new Error('gone'), { status: 404 }))
    const { result } = renderHook(() => useGameState('s1'))
    await waitFor(() => expect(result.current.notFound).toBe(true))
    expect(result.current.error).toBe('gone')
  })
})
