import React from 'react'
import GameBoard from '../components/GameBoard'
import ActionPanel from '../components/ActionPanel'
import Scoreboard from '../components/Scoreboard'
import useGameState from '../hooks/useGameState'

export default function GamePage({ sessionId, playerId, onLeave }) {
    const { state, error, setState } = useGameState(sessionId)

    return (
        <div>
            <h2>Session: {state?.status ?? '...'}</h2>
            <button onClick={onLeave}>Leave</button>

            {error && <p style={{ color: 'crimson' }}>Connection problem: {error}</p>}

            <GameBoard state={state} />
            <ActionPanel sessionId={sessionId} playerId={playerId} state={state} onStateUpdate={setState} />
            <Scoreboard score={state?.score ?? 0} />
        </div>
    )
}