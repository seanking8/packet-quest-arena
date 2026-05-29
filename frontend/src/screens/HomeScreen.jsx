import { useState } from 'react'
import { useGame } from '../state/GameContext'
import ErrorBanner from '../components/common/ErrorBanner'

export default function HomeScreen() {
  const { host, join, error, setError, busy } = useGame()
  const [name, setName] = useState('')
  const [joinId, setJoinId] = useState('')

  const canHost = name.trim().length > 0
  const canJoin = name.trim().length > 0 && joinId.trim().length > 0

  return (
    <div className="screen center">
      <div className="home">
        <header className="home-header">
          <h1>Packet Quest Arena</h1>
          <p className="muted">Route packets across a live 5G city network. Fastest, smartest router wins.</p>
        </header>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <label className="field">
          <span>Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice"
            maxLength={24}
          />
        </label>

        <div className="home-cards">
          <section className="card">
            <h2>Create a match</h2>
            <p className="muted">Start a new session and invite others with the session id.</p>
            <button disabled={!canHost || busy} onClick={() => host(name.trim())}>
              {busy ? 'Working…' : 'Create session'}
            </button>
          </section>

          <section className="card">
            <h2>Join a match</h2>
            <label className="field">
              <span>Session id</span>
              <input
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="paste session id"
              />
            </label>
            <button disabled={!canJoin || busy} onClick={() => join(joinId.trim(), name.trim()).catch(() => {})}>
              {busy ? 'Working…' : 'Join session'}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
