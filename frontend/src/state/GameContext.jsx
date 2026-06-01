import { createContext, useContext, useState } from 'react'
import { createSession, joinSession, startMatch } from '../services/api'

/**
 * Holds the player's session identity (sessionId, playerId, name) and the
 * pre-game actions. Live game state comes from useGameState, not here.
 */
const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [sessionId, setSessionId] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [mode, setMode] = useState('live')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setError(null)
    setBusy(true)
    try {
      return await fn()
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setBusy(false)
    }
  }

  /** Create a new session and join it as the first player (host). */
  const host = (name, difficulty = 'MEDIUM') =>
    run(async () => {
      const { sessionId: id } = await createSession(difficulty)
      const { player } = await joinSession(id, name)
      setSessionId(id)
      setPlayerId(player.id)
      setPlayerName(name)
    })

  /** Join an existing session by id. */
  const join = (id, name) =>
    run(async () => {
      const { player } = await joinSession(id, name)
      setSessionId(id)
      setPlayerId(player.id)
      setPlayerName(name)
    })

  /** Start the match with the host's chosen map family (host action). */
  const start = (mapFamily = 'CITY') => run(() => startMatch(sessionId, mapFamily))

  const leave = () => {
    setSessionId(null)
    setPlayerId(null)
    setPlayerName('')
    setMode('live')
    setError(null)
  }

  const startTutorial = () => {
    setSessionId(null)
    setPlayerId('tutorial-player')
    setPlayerName('Trainee')
    setMode('tutorial')
    setError(null)
  }

  const value = {
    sessionId,
    playerId,
    playerName,
    mode,
    error,
    busy,
    setError,
    host,
    join,
    start,
    startTutorial,
    leave,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
