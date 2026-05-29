import { useState } from 'react'
import { useGame } from '../../state/GameContext'
import { submitRoute } from '../../services/api'

/**
 * Minimal route builder: pick one of your PENDING packets and enter a path of
 * node ids (comma-separated). Visual path-picking arrives with the 3D map; the
 * backend still validates and scores everything.
 */
export default function RouteControlsPanel({ state, playerId }) {
  const { sessionId } = useGame()
  const pending = (state.packetFlows || []).filter(
    (f) => f.ownerPlayerId === playerId && f.status === 'PENDING'
  )

  const [packetId, setPacketId] = useState('')
  const [path, setPath] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const selected = pending.find((f) => f.id === packetId)

  const onSelect = (id) => {
    setPacketId(id)
    const flow = pending.find((f) => f.id === id)
    setPath(flow ? `${flow.sourceNodeId}, ${flow.destinationNodeId}` : '')
    setResult(null)
    setError(null)
  }

  const onSubmit = async () => {
    if (!selected) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const nodes = path.split(',').map((s) => s.trim()).filter(Boolean)
      const res = await submitRoute(sessionId, { playerId, packetFlowId: packetId, path: nodes })
      setResult(`${res.packetStatus} · ${Math.round(res.latencyMs)}ms · ${res.scoreDelta >= 0 ? '+' : ''}${res.scoreDelta}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel route-panel">
      <h3>Route controls</h3>
      <div className="route-row">
        <select value={packetId} onChange={(e) => onSelect(e.target.value)}>
          <option value="">Select a pending packet…</option>
          {pending.map((f) => (
            <option key={f.id} value={f.id}>
              {f.trafficType}: {f.sourceNodeId} → {f.destinationNodeId}
            </option>
          ))}
        </select>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="node path: a, b, c"
          disabled={!selected}
        />
        <button disabled={!selected || busy} onClick={onSubmit}>
          {busy ? 'Submitting…' : 'Submit route'}
        </button>
      </div>
      {result && <p className="route-result ok">{result}</p>}
      {error && <p className="route-result bad">{error}</p>}
      {!pending.length && <p className="muted">No pending packets right now.</p>}
    </section>
  )
}
