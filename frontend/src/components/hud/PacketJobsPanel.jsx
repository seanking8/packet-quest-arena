const STATUS_CLASS = {
  PENDING: 'st-pending',
  DELIVERED: 'st-ok',
  DROPPED: 'st-bad',
  EXPIRED: 'st-bad',
}

export default function PacketJobsPanel({ state, playerId, selectedPacketId, onSelectPacket }) {
  const flows = (state.packetFlows || []).filter((f) => f.ownerPlayerId === playerId)

  return (
    <section className="panel">
      <h3>Your packet jobs ({flows.length})</h3>
      <ul className="job-list">
        {flows.map((f) => {
          const isSelected = f.id === selectedPacketId
          return (
            <li key={f.id} className={isSelected ? 'job-selected' : ''}>
              <span className="job-type">{f.trafficType}</span>
              <span className="job-route">
                {f.sourceNodeId} → {f.destinationNodeId}
              </span>
              <span className={`job-status ${STATUS_CLASS[f.status] || ''}`}>{f.status}</span>
              {f.status === 'PENDING' && (
                <button
                  className={`job-select-btn ${isSelected ? 'on' : ''}`}
                  onClick={() => onSelectPacket(isSelected ? null : f)}
                >
                  {isSelected ? 'Cancel' : 'Route'}
                </button>
              )}
            </li>
          )
        })}
        {flows.length === 0 && <li className="muted">No jobs yet.</li>}
      </ul>
    </section>
  )
}
