import { render, screen } from '@testing-library/react'
import Scoreboard from '../components/Scoreboard'

test('renders player scores', () => {
  const scores = [{ playerId: '1', playerName: 'Alice', score: 42 }]
  render(<Scoreboard scores={scores} />)
  expect(screen.getByText('Alice: 42')).toBeInTheDocument()
})
