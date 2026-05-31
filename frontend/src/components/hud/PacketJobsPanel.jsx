import { districtForNode, friendlyNodeName } from '../../utils/mapDisplay'

const STATUS_CLASS = {
  PENDING: 'st-pending',
  DELIVERED: 'st-ok',
  DROPPED: 'st-bad',
  EXPIRED: 'st-bad',
}

export default function PacketJobsPanel({ state, playerId, selectedPacketId, onSelectPacket }) {
  const flows = (state.packetFlows || []).filter((f) => f.ownerPlayerId === playerId)
  const nodeIndex = Object.fromEntries((state.nodes || []).map((n) => [n.id, n]))

  return (
    <section className="panel">
      <h3>Your packet jobs ({flows.length})</h3>
      <ul className="job-list">
        {flows.map((f) => {
          const isSelected = f.id === selectedPacketId
          const source = nodeIndex[f.sourceNodeId] || f.sourceNodeId
          const dest = nodeIndex[f.destinationNodeId] || f.destinationNodeId
          return (
            <li key={f.id} className={isSelected ? 'job-selected' : ''}>
              <span className="job-type">{f.trafficType}</span>
              <span className="job-route">
                <span className="job-node start">{friendlyNodeName(source)}</span>
                <span className="job-arrow"> to </span>
                <span className="job-node dest">{friendlyNodeName(dest)}</span>
              </span>
              <span className="job-meta">
                <span>{districtForNode(source)} to {districtForNode(dest)}</span>
                <span>
                {f.packetSize ?? '?'} load
                {f.deadlineSeconds ? ` | ${f.deadlineSeconds}s deadline` : ''}
                {f.expiresAt ? ` | expires ${formatExpiry(f.expiresAt)}` : ''}
                </span>
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

function formatExpiry(value) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
