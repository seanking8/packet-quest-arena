import { Component, useEffect, useState } from 'react'
import { useGame } from './state/GameContext'
import useGameState from './hooks/useGameState'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'
import CompletedScreen from './screens/CompletedScreen'
import IntermissionScreen from './screens/IntermissionScreen'
import TutorialScreen from './screens/TutorialScreen'
import LoadingScreen from './components/common/LoadingScreen'

export default function App() {
  const { sessionId, mode } = useGame()
  const [booting, setBooting] = useState(true)

  // Brief boot animation on first load.
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 3800)
    return () => clearTimeout(timer)
  }, [])

  if (booting) return <LoadingScreen message="Booting the 5G arena network." />
  if (mode === 'tutorial') return <TutorialScreen />
  if (!sessionId) return <HomeScreen />
  return <SessionRouter sessionId={sessionId} />
}

/** Routes between lobby / active / intermission / completed based on status. */
function SessionRouter({ sessionId }) {
  const { state, transport, error } = useGameState(sessionId)

  if (!state) {
    return <LoadingScreen message="Syncing live session state." error={error} />
  }

  if (state.status === 'WAITING') return <LobbyScreen state={state} transport={transport} />
  if (state.status === 'INTERMISSION') return <IntermissionScreen state={state} />
  if (state.status === 'COMPLETED') return <CompletedScreen state={state} />
  return (
    <GameErrorBoundary>
      <GameScreen state={state} transport={transport} />
    </GameErrorBoundary>
  )
}

class GameErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Game screen failed to render', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="screen center">
          <div className="card">
            <h2>Game screen failed to render</h2>
            <p className="muted">{this.state.error.message}</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
