import React, { useState } from 'react'
import { createSession, joinSession } from '../services/api'

export default function LobbyPage({ onJoin }) {
    const [playerName, setPlayerName] = useState('')
    const [joinCode, setJoinCode] = useState('')
    const [created, setCreated] = useState(null) // the session we just created
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    async function handleCreate() {
        setError('')
        if (!playerName.trim()) { setError('Please enter your name first.'); return }
        setBusy(true)
        try {
            const session = await createSession(playerName.trim())
            setCreated(session)
        } catch (e) {
            setError('Could not create a session. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    async function handleJoin() {
        setError('')
        if (!playerName.trim()) { setError('Please enter your name first.'); return }
        if (!joinCode.trim()) { setError('Please enter a session code.'); return }
        setBusy(true)
        try {
            const session = await joinSession(joinCode.trim().toUpperCase(), playerName.trim())
            onJoin(session.sessionId, session.playerId)
        } catch (e) {
            setError('Could not join — check the code and try again.')
        } finally {
            setBusy(false)
        }
    }

    function handleCopy() {
        if (created?.joinCode) navigator.clipboard?.writeText(created.joinCode)
    }

    // After creating: show the shareable code, wait before entering the game
    if (created) {
        return (
            <div>
                <h1>Packet Quest Arena</h1>
                <p>Session created. Share this code with the other player:</p>
                <h2 style={{ letterSpacing: '2px' }}>{created.joinCode}</h2>
                <button onClick={handleCopy}>Copy code</button>{' '}
                <button onClick={() => onJoin(created.sessionId, created.playerId)}>Enter Game</button>
            </div>
        )
    }

    return (
        <div>
            <h1>Packet Quest Arena</h1>
            {error && <p style={{ color: 'crimson' }}>{error}</p>}
            <input
                placeholder="Your name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
            />{' '}
            <button onClick={handleCreate} disabled={busy}>Create Session</button>
            <hr />
            <input
                placeholder="Session code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
            />{' '}
            <button onClick={handleJoin} disabled={busy}>Join Session</button>
        </div>
    )
}