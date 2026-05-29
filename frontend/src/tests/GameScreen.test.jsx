import { expect, test } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameProvider } from '../state/GameContext'
import GameScreen from '../screens/GameScreen'

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
    { id: 'f1', ownerPlayerId: 'p1', trafficType: 'VIDEO', sourceNodeId: 'a', destinationNodeId: 'b', status: 'PENDING' },
  ],
  incidents: [],
  mapObjects: [],
}

const renderGame = () =>
  render(<GameProvider><GameScreen state={STATE} transport="websocket" /></GameProvider>)

test('shows timer, counts and leaderboard from backend state', () => {
  renderGame()
  expect(screen.getByText('⏱ 2:05')).toBeInTheDocument()
  expect(screen.getByText(/2 nodes · 1 links · 1 packets · 0 incidents/)).toBeInTheDocument()
  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('Bob')).toBeInTheDocument()
})

test('shows the 3D map placeholder', () => {
  renderGame()
  expect(screen.getByText(/3D Network Map will render here/i)).toBeInTheDocument()
})

test('toggling the Jobs panel hides it', () => {
  renderGame()
  expect(screen.getByText(/Your packet jobs/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Jobs' }))
  expect(screen.queryByText(/Your packet jobs/i)).not.toBeInTheDocument()
})
