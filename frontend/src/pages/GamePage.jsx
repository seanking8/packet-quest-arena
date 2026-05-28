import React from 'react'
import GameBoard from '../components/GameBoard'
import ActionPanel from '../components/ActionPanel'
import Scoreboard from '../components/Scoreboard'
import useGameState from '../hooks/useGameState'

export default function GamePage({ sessionId, onLeave }) {
  const { topology, flows, scores } = useGameState(sessionId)

  return (
    <div>
      <h2>Session: {sessionId}</h2>
      <button onClick={onLeave}>Leave</button>
      <GameBoard topology={topology} flows={flows} />
      <ActionPanel sessionId={sessionId} />
      <Scoreboard scores={scores} />
    </div>
  )
}
