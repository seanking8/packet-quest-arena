export default function IncidentFeedPanel({ state }) {
  const incidents = state.incidents || []

  return (
    <section className="panel">
      <h3>Incident feed ({incidents.length})</h3>
      <ul className="incident-list">
        {incidents.map((i) => (
          <li key={i.id}>
            <span className="incident-type">{i.eventType}</span>
            <span className="muted">{i.message}</span>
            <span className="sev">sev {Math.round((i.severity || 0) * 100)}%</span>
          </li>
        ))}
        {incidents.length === 0 && <li className="muted">All clear — no active incidents.</li>}
      </ul>
    </section>
  )
}
