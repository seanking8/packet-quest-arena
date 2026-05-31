import { useNow } from '../../lib/useNow'
import { secondsLeft } from '../../lib/format'

const STATUS_CLASS = {
  PENDING: 'st-pending',
  DELIVERED: 'st-ok',
  DROPPED: 'st-bad',
  EXPIRED: 'st-bad',
}

export default function PacketJobsPanel({ state, playerId, selectedPacketId, onSelectPacket }) {
  const now = useNow(1000)
  const flows = (state.packetFlows || []).filter((f) => f.ownerPlayerId === playerId)
  const me = (state.players || []).find((p) => p.id === playerId)

  return (
    <section className="panel">
      <h3>
        {me && <span className="dot" style={{ background: me.color }} />}
        Your packet jobs ({flows.length})
      </h3>
      <ul className="job-list">
        {flows.map((f) => {
          const isSelected = f.id === selectedPacketId
          const left = f.status === 'PENDING' ? secondsLeft(f.expiresAt, now) : null
          const urgent = left != null && left <= 10
          return (
            <li key={f.id} className={isSelected ? 'job-selected' : ''}>
              <span className="job-type">{f.trafficType}</span>
              <span className="job-route">
                {f.sourceNodeId} to {f.destinationNodeId}
              </span>
              <span className="job-meta">
                {f.packetSize ?? '?'} load
                {f.value ? ` | worth ${f.value} pts` : ''}
                {left != null
                  ? ` | `
                  : f.deadlineSeconds
                    ? ` | ${f.deadlineSeconds}s deadline`
                    : ''}
                {left != null && (
                  <span className={urgent ? 'deadline-urgent' : 'deadline'}>{left}s left</span>
                )}
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
