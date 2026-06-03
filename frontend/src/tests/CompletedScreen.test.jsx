import { expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

test('match timeline is hidden until toggled, then shows the saved report', async () => {
  render(<GameProvider><CompletedScreen state={STATE} /></GameProvider>)

  expect(screen.getByText('Final scores')).toBeInTheDocument()
  // The same-difficulty leaderboard stays visible; the timeline starts hidden.
  expect(await screen.findByText('Hard leaderboard')).toBeInTheDocument()
  expect(screen.queryByText('Match timeline')).not.toBeInTheDocument()

  // Player opts in to view the timeline.
  fireEvent.click(screen.getByRole('button', { name: 'Show match timeline' }))

  expect(await screen.findByText('Match timeline')).toBeInTheDocument()
  expect(screen.getByText(/Alice won with 140 points/)).toBeInTheDocument()
  expect(screen.getByText(/Alice routed packet/)).toBeInTheDocument()
  expect(screen.getByText(/best 140 pts/)).toBeInTheDocument()

  // And it can be collapsed again.
  fireEvent.click(screen.getByRole('button', { name: 'Hide match timeline' }))
  expect(screen.queryByText('Match timeline')).not.toBeInTheDocument()
})
