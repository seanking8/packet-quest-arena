import { rankedPlayers } from '../../lib/format'

export default function LeaderboardPanel({ state, playerId }) {
  const ranked = rankedPlayers(state.players)

  return (
    <section className="panel">
      <h3>Leaderboard</h3>
      <ol className="leaderboard">
        {ranked.map((p, i) => (
          <li key={p.id}>
            <span className="rank">{i + 1}</span>
            <span className="dot" style={{ background: p.color }} />
            <span className="grow">
              {p.displayName}
              {p.id === playerId && <span className="tag">you</span>}
            </span>
            <span className="score">{p.score}</span>
          </li>
        ))}
        {ranked.length === 0 && <li className="muted">No players.</li>}
      </ol>
    </section>
  )
}
