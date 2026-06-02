import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../state/GameContext'
import { formatTimer, timerUrgency, networkPressure } from '../../lib/format'

const TOGGLES = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'route', label: 'Route' },
]

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
  const packets = state.packetFlows?.length ?? 0
  const incidents = state.incidents?.length ?? 0
  const pressure = networkPressure(state.links)
  const liveSeconds = useLiveSeconds(state.remainingSeconds, state.status === 'ACTIVE')
  const urgency = timerUrgency(liveSeconds)

  return (
    <header className="hud-top">
      <div className="hud-top-left">
        <strong>Packet Quest Arena</strong>
        {state.currentRound > 0 && (
          <span className="pill round-pill" title={state.roundTagline}>
            Round {state.currentRound}/{state.totalRounds || 3} · {state.roundTitle}
          </span>
        )}
        <span className="pill difficulty-pill">{state.difficulty || 'MEDIUM'}</span>
      </div>

      <div className="hud-top-center">
        <span className={`timer ${urgency}`} aria-label="Time remaining">
          ⏱ {formatTimer(liveSeconds)}
        </span>
        <span
          className={`pressure pressure-${pressure.band.toLowerCase()}`}
          title="Network pressure: total link load vs capacity"
        >
          <span className="pressure-bar"><span style={{ width: `${Math.round(pressure.ratio * 100)}%` }} /></span>
          {pressure.band} load · {packets} packets · {incidents} incidents
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
