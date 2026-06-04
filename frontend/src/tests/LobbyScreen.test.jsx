import { afterEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

const game = vi.hoisted(() => ({
  sessionId: 'sess-12345678',
  playerId: 'p1',
  start: vi.fn(),
  leave: vi.fn(),
  error: null,
  setError: vi.fn(),
  busy: false,
}))
vi.mock('../state/GameContext', () => ({ useGame: () => game }))

const { default: LobbyScreen } = await import('../screens/LobbyScreen')

const STATE = {
  difficulty: 'MEDIUM',
  players: [
    { id: 'p1', displayName: 'Alice', color: 'blue' },
    { id: 'p2', displayName: 'Bob', color: 'green' },
  ],
}

afterEach(() => {
  cleanup()
  game.playerId = 'p1'
  game.busy = false
  game.start.mockClear()
  game.leave.mockClear()
})

test('host sees Start, and the map chooser lists City and District (art reads DISTRICT, not MAP)', () => {
  render(<LobbyScreen state={STATE} />)
  fireEvent.click(screen.getByRole('button', { name: 'Start match' }))

  expect(screen.getByText('City map')).toBeInTheDocument()
  expect(screen.getByText('District map')).toBeInTheDocument()
  expect(screen.getByText('DISTRICT')).toBeInTheDocument()
  expect(screen.queryByText('MAP')).not.toBeInTheDocument()
})

test('choosing the District map starts the match with that family', () => {
  render(<LobbyScreen state={STATE} />)
  fireEvent.click(screen.getByRole('button', { name: 'Start match' }))
  fireEvent.click(screen.getByText('District map').closest('button'))
  expect(game.start).toHaveBeenCalledWith('DISTRICT')
})

test('only the host (first player) can start — others see a waiting message', () => {
  game.playerId = 'p2'
  render(<LobbyScreen state={STATE} />)
  expect(screen.queryByRole('button', { name: 'Start match' })).not.toBeInTheDocument()
  expect(screen.getByText(/Waiting for the host/)).toBeInTheDocument()
})

test('the host cannot start with fewer than two players', () => {
  render(<LobbyScreen state={{ ...STATE, players: [STATE.players[0]] }} />)
  expect(screen.getByRole('button', { name: 'Need 2+ players' })).toBeDisabled()
})

test('leaving the lobby calls leave()', () => {
  render(<LobbyScreen state={STATE} />)
  fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
  expect(game.leave).toHaveBeenCalled()
})
