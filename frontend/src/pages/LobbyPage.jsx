import React, { useState } from 'react'
import { createSession, joinSession } from '../services/api'

export default function LobbyPage({ onJoin }) {
  const [joinId, setJoinId] = useState('')
  const [playerName, setPlayerName] = useState('')

  async function handleCreate() {
    const session = await createSession(playerName)
    onJoin(session.id)
  }

  async function handleJoin() {
    const session = await joinSession(joinId, playerName)
    onJoin(session.id)
  }

  return (
    <div>
      <h1>Packet Quest Arena</h1>
      <input
        placeholder="Your name"
        value={playerName}
        onChange={e => setPlayerName(e.target.value)}
      />
      <button onClick={handleCreate}>Create Session</button>
      <hr />
      <input
        placeholder="Session ID"
        value={joinId}
        onChange={e => setJoinId(e.target.value)}
      />
      <button onClick={handleJoin}>Join Session</button>
    </div>
  )
}
