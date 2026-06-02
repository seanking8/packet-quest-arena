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

      {others.length > 0 && (
        <>
          <div className="feed-group">Incidents</div>
          <ul className="incident-list">
            {others.map((i) => (
              <IncidentRow key={i.id} incident={i} serverTime={state.serverTime} onFocus={onFocus} />
            ))}
          </ul>
        </>
      )}

      {incidents.length === 0 && <p className="muted">No active incidents.</p>}
    </section>
  )
}

function IncidentRow({ incident, serverTime, onFocus }) {
  const meta = incidentMeta(incident.eventType)
  const remaining = remainingSeconds(incident, serverTime)
  // The row's contents. When the row is focusable we wrap these in a real
  // <button> (display:contents, so the layout is unchanged) to get native
  // click + keyboard handling instead of bolting handlers onto the <li>.
  const body = (
    <>
      <span className="incident-type" style={{ color: meta.color }}>
        {meta.icon} {meta.label}
      </span>
      {incident.message && <span className="muted">{incident.message}</span>}
      <span className="incident-meta">
        <span>{affectedSummary(incident)}</span>
        <span className="sev">sev {Math.round((incident.severity || 0) * 100)}%</span>
        {remaining != null && <span className="sev">{remaining}s left</span>}
      </span>
    </>
  )
  return (
    <li className={`incident-row${onFocus ? ' clickable' : ''}`}>
      {onFocus ? (
        <button
          type="button"
          className="incident-row-action"
          style={{ display: 'contents' }}
          onClick={() => onFocus(incident)}
          title="Focus map on this incident"
        >
          {body}
        </button>
      ) : body}
    </li>
  )
}
