import { useState } from 'react'
import { useGame } from '../state/GameContext'
import ErrorBanner from '../components/common/ErrorBanner'
import LoadingScreen from '../components/common/LoadingScreen'

const MAP_CHOICES = [
  {
    id: 'CITY',
    name: 'City map',
    shortBlurb: 'Streets, towers, parks.',
    blurb: 'A realistic daytime city with streets, buildings, parks and traffic. Fly around it in 3D.',
    art: 'CITY',
  },
  {
    id: 'DISTRICT',
    name: 'District map',
    shortBlurb: 'Clear districts and labels.',
    blurb: 'A clean strategic view with named districts and clear node labels. Easier to read at a glance.',
    art: 'MAP',
  },
]

export default function LobbyScreen({ state, transport }) {
  const { sessionId, playerId, start, leave, error, setError, busy } = useGame()
  const players = state.players || []
  const canStart = players.length >= 2

  const [choosingMap, setChoosingMap] = useState(false)
  const [copied, setCopied] = useState('')
  const shortCode = sessionId ? sessionId.slice(0, 8) : ''
  const inviteLink = buildInviteLink(sessionId)
  const localOnlyHost = isLocalOnlyHost()

  if (busy) {
    return <LoadingScreen message="Starting match systems." />
  }

  const copyInvite = async () => {
    await copyText(inviteLink)
    setCopied('link')
    setTimeout(() => setCopied(''), 1500)
  }

  const copyCode = async () => {
    await copyText(sessionId)
    setCopied('code')
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="screen center pregame-screen lobby-screen">
      <div className="lobby">
        <header className="home-header">
          <h1>Lobby</h1>
          <p className="muted">
            Session <code className="pill code">#{shortCode}...</code>
            <span className="transport"> - {transport}</span>
          </p>
          <p className="muted">Difficulty <code className="pill">{state.difficulty || 'MEDIUM'}</code></p>
          <div className="invite-box">
            <span className="invite-label">Invite link</span>
            <code className="share-link">{inviteLink}</code>
            <div className="invite-actions">
              <button className="ghost copy-btn" onClick={copyInvite}>
                {copied === 'link' ? 'Link copied' : 'Copy link'}
              </button>
              <button className="ghost copy-btn" onClick={copyCode}>
                {copied === 'code' ? 'Code copied' : 'Copy code'}
              </button>
            </div>
          </div>
          {localOnlyHost && (
            <p className="muted host-warning">
              This link uses localhost, so it only works on this laptop. For teammate laptops, open the game with this host laptop's Wi-Fi IP first, then copy the link.
            </p>
          )}
          <p className="muted">Share the link with players on the same Wi-Fi. They enter a name, join, then wait for the host to start.</p>
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
            <p className="muted">Used by every player for this match.</p>
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
                  <span className="map-card-blurb">{m.shortBlurb}</span>
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

function buildInviteLink(sessionId) {
  if (!sessionId || typeof window === 'undefined') return sessionId || ''
  try {
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('join', sessionId)
    return url.toString()
  } catch {
    return sessionId
  }
}

function isLocalOnlyHost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

async function copyText(text) {
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    /* fall through to textarea copy */
  }

  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '-1000px'
  document.body.appendChild(area)
  area.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(area)
  }
}
