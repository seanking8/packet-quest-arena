import { useGame } from '../../state/GameContext'
import { formatTimer, timerUrgency, networkPressure } from '../../lib/format'

const TOGGLES = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'route', label: 'Route' },
]

export default function TopBar({ state, transport, panels, onToggle }) {
  const { leave, sessionId } = useGame()
  const nodes = state.nodes?.length ?? 0
  const links = state.links?.length ?? 0
  const packets = state.packetFlows?.length ?? 0
  const incidents = state.incidents?.length ?? 0
  const urgency = timerUrgency(state.remainingSeconds)
  const pressure = networkPressure(state.links)

  return (
    <header className="hud-top">
      <div className="hud-top-left">
        <strong>Packet Quest Arena</strong>
        <span className="pill">{state.status}</span>
        {sessionId && (
          <span className="pill code" title="Session code — share to invite players">
            #{sessionId}
          </span>
        )}
        <span
          className={`pressure pressure-${pressure.band.toLowerCase()}`}
          title="Network pressure: total link load vs capacity"
        >
          <span className="pressure-bar"><span style={{ width: `${Math.round(pressure.ratio * 100)}%` }} /></span>
          {pressure.band} load
        </span>
        <span className="transport" title="state transport">{transport}</span>
      </div>

      <div className="hud-top-center">
        <span className={`timer ${urgency}`} aria-label="Time remaining">
          ⏱ {formatTimer(state.remainingSeconds)}
        </span>
        <span className="counts">
          {nodes} nodes · {links} links · {packets} packets · {incidents} incidents
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
