import { useState } from 'react'
import { useGame } from '../state/GameContext'
import ErrorBanner from '../components/common/ErrorBanner'
import LoadingScreen from '../components/common/LoadingScreen'

export default function LobbyScreen({ state, transport }) {
  const { sessionId, playerId, start, leave, error, setError, busy } = useGame()
  const players = state.players || []
  const canStart = players.length >= 2

  const [copied, setCopied] = useState(false)
  const shortCode = sessionId ? sessionId.slice(0, 8) : ''

  if (busy) {
    return <LoadingScreen message="Starting match systems." />
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="screen center">
      <div className="lobby">
        <header className="home-header">
          <h1>Lobby</h1>
          <p className="muted">
            Session <code className="pill code">#{shortCode}…</code>
            <button className="ghost copy-btn" onClick={copyCode}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <span className="transport"> · {transport}</span>
          </p>
          <p className="muted">Copy the session code and share it so others can join (2–4 players).</p>
        </header>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <section className="card">
          <h2>Players ({players.length}/4)</h2>
          <ul className="player-list">
            {players.map((p) => (
              <li key={p.id}>
                <span className="dot" style={{ background: p.color }} />
                <span>{p.displayName}</span>
                {p.id === playerId && <span className="tag">you</span>}
              </li>
            ))}
            {players.length === 0 && <li className="muted">Waiting for players…</li>}
          </ul>
        </section>

        <div className="row">
          <button disabled={!canStart || busy} onClick={start}>
            {canStart ? 'Start match' : 'Need 2+ players'}
          </button>
          <button className="ghost" onClick={leave}>
            Leave
          </button>
        </div>
      </div>
    </div>
  )
}
