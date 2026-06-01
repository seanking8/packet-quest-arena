import { useEffect, useState } from 'react'
import { useGame } from './state/GameContext'
import useGameState from './hooks/useGameState'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'
import CompletedScreen from './screens/CompletedScreen'
import LoadingScreen from './components/common/LoadingScreen'

export default function App() {
  const { sessionId } = useGame()
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 2800)
    return () => clearTimeout(timer)
  }, [])

  if (booting) return <LoadingScreen message="Booting the 5G arena network." />
  if (!sessionId) return <HomeScreen />
  return <SessionRouter sessionId={sessionId} />
}

/** Routes between lobby / active / completed based on backend status. */
function SessionRouter({ sessionId }) {
  const { state, transport, error } = useGameState(sessionId)

  if (!state) {
    return <LoadingScreen message="Syncing live session state." error={error} />
  }

  if (state.status === 'WAITING') return <LobbyScreen state={state} transport={transport} />
  if (state.status === 'COMPLETED') return <CompletedScreen state={state} />
  return <GameScreen state={state} transport={transport} />
}
