import React, { useState } from 'react'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'

export default function App() {
  const [sessionId, setSessionId] = useState(null)

  return sessionId
    ? <GamePage sessionId={sessionId} onLeave={() => setSessionId(null)} />
    : <LobbyPage onJoin={setSessionId} />
}
