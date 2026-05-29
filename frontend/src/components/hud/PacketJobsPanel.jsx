const STATUS_CLASS = {
  PENDING: 'st-pending',
  DELIVERED: 'st-ok',
  DROPPED: 'st-bad',
  EXPIRED: 'st-bad',
}

export default function PacketJobsPanel({ state, playerId }) {
  const flows = (state.packetFlows || []).filter((f) => f.ownerPlayerId === playerId)

  return (
    <section className="panel">
      <h3>Your packet jobs ({flows.length})</h3>
      <ul className="job-list">
        {flows.map((f) => (
          <li key={f.id}>
            <span className="job-type">{f.trafficType}</span>
            <span className="job-route">
              {f.sourceNodeId} → {f.destinationNodeId}
            </span>
            <span className={`job-status ${STATUS_CLASS[f.status] || ''}`}>{f.status}</span>
          </li>
        ))}
        {flows.length === 0 && <li className="muted">No jobs yet.</li>}
      </ul>
    </section>
  )
}
