import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { GameProvider } from '../state/GameContext'
import GameScreen from '../screens/GameScreen'
import { submitRoute } from '../services/api'

/**
 * Basic end-to-end gameplay test (frontend).
 *
 * Drives the real in-game UI through one full gameplay loop, exercising the
 * same components wired together that a player uses:
 *   1. traffic (a packet job) is shown to the player,
 *   2. the player selects the packet,
 *   3. the player builds a route by clicking connected map nodes,
 *   4. the player submits the routing action (client sends ONLY the path/ids —
 *      never a score, so the backend stays authoritative),
 *   5. the resolved authoritative state flows back into the UI: the score
 *      changes and the packet is no longer pending.
 *
 * The 3D/2D map needs WebGL, which jsdom lacks, so the map component is mocked
 * to expose clickable nodes — letting the test click nodes like a real player.
 * The backend is mocked at the service boundary.
 */

// The city family renders CityMap2D in the jsdom (no-WebGL) tactical view.
// Mock it to surface one button per node so the test can build a route.
vi.mock('../components/map/CityMap2D', () => ({
  default: ({ state, onSelect }) => (
    <div data-testid="map">
      {(state.nodes || []).map((n) => (
        <button key={n.id} type="button" onClick={() => onSelect({ kind: 'node', data: n })}>
          map:{n.id}
        </button>
      ))}
    </div>
  ),
}))

// The other map variants are imported by GameScreen but not used here — stub
// them so their heavy WebGL/SVG modules don't load.
vi.mock('../components/map/NetworkScene', () => ({ default: () => null }))
vi.mock('../components/map/DistrictScene', () => ({ default: () => null }))
vi.mock('../components/map/TacticalMap', () => ({ default: () => null }))

// Mock the REST client. The gameplay path only calls previewRoute + submitRoute;
// the rest are stubbed so GameContext's imports resolve.
vi.mock('../services/api', () => ({
  createSession: vi.fn(),
  joinSession: vi.fn(),
  startMatch: vi.fn(),
  nextRound: vi.fn(),
  getState: vi.fn(),
  tick: vi.fn(),
  previewRoute: vi.fn().mockResolvedValue({
    valid: true,
    estimatedLatencyMs: 20,
    packetLossRisk: 'LOW',
    estimatedScoreRange: { min: 10, max: 30 },
    warnings: [],
  }),
  submitRoute: vi.fn().mockResolvedValue({
    packetStatus: 'DELIVERED',
    latencyMs: 18,
    scoreDelta: 30,
    message: 'On time',
  }),
  ApiError: class ApiError extends Error {},
}))

const buildState = (overrides = {}) => ({
  sessionId: 's1',
  status: 'ACTIVE',
  remainingSeconds: 120,
  mapFamily: 'CITY',
  players: [
    { id: 'p1', displayName: 'Alice', color: '#44aaff', score: 0 },
    { id: 'p2', displayName: 'Bob', color: '#55dd55', score: 0 },
  ],
  nodes: [
    { id: 'n_src', name: 'Source' },
    { id: 'n_dst', name: 'Dest' },
  ],
  links: [{ id: 'l1', sourceNodeId: 'n_src', targetNodeId: 'n_dst', status: 'HEALTHY' }],
  packetFlows: [
    {
      id: 'f1',
      ownerPlayerId: 'p1',
      trafficType: 'VIDEO',
      sourceNodeId: 'n_src',
      destinationNodeId: 'n_dst',
      status: 'PENDING',
    },
  ],
  incidents: [],
  mapObjects: [],
  ...overrides,
})

beforeEach(() => {
  // Seed the session identity a joined player would hold, so GameProvider
  // exposes sessionId 's1' and playerId 'p1'.
  globalThis.localStorage.setItem(
    'packetQuest.liveSession.v1',
    JSON.stringify({ sessionId: 's1', playerId: 'p1', playerName: 'Alice' })
  )
})

afterEach(() => {
  globalThis.localStorage.clear()
})

const renderGame = (state) =>
  render(
    <GameProvider>
      <GameScreen state={state} transport="websocket" />
    </GameProvider>
  )

test('plays a full gameplay loop: see a packet, route it, submit, and reflect the result', async () => {
  const { rerender } = renderGame(buildState())

  // 1. Traffic is generated and shown as one packet job for the player.
  expect(screen.getByText(/Your packet jobs/i)).toHaveTextContent('Your packet jobs (1)')
  expect(screen.getByText('VIDEO')).toBeInTheDocument()

  // 2. The player selects the packet to route it (source auto-seeds the path).
  //    Scope to the jobs panel — the TopBar also has a "Route" panel toggle.
  const jobsPanel = screen.getByText(/Your packet jobs/i).closest('section')
  fireEvent.click(within(jobsPanel).getByRole('button', { name: 'Route' }))

  // 3. The player builds the route by clicking the connected destination node.
  fireEvent.click(screen.getByRole('button', { name: 'map:n_dst' }))
  expect(screen.getByText('Source -> Dest')).toBeInTheDocument()

  // 4. The player submits — the client sends only playerId, packetFlowId and
  //    the chosen path. No score is sent; the backend computes the outcome.
  fireEvent.click(screen.getByRole('button', { name: /submit route/i }))
  await waitFor(() =>
    expect(submitRoute).toHaveBeenCalledWith('s1', {
      playerId: 'p1',
      packetFlowId: 'f1',
      path: ['n_src', 'n_dst'],
    })
  )

  // 5. The backend resolves the packet and returns updated authoritative state
  //    (delivered + new score), which flows back into the UI on the next sync.
  rerender(
    <GameProvider>
      <GameScreen
        state={buildState({
          players: [
            { id: 'p1', displayName: 'Alice', color: '#44aaff', score: 30 },
            { id: 'p2', displayName: 'Bob', color: '#55dd55', score: 0 },
          ],
          packetFlows: [
            {
              id: 'f1',
              ownerPlayerId: 'p1',
              trafficType: 'VIDEO',
              sourceNodeId: 'n_src',
              destinationNodeId: 'n_dst',
              status: 'DELIVERED',
            },
          ],
        })}
        transport="websocket"
      />
    </GameProvider>
  )

  // The score change is visible in the leaderboard, and the delivered packet is
  // no longer offered for routing (no "Route" button left in the jobs panel).
  expect(await screen.findByText('30')).toBeInTheDocument()
  const jobsPanelAfter = screen.getByText(/Your packet jobs/i).closest('section')
  expect(within(jobsPanelAfter).queryByRole('button', { name: 'Route' })).not.toBeInTheDocument()
})
