import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNow } from '../lib/useNow'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('returns the current time and advances on its interval', () => {
  const start = 1_000_000
  vi.setSystemTime(start)
  const { result } = renderHook(() => useNow(1000))
  expect(result.current).toBe(start)

  // advancing the fake clock fires the interval, which reads Date.now()
  act(() => vi.advanceTimersByTime(1000))
  expect(result.current).toBe(start + 1000)
})

test('stops ticking after unmount (no leaked interval)', () => {
  const { unmount } = renderHook(() => useNow(500))
  unmount()
  // advancing time after unmount must not throw / update a stale hook
  act(() => vi.advanceTimersByTime(2000))
})
