import { useState } from 'react'
import { useGame } from '../state/GameContext'
import ErrorBanner from '../components/common/ErrorBanner'

const MAP_CHOICES = [
  {
    id: 'CITY',
    name: 'City map',
    blurb: 'A realistic daytime city — streets, buildings, parks and traffic. Fly around it in 3D.',
    art: '🏙️',
  },
  {
    id: 'DISTRICT',
    name: 'District map',
    blurb: 'A clean strategic view with named districts and clear node labels. Easier to read at a glance.',
    art: '🗺️',
  },
]

export default function LobbyScreen({ state, transport }) {
  const { sessionId, playerId, start, leave, error, setError, busy } = useGame()
  const players = state.players || []
  const canStart = players.length >= 2

  const [choosingMap, setChoosingMap] = useState(false)
  const [copied, setCopied] = useState(false)
  const shortCode = sessionId ? sessionId.slice(0, 8) : ''
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
          <p className="muted">Difficulty <code className="pill">{state.difficulty || 'MEDIUM'}</code></p>
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
            {players.length === 0 && <li className="muted">Waiting for players...</li>}
          </ul>
        </section>

        <div className="row">
          <button disabled={!canStart || busy} onClick={() => setChoosingMap(true)}>
            {canStart ? 'Start match' : 'Need 2+ players'}
          </button>
          <button className="ghost" onClick={leave}>
            Leave
          </button>
        </div>
      </div>

      {choosingMap && (
        <div className="map-chooser-overlay" role="dialog" aria-label="Choose a map">
          <div className="map-chooser">
            <h2>Choose your map</h2>
            <p className="muted">The map you pick is used for the whole match by every player.</p>
            <div className="map-chooser-grid">
              {MAP_CHOICES.map((m) => (
                <button
                  key={m.id}
                  className="map-card"
                  disabled={busy}
                  onClick={() => start(m.id)}
                >
                  <span className="map-card-art" aria-hidden="true">{m.art}</span>
                  <span className="map-card-name">{m.name}</span>
                  <span className="map-card-blurb">{m.blurb}</span>
                </button>
              ))}
            </div>
            <button className="ghost" disabled={busy} onClick={() => setChoosingMap(false)}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
