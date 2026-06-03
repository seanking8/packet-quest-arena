import { expect, test } from 'vitest'
import { buildGameWebSocketUrl } from '../hooks/useGameState'

test('builds WebSocket URL from the frontend origin', () => {
  const locationLike = { protocol: 'http:', host: '192.168.1.23:3000' }
  expect(buildGameWebSocketUrl('session-123', locationLike)).toBe('ws://192.168.1.23:3000/ws/game/session-123')
})

test('uses secure WebSocket when frontend is served over https', () => {
  const locationLike = { protocol: 'https:', host: 'demo.example.com' }
  expect(buildGameWebSocketUrl('session 123', locationLike)).toBe('wss://demo.example.com/ws/game/session%20123')
})
