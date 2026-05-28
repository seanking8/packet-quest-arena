import React from 'react'

export default function Scoreboard({ scores }) {
  return (
    <div>
      <h3>Scores</h3>
      <ul>
        {(scores ?? []).map(s => (
          <li key={s.playerId}>{s.playerName}: {s.score}</li>
        ))}
      </ul>
    </div>
  )
}
