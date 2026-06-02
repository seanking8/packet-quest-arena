import { createContext, useContext, useEffect, useState } from 'react'
import { createSession, joinSession, startMatch, nextRound as nextRoundApi } from '../services/api'

/**
 * Holds the player's session identity (sessionId, playerId, name) and the
 * pre-game actions. Live game state comes from useGameState, not here.
 */
const GameContext = createContext(null)

const SESSION_STORAGE_KEY = 'packetQuest.liveSession.v1'

function readStoredSession() {
  if (typeof window === 'undefined') return {}
  try {
    const stored = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) || '{}')
    if (!stored.sessionId || !stored.playerId) return {}
    return {
      sessionId: stored.sessionId,
      playerId: stored.playerId,
      playerName: stored.playerName || '',
    }
  } catch {
    return {}
  }
}

function writeStoredSession(session) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

function clearStoredSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function GameProvider({ children }) {
  const storedSession = readStoredSession()
  const [sessionId, setSessionId] = useState(storedSession.sessionId || null)
  const [playerId, setPlayerId] = useState(storedSession.playerId || null)
  const [playerName, setPlayerName] = useState(storedSession.playerName || '')
  const [mode, setMode] = useState('live')
  const [selectedMapFamily, setSelectedMapFamily] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (mode === 'live' && sessionId && playerId) {
      writeStoredSession({ sessionId, playerId, playerName })
    } else if (mode === 'live' && !sessionId) {
      clearStoredSession()
    }
  }, [mode, sessionId, playerId, playerName])

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
      setSelectedMapFamily(null)
    })

  /** Join an existing session by id. */
  const join = (id, name) =>
    run(async () => {
      const { player } = await joinSession(id, name)
      setSessionId(id)
      setPlayerId(player.id)
      setPlayerName(name)
      setSelectedMapFamily(null)
    })

  /** Start the match with the host's chosen map family (host action). */
  const start = (mapFamily = 'CITY') =>
    run(async () => {
      const family = normalizeMapFamily(mapFamily)
      setSelectedMapFamily(family)
      const state = await startMatch(sessionId, family)
      setSelectedMapFamily(normalizeMapFamily(state?.mapFamily || family))
      return state
    })

  /** Advance from intermission to the next round (host action). */
  const advanceRound = () => run(() => nextRoundApi(sessionId))

  const leave = () => {
    setSessionId(null)
    setPlayerId(null)
    setPlayerName('')
    setMode('live')
    setSelectedMapFamily(null)
    setError(null)
    clearStoredSession()
  }

  const startTutorial = () => {
    setSessionId(null)
    setPlayerId('tutorial-player')
    setPlayerName('Trainee')
    setMode('tutorial')
    setSelectedMapFamily(null)
    setError(null)
    clearStoredSession()
  }

  const value = {
    sessionId,
    playerId,
    playerName,
    mode,
    selectedMapFamily,
    error,
    busy,
    setError,
    host,
    join,
    start,
    advanceRound,
    startTutorial,
    leave,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

function normalizeMapFamily(mapFamily) {
  return String(mapFamily || 'CITY').trim().toUpperCase() === 'DISTRICT' ? 'DISTRICT' : 'CITY'
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
