import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameProvider } from '../state/GameContext'
import CompletedScreen from '../screens/CompletedScreen'

vi.mock('../services/api', () => ({
  getMatchReport: vi.fn().mockResolvedValue({
    sessionId: 's1',
    status: 'COMPLETED',
    difficulty: 'HARD',
    mapFamily: 'CITY',
    playerCount: 2,
    packetFlowCount: 2,
    deliveredPackets: 2,
    droppedPackets: 1,
    totalScore: 140,
    winnerName: 'Alice',
    winnerScore: 140,
    routeActions: 3,
    incidentEvents: 1,
    averageLatencyMs: 92,
    highlight: 'Alice won with 140 points after 2 deliveries.',
    updatedAt: '2026-06-03T12:00:00Z',
    players: [],
    timeline: [
      {
        at: '2026-06-03T11:59:20Z',
        type: 'ROUTE',
        actor: 'Alice',
        subjectId: 'flow-1',
        summary: 'Alice routed packet flow-1 and got delivered (+110 pts, 92 ms).',
      },
    ],
  }),
  getPersistentLeaderboard: vi.fn().mockResolvedValue([
    {
      playerName: 'Alice',
      totalScore: 140,
      wins: 1,
      matches: 1,
      deliveredPackets: 2,
      droppedPackets: 0,
      bestScore: 140,
      averageScore: 140,
    },
  ]),
}))

const STATE = {
  sessionId: 's1',
  status: 'COMPLETED',
  difficulty: 'HARD',
  players: [
    { id: 'p1', displayName: 'Alice', color: '#20d0be', score: 140, deliveredPackets: 2, droppedPackets: 0 },
    { id: 'p2', displayName: 'Bob', color: '#ffb454', score: 40, deliveredPackets: 0, droppedPackets: 1 },
  ],
}

test('completed screen shows database report and same-difficulty leaderboard', async () => {
  render(<GameProvider><CompletedScreen state={STATE} /></GameProvider>)

  expect(screen.getByText('Final scores')).toBeInTheDocument()
  expect(await screen.findByText('Database report')).toBeInTheDocument()
  expect(await screen.findByText('Hard leaderboard')).toBeInTheDocument()
  expect(screen.getByText(/Alice won with 140 points/)).toBeInTheDocument()
  expect(screen.getByText(/Alice routed packet/)).toBeInTheDocument()
  expect(screen.getByText(/best 140 pts/)).toBeInTheDocument()
})
