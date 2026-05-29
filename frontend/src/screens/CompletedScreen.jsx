import { useGame } from '../state/GameContext'
import { rankedPlayers, leaderOf } from '../lib/format'

export default function CompletedScreen({ state }) {
  const { leave, playerId } = useGame()
  const ranked = rankedPlayers(state.players)
  const winner = leaderOf(state.players)

  return (
    <div className="screen center">
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
              <li key={p.id}>
                <span className="rank">{i + 1}</span>
                <span className="dot" style={{ background: p.color }} />
                <span className="grow">{p.displayName}{p.id === playerId && ' (you)'}</span>
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
