import { useGame } from '../state/GameContext'
import { rankedPlayers, leaderOf } from '../lib/format'

export default function CompletedScreen({ state }) {
  const { leave, playerId } = useGame()
  const ranked = rankedPlayers(state.players)
  const winner = leaderOf(state.players)

  return (
    <div className="screen center pregame-screen completed-screen">
      <div className="lobby">
        <header className="home-header">
          <h1>Match complete</h1>
          {winner && (
            <p className="muted">
              Winner: <strong style={{ color: winner.color }}>{winner.displayName}</strong> with{' '}
              {winner.score} pts
            </p>
          )}
        </header>

        <section className="card">
          <h2>Final scores</h2>
          <ol className="leaderboard">
            {ranked.map((p, i) => (
              <li key={p.id} className={i === 0 ? 'top-score' : ''}>
                <span className="rank">{i === 0 ? '🏆' : i + 1}</span>
                <span className="dot" style={{ background: p.color }} />
                <span className="grow">
                  {p.displayName}{p.id === playerId && ' (you)'}
                  <span className="pkt-counts">
                    <span className="pkt-ok" title="delivered">✓ {p.deliveredPackets ?? 0} delivered</span>
                    <span className="pkt-bad" title="dropped">✗ {p.droppedPackets ?? 0} dropped</span>
                  </span>
                </span>
                <span className="score">{p.score}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="row">
          <button onClick={leave}>Play again</button>
        </div>
      </div>
    </div>
  )
}
