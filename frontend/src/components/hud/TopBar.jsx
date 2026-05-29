import { useGame } from '../../state/GameContext'
import { formatTimer } from '../../lib/format'

const TOGGLES = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'route', label: 'Route' },
]

export default function TopBar({ state, transport, panels, onToggle }) {
  const { leave } = useGame()
  const nodes = state.nodes?.length ?? 0
  const links = state.links?.length ?? 0
  const packets = state.packetFlows?.length ?? 0
  const incidents = state.incidents?.length ?? 0

  return (
    <header className="hud-top">
      <div className="hud-top-left">
        <strong>Packet Quest Arena</strong>
        <span className="pill">{state.status}</span>
        <span className="transport" title="state transport">{transport}</span>
      </div>

      <div className="hud-top-center">
        <span className="timer">⏱ {formatTimer(state.remainingSeconds)}</span>
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
