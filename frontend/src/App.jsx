import { useGame } from './state/GameContext'
import useGameState from './hooks/useGameState'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'
import CompletedScreen from './screens/CompletedScreen'

export default function App() {
  const { sessionId } = useGame()
  if (!sessionId) return <HomeScreen />
  return <SessionRouter sessionId={sessionId} />
}

/** Routes between lobby / active / completed based on backend status. */
function SessionRouter({ sessionId }) {
  const { state, transport, error } = useGameState(sessionId)

  if (!state) {
    return (
      <div className="screen center">
        <div className="card">
          <h2>Connecting…</h2>
          <p className="muted">{error || 'Loading session state.'}</p>
        </div>
      </div>
    )
  }

  if (state.status === 'WAITING') return <LobbyScreen state={state} transport={transport} />
  if (state.status === 'COMPLETED') return <CompletedScreen state={state} />
  return <GameScreen state={state} transport={transport} />
}
