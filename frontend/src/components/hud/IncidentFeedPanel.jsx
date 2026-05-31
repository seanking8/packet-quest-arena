import { isWeather, incidentMeta, affectedSummary, remainingSeconds } from '../map/incidents'

/**
 * Right-HUD feed of active weather + incidents. Weather and non-weather
 * incidents are listed separately. Clicking an entry focuses the map camera on
 * its zone. All values are backend-computed — this panel only presents them.
 */
export default function IncidentFeedPanel({ state, onFocus }) {
  const incidents = state.incidents || []
  const weather = incidents.filter((i) => isWeather(i.eventType))
  const others = incidents.filter((i) => !isWeather(i.eventType))

  return (
    <section className="panel">
      <h3>Incident feed ({incidents.length})</h3>

      {weather.length > 0 && (
        <>
          <div className="feed-group">Weather</div>
          <ul className="incident-list">
            {weather.map((i) => (
              <IncidentRow key={i.id} incident={i} serverTime={state.serverTime} onFocus={onFocus} />
            ))}
          </ul>
        </>
      )}

      <div className="feed-group">Incidents</div>
      <ul className="incident-list">
        {others.map((i) => (
          <IncidentRow key={i.id} incident={i} serverTime={state.serverTime} onFocus={onFocus} />
        ))}
        {others.length === 0 && <li className="muted">No active incidents.</li>}
      </ul>
    </section>
  )
}

function IncidentRow({ incident, serverTime, onFocus }) {
  const meta = incidentMeta(incident.eventType)
  const remaining = remainingSeconds(incident, serverTime)
  return (
    <li
      className={`incident-row${onFocus ? ' clickable' : ''}`}
      onClick={onFocus ? () => onFocus(incident) : undefined}
      title={onFocus ? 'Focus map on this incident' : undefined}
    >
      <span className="incident-type" style={{ color: meta.color }}>
        {meta.icon} {meta.label}
      </span>
      {incident.message && <span className="muted">{incident.message}</span>}
      <span className="incident-meta">
        <span>{affectedSummary(incident)}</span>
        <span className="sev">sev {Math.round((incident.severity || 0) * 100)}%</span>
        {remaining != null && <span className="sev">{remaining}s left</span>}
      </span>
    </li>
  )
}
