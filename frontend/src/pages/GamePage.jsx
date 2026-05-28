import React from 'react'
import GameBoard from '../components/GameBoard'
import ActionPanel from '../components/ActionPanel'
import Scoreboard from '../components/Scoreboard'
import useGameState from '../hooks/useGameState'

export default function GamePage({ sessionId, playerId, onLeave }) {
    const { state, error, setState } = useGameState(sessionId)

    async function handleEndGame() {
        if (!confirm('End the game now? No more actions can be taken.')) return
        try {
            const res = await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `End failed (${res.status})`)
            setState(data)
        } catch (e) {
            alert('Could not end game: ' + e.message)
        }
    }

    return (
        <div>
            <h2>Session: {state?.status ?? '...'}</h2>
            <button onClick={onLeave}>Leave</button>{' '}
            {state?.status !== 'COMPLETED' && (
                <button onClick={handleEndGame}>End Game</button>
            )}
            {state?.status === 'COMPLETED' && (
                <span style={{ marginLeft: 12, fontWeight: 'bold' }}>Game Over</span>
            )}

            {error && <p style={{ color: 'crimson' }}>Connection problem: {error}</p>}

            <GameBoard state={state} />
            <ActionPanel sessionId={sessionId} playerId={playerId} state={state} onStateUpdate={setState} />
            <Scoreboard score={state?.score ?? 0} />
        </div>
    )
}