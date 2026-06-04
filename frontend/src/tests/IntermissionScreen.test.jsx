import { afterEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

const game = vi.hoisted(() => ({
  playerId: 'p1',
  advanceRound: vi.fn(),
  busy: false,
  error: null,
  setError: vi.fn(),
  leave: vi.fn(),
}))
vi.mock('../state/GameContext', () => ({ useGame: () => game }))

const { default: IntermissionScreen } = await import('../screens/IntermissionScreen')

const STATE = {
  currentRound: 1,
  totalRounds: 3,
  players: [
    { id: 'p1', displayName: 'Alice', color: 'blue', score: 30, deliveredPackets: 2, droppedPackets: 0 },
    { id: 'p2', displayName: 'Bob', color: 'green', score: 10, deliveredPackets: 1, droppedPackets: 1 },
  ],
}

afterEach(() => {
  cleanup()
  game.playerId = 'p1'
  game.advanceRound.mockClear()
  game.leave.mockClear()
})

test('shows standings and the next-round preview', () => {
  render(<IntermissionScreen state={STATE} />)
  expect(screen.getByText('Round 1 complete')).toBeInTheDocument()
  expect(screen.getByText(/Alice/)).toBeInTheDocument() // rendered as "Alice (you)"
  expect(screen.getByText(/Rush Hour/)).toBeInTheDocument() // round 2 preview theme
})

test('the host can start the next round, and anyone can leave', () => {
  render(<IntermissionScreen state={STATE} />)
  fireEvent.click(screen.getByRole('button', { name: /Start Round 2/ }))
  expect(game.advanceRound).toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Leave game' }))
  expect(game.leave).toHaveBeenCalled()
})

test('non-host waits for the host but still has a Leave button', () => {
  game.playerId = 'p2'
  render(<IntermissionScreen state={STATE} />)
  expect(screen.queryByRole('button', { name: /Start Round/ })).not.toBeInTheDocument()
  expect(screen.getByText(/Waiting for the host/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Leave game' })).toBeInTheDocument()
})
