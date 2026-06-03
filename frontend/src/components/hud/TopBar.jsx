import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../state/GameContext'
import { formatTimer, timerUrgency } from '../../lib/format'

const TOGGLES = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'route', label: 'Route' },
]

/** "MEDIUM" -> "Medium" for a readable difficulty label. */
function formatLevel(difficulty) {
  const text = String(difficulty || 'MEDIUM').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Tick the clock down locally between server updates so it never looks frozen
// if a broadcast is briefly missed; re-sync whenever fresh state arrives.
function useLiveSeconds(serverSeconds, running) {
  const [seconds, setSeconds] = useState(serverSeconds ?? 0)
  const synced = useRef(serverSeconds)
  useEffect(() => {
    setSeconds(serverSeconds ?? 0)
    synced.current = serverSeconds
  }, [serverSeconds])
  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [running, synced.current]) // eslint-disable-line react-hooks/exhaustive-deps
  return seconds
}

export default function TopBar({ state, panels, onToggle }) {
  const { leave } = useGame()
  const liveSeconds = useLiveSeconds(state.remainingSeconds, state.status === 'ACTIVE')
  const urgency = timerUrgency(liveSeconds)

  return (
    <header className="hud-top">
      <div className="hud-top-left">
        <strong className="hud-game-title">Packet Quest Arena</strong>
        {state.currentRound > 0 && (
          <span className="hud-stat round-stat" title={state.roundTagline || state.roundTitle}>
            <span className="hud-stat-label">Round</span>
            <span className="hud-stat-value">{state.currentRound} / {state.totalRounds || 3}</span>
          </span>
        )}
        <span className="hud-stat level-stat">
          <span className="hud-stat-label">Level</span>
          <span className="hud-stat-value">{formatLevel(state.difficulty)}</span>
        </span>
      </div>

      <div className="hud-top-center">
        <span className={`timer ${urgency}`} aria-label="Time remaining">
          ⏱ {formatTimer(liveSeconds)}
        </span>
      </div>

      <div className="hud-top-right">
        {TOGGLES.map((t) => (
          <button
            key={t.key}
            className={`toggle ${panels[t.key] ? 'on' : ''}`}
            aria-pressed={panels[t.key]}
            onClick={() => onToggle(t.key)}
          >
            {t.label}
          </button>
        ))}
        <button className="ghost" onClick={leave}>Leave</button>
      </div>
    </header>
  )
}
