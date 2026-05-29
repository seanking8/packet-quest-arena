import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GameProvider } from '../state/GameContext'
import HomeScreen from '../screens/HomeScreen'

vi.mock('../services/api', () => ({
  createSession: vi.fn().mockResolvedValue({ sessionId: 's1', status: 'WAITING' }),
  joinSession: vi.fn().mockResolvedValue({ player: { id: 'p1' }, state: {} }),
  startMatch: vi.fn(),
}))

import { createSession } from '../services/api'

const renderHome = () => render(<GameProvider><HomeScreen /></GameProvider>)

beforeEach(() => vi.clearAllMocks())

test('create button is disabled until a name is entered', () => {
  renderHome()
  const createBtn = screen.getByRole('button', { name: /create session/i })
  expect(createBtn).toBeDisabled()
  fireEvent.change(screen.getByPlaceholderText(/Alice/i), { target: { value: 'Alice' } })
  expect(createBtn).toBeEnabled()
})

test('creating a session calls the backend', async () => {
  renderHome()
  fireEvent.change(screen.getByPlaceholderText(/Alice/i), { target: { value: 'Alice' } })
  fireEvent.click(screen.getByRole('button', { name: /create session/i }))
  await waitFor(() => expect(createSession).toHaveBeenCalled())
})
