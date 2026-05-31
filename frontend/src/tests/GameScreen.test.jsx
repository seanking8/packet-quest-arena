import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameProvider } from '../state/GameContext'
import GameScreen from '../screens/GameScreen'

// The 3D scene needs WebGL, which jsdom lacks — stub it for HUD/state tests.
vi.mock('../components/map/NetworkScene', () => ({
  default: ({ state }) => <div data-testid="scene">scene:{state.nodes.length}</div>,
}))

const STATE = {
  sessionId: 's1',
  status: 'ACTIVE',
  remainingSeconds: 125,
  players: [
    { id: 'p1', displayName: 'Alice', color: 'blue', score: 30 },
    { id: 'p2', displayName: 'Bob', color: 'green', score: 10 },
  ],
  nodes: [{ id: 'n1' }, { id: 'n2' }],
  links: [{ id: 'l1' }],
  packetFlows: [
    {
      id: 'f1',
      ownerPlayerId: null,
      trafficType: 'VIDEO',
      sourceNodeId: 'a',
      destinationNodeId: 'b',
      status: 'PENDING',
      deadlineSeconds: 90,
      createdAt: '2026-05-31T12:00:00.000Z',
      expiresAt: '2026-05-31T12:01:00.000Z',
    },
  ],
  incidents: [],
  mapObjects: [],
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

const renderGame = () =>
  render(<GameProvider><GameScreen state={STATE} transport="websocket" /></GameProvider>)

test('shows timer, counts and leaderboard from backend state', () => {
  renderGame()
  expect(screen.getByText('⏱ 2:05')).toBeInTheDocument()
  expect(screen.getByText(/2 nodes · 1 links · 1 packets · 0 incidents/)).toBeInTheDocument()
  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('Bob')).toBeInTheDocument()
})

test('mounts the network scene with backend nodes', () => {
  renderGame()
  expect(screen.getByTestId('scene')).toHaveTextContent('scene:2')
})

test('toggling the Jobs panel hides it', () => {
  renderGame()
  expect(screen.getByText(/Your packet jobs/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Jobs' }))
  expect(screen.queryByText(/Your packet jobs/i)).not.toBeInTheDocument()
})

test('packet jobs show a visual deadline countdown', () => {
  renderGame()
  expect(screen.getByRole('progressbar', { name: /packet deadline/i })).toBeInTheDocument()
  expect(screen.getByText('60s left')).toBeInTheDocument()
})
