import { useEffect, useState } from 'react'
import { useGame } from '../state/GameContext'
import { getMatchHistory, getPersistentLeaderboard } from '../services/api'
import ErrorBanner from '../components/common/ErrorBanner'
import LoadingScreen from '../components/common/LoadingScreen'

const DIFFICULTIES = [
  { id: 'EASY', label: 'Easy' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HARD', label: 'Hard' },
]

export default function HomeScreen() {
  const { host, join, startTutorial, error, setError, busy } = useGame()
  const [name, setName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [history, setHistory] = useState({ matches: [], leaderboard: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setHistory((current) => ({ ...current, loading: true, error: null }))
    Promise.all([getMatchHistory(), getPersistentLeaderboard(difficulty)])
      .then(([matches, leaderboard]) => {
        if (!cancelled) {
          setHistory({ matches: matches || [], leaderboard: leaderboard || [], loading: false, error: null })
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setHistory({ matches: [], leaderboard: [], loading: false, error: e.message })
        }
      })
    return () => {
      cancelled = true
    }
  }, [difficulty])

  const canHost = name.trim().length > 0
  const canJoin = name.trim().length > 0 && joinId.trim().length > 0

  if (busy) {
    return <LoadingScreen message="Opening an arena session." />
  }

  return (
    <div className="screen center pregame-screen home-screen">
      <div className="home">
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
            <p className="muted">Start a new session and share the session code with other players.</p>
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

        <DatabaseInsightsPanel {...history} difficulty={difficulty} />
      </div>
    </div>
  )
}

function DatabaseInsightsPanel({ matches, leaderboard, loading, error, difficulty }) {
  return (
    <div className="database-insights">
      <section className="card compact-card">
        <h2>{formatDifficulty(difficulty)} leaderboard</h2>
        {loading && <p className="muted">Loading saved scores.</p>}
        {!loading && error && <p className="muted">Saved scores are unavailable right now.</p>}
        {!loading && !error && leaderboard.length === 0 && (
          <p className="muted">No completed matches yet.</p>
        )}
        {!loading && !error && leaderboard.length > 0 && (
          <ol className="insight-list">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <li key={entry.playerName} className="insight-row">
                <span className="rank">{index + 1}</span>
                <span className="grow">{entry.playerName}</span>
                <span className="score">{entry.totalScore} pts</span>
                <span className="match-meta">{entry.wins} wins</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card compact-card">
        <h2>Recent matches</h2>
        {loading && <p className="muted">Loading match history.</p>}
        {!loading && error && <p className="muted">Match history is unavailable right now.</p>}
        {!loading && !error && matches.length === 0 && (
          <p className="muted">Finish a match to save a report.</p>
        )}
        {!loading && !error && matches.length > 0 && (
          <ol className="insight-list">
            {matches.slice(0, 5).map((match) => (
              <li key={match.sessionId} className="match-history-row">
                <span className="grow">
                  {match.winnerName || 'No winner'}
                  <span className="match-meta">
                    {match.difficulty} - {match.deliveredPackets} delivered - {formatHistoryDate(match.updatedAt)}
                  </span>
                </span>
                <span className="score">{match.winnerScore} pts</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function formatHistoryDate(value) {
  if (!value) return 'unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown time'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDifficulty(value) {
  const text = String(value || 'MEDIUM').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
