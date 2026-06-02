import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SelectedDetailPanel from '../components/hud/SelectedDetailPanel'
import LeaderboardPanel from '../components/hud/LeaderboardPanel'

describe('SelectedDetailPanel', () => {
  test('shows the empty prompt when nothing is selected', () => {
    render(<SelectedDetailPanel selected={null} onClear={() => {}} />)
    expect(screen.getByText(/click a node or link/i)).toBeInTheDocument()
  })

  test('renders node details and fires onClear', () => {
    const onClear = vi.fn()
    render(
      <SelectedDetailPanel
        selected={{ kind: 'node', data: { label: 'Core Campus', type: 'CORE', status: 'HEALTHY', packetLossRate: 0.01 } }}
        onClear={onClear}
      />
    )
    expect(screen.getByText('Core Campus')).toBeInTheDocument()
    expect(screen.getByText('CORE')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/clear/i))
    expect(onClear).toHaveBeenCalled()
  })

  test('renders link details', () => {
    render(
      <SelectedDetailPanel
        selected={{ kind: 'link', data: { linkType: 'FIBRE', status: 'BUSY', currentLoad: 50, capacity: 100, currentLatencyMs: 12 } }}
        onClear={() => {}}
      />
    )
    expect(screen.getByText('FIBRE')).toBeInTheDocument()
    expect(screen.getByText('BUSY')).toBeInTheDocument()
  })
})

describe('LeaderboardPanel', () => {
  const state = {
    players: [
      { id: 'p1', displayName: 'Alice', color: 'blue', score: 200, deliveredPackets: 2, droppedPackets: 0 },
      { id: 'p2', displayName: 'Bob', color: 'green', score: 50, deliveredPackets: 1, droppedPackets: 1 },
    ],
  }

  test('lists players ranked with scores', () => {
    render(<LeaderboardPanel state={state} playerId="p2" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })
})
