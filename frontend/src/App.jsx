import React, { useState } from 'react'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'

export default function App() {
  const [sessionId, setSessionId] = useState(null)
  const [playerId, setPlayerId] = useState(null)

  function handleJoin(sId, pId) {
    setSessionId(sId)
    setPlayerId(pId)
  }

  function handleLeave() {
    setSessionId(null)
    setPlayerId(null)
  }

  return sessionId
      ? <GamePage sessionId={sessionId} playerId={playerId} onLeave={handleLeave} />
      : <LobbyPage onJoin={handleJoin} />
}