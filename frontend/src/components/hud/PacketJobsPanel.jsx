import { useEffect, useState } from 'react'
import { districtForNode, friendlyNodeName } from '../../utils/mapDisplay'

const STATUS_CLASS = {
  PENDING: 'st-pending',
  DELIVERED: 'st-ok',
  DROPPED: 'st-bad',
  EXPIRED: 'st-bad',
}

export default function PacketJobsPanel({ state, playerId, selectedPacketId, onSelectPacket, timerPaused = false }) {
  const flows = (state.packetFlows || []).filter((f) => f.ownerPlayerId === playerId)
  const nodeIndex = Object.fromEntries((state.nodes || []).map((n) => [n.id, n]))
  const [now, setNow] = useState(() => Date.now())
  const timerKey = flows.map((f) => `${f.id}:${f.status}:${f.expiresAt || ''}`).join('|')
  const hasLiveDeadline = flows.some((f) => f.status === 'PENDING' && f.expiresAt)

  useEffect(() => {
    setNow(Date.now())
    if (timerPaused || !hasLiveDeadline) return undefined
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [timerPaused, timerKey, hasLiveDeadline])

  return (
    <section className="panel">
      <h3>Your packet jobs ({flows.length})</h3>
      <ul className="job-list">
        {flows.map((f) => {
          const isSelected = f.id === selectedPacketId
          const source = nodeIndex[f.sourceNodeId] || f.sourceNodeId
          const dest = nodeIndex[f.destinationNodeId] || f.destinationNodeId
          const deadline = deadlineState(f, now)
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
              {deadline && <DeadlineMeter deadline={deadline} />}
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

function DeadlineMeter({ deadline }) {
  return (
    <span
      className={`job-deadline ${deadline.tone}`}
      role="progressbar"
      aria-label={`Packet deadline: ${deadline.label}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(deadline.percent)}
    >
      <span className="job-deadline-track">
        <span className="job-deadline-fill" style={{ width: `${deadline.percent}%` }} />
      </span>
      <span className="job-time-badge">{deadline.label}</span>
    </span>
  )
}

function deadlineState(flow, now) {
  if (!flow.expiresAt) return null
  const end = Date.parse(flow.expiresAt)
  if (Number.isNaN(end)) return null

  const created = Date.parse(flow.createdAt)
  const declaredDeadlineMs = flow.deadlineSeconds ? flow.deadlineSeconds * 1000 : 0
  const derivedTotalMs = Number.isNaN(created) ? 0 : end - created
  const totalMs = Math.max(1, declaredDeadlineMs || derivedTotalMs)
  const remainingMs = Math.max(0, end - now)
  const percent = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100))
  const remainingSeconds = Math.ceil(remainingMs / 1000)

  let tone = 'safe'
  if (flow.status === 'EXPIRED' || remainingSeconds <= 0) tone = 'expired'
  else if (remainingSeconds <= 5 || percent <= 15) tone = 'urgent'
  else if (remainingSeconds <= 15 || percent <= 35) tone = 'warning'

  return {
    percent,
    tone,
    label: flow.status === 'PENDING' ? `${remainingSeconds}s left` : flow.status,
  }
}

function formatExpiry(value) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
