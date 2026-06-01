import { useState } from 'react'
import { useGame } from '../state/GameContext'
import ErrorBanner from '../components/common/ErrorBanner'

const DIFFICULTIES = [
  { id: 'EASY', label: 'Easy', note: 'Longer deadlines, gentler incidents' },
  { id: 'MEDIUM', label: 'Medium', note: 'Current challenge level' },
  { id: 'HARD', label: 'Hard', note: 'Short deadlines, sharper chaos' },
]

export default function HomeScreen() {
  const { host, join, startTutorial, error, setError, busy } = useGame()
  const [name, setName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [difficulty, setDifficulty] = useState('EASY')

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

        <div className="tutorial-card card">
          <div>
            <h2>Quick tutorial</h2>
            <p className="muted">Practice routing with hints, paused guidance, and forgiving clicks before the real match.</p>
          </div>
          <button className="tutorial-button" onClick={startTutorial}>Start tutorial</button>
        </div>

        <div className="home-cards">
          <section className="card">
            <h2>Create a match</h2>
            <p className="muted">Start a new session and invite others with the session id.</p>
            <div className="difficulty-picker" role="group" aria-label="Match difficulty">
              {DIFFICULTIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`difficulty-option ${difficulty === option.id ? 'on' : ''}`}
                  aria-pressed={difficulty === option.id}
                  onClick={() => setDifficulty(option.id)}
                >
                  <span>{option.label}</span>
                  <small>{option.note}</small>
                </button>
              ))}
            </div>
            <button disabled={!canHost || busy} onClick={() => host(name.trim(), difficulty)}>
              {busy ? 'Working...' : 'Create session'}
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
              {busy ? 'Working...' : 'Join session'}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
