import { useGame } from '../state/GameContext'
import { rankedPlayers } from '../lib/format'

// Shown between rounds: standings are frozen while the host decides to start
// the next round. The next round's theme is previewed so players know what's
// coming.
const ROUND_PREVIEW = {
  2: { title: 'Rush Hour', tagline: 'Traffic surges — links congest fast, balance the load.' },
  3: { title: 'Storm City', tagline: 'Storms and outages hit — reroute around the chaos.' },
}

export default function IntermissionScreen({ state }) {
  const { playerId, advanceRound, busy, error, setError } = useGame()
  const players = state.players || []
  const ranked = rankedPlayers(players)
  const isHost = players.length > 0 && players[0].id === playerId
  const current = state.currentRound || 1
  const next = current + 1
  const preview = ROUND_PREVIEW[next]

  return (
    <div className="screen center">
      <div className="lobby">
        <header className="home-header">
          <h1>Round {current} complete</h1>
          <p className="muted">Standings so far — scores carry into the next round.</p>
        </header>

        <section className="card">
          <h2>Standings</h2>
          <ol className="leaderboard">
            {ranked.map((p, i) => (
              <li key={p.id} className={i === 0 ? 'top-score' : ''}>
                <span className="rank">{i === 0 ? '🏆' : i + 1}</span>
                <span className="dot" style={{ background: p.color }} />
                <span className="grow">
                  {p.displayName}{p.id === playerId && ' (you)'}
                  <span className="pkt-counts">
                    <span className="pkt-ok" title="delivered">✓ {p.deliveredPackets ?? 0}</span>
                    <span className="pkt-bad" title="dropped">✗ {p.droppedPackets ?? 0}</span>
                  </span>
                </span>
                <span className="score">{p.score}</span>
              </li>
            ))}
          </ol>
        </section>

        {preview && (
          <section className="card">
            <h2>Next: Round {next} — {preview.title}</h2>
            <p className="muted">{preview.tagline}</p>
          </section>
        )}

        {error && <p className="error-text" onClick={() => setError(null)}>{error}</p>}

        <div className="row">
          {isHost ? (
            <button disabled={busy} onClick={advanceRound}>
              {busy ? 'Starting…' : `Start Round ${next}`}
            </button>
          ) : (
            <p className="muted">Waiting for the host to start Round {next}…</p>
          )}
        </div>
      </div>
    </div>
  )
}
