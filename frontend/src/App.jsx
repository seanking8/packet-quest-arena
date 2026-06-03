import { Component, useEffect, useState } from 'react'
import { useGame } from './state/GameContext'
import useGameState from './hooks/useGameState'
import useAudio, { toggleMute } from './hooks/useAudio'
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
  const { playMusic, stopMusic } = useAudio()

  // Brief boot animation on first load.
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 3800)
    return () => clearTimeout(timer)
  }, [])

  // Menu music plays everywhere except the active game and tutorial.
  // SessionRouter takes over stopping/starting music when the game goes live.
  useEffect(() => {
    if (booting) return
    if (mode === 'tutorial') {
      stopMusic()
    } else if (!sessionId) {
      playMusic('menuMusic')
    }
    // When sessionId is set, SessionRouter controls music based on game status.
  }, [booting, sessionId, mode, playMusic, stopMusic])

  if (booting) return <LoadingScreen message="Booting the 5G arena network." />
  if (mode === 'tutorial') return <><TutorialScreen /><MuteButton /></>
  if (!sessionId) return <><HomeScreen /><MuteButton /></>
  return <><SessionRouter sessionId={sessionId} playMusic={playMusic} stopMusic={stopMusic} /><MuteButton /></>
}

/** Routes between lobby / active / intermission / completed based on status. */
function SessionRouter({ sessionId, playMusic, stopMusic }) {
  const { leave } = useGame()
  const { state, transport, error, notFound } = useGameState(sessionId)

  // Play menu music on all session screens except the active game.
  useEffect(() => {
    if (!state) return
    if (state.status === 'ACTIVE') {
      stopMusic()  // GameScreen starts its own in-game music
    } else {
      playMusic('menuMusic')  // WAITING, INTERMISSION, COMPLETED
    }
  }, [state?.status, playMusic, stopMusic])

  if (!state) {
    return <ResumeLoading error={error} notFound={notFound} onLeave={leave} />
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

function ResumeLoading({ error, notFound, onLeave }) {
  if (notFound) {
    return (
      <div className="screen center">
        <div className="card resume-card">
          <h2>Session no longer available</h2>
          <p className="muted">
            This browser remembered a match, but the backend no longer has that session.
          </p>
          <button onClick={onLeave}>Back to menu</button>
        </div>
      </div>
    )
  }

  return <LoadingScreen message="Syncing live session state." error={error} />
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

function MuteButton() {
  const [muted, setMuted] = useState(false)
  const handleClick = () => setMuted(toggleMute())
  return (
    <button
      onClick={handleClick}
      title={muted ? 'Unmute audio' : 'Mute audio'}
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        width: 36, height: 36, padding: 0,
        background: 'rgba(7,18,32,0.82)',
        border: '1px solid rgba(36,220,216,0.34)',
        borderRadius: 8, cursor: 'pointer',
        fontSize: 18, lineHeight: '36px', textAlign: 'center',
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
