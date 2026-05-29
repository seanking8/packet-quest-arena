import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../../state/GameContext'
import { submitRoute } from '../../services/api'

export default function RouteControlsPanel({
  state,
  playerId,
  selectedPacket,
  routePath,
  onRoutePath,
  routeNotice,
  onClearPacket,
}) {
  const { sessionId } = useGame()
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setResult(null)
    setError(null)
  }, [selectedPacket?.id, routePath.join('|')])

  const pending = (state.packetFlows || []).filter(
    (f) => f.ownerPlayerId === playerId && f.status === 'PENDING'
  )

  const routeComplete = selectedPacket
    && routePath.length >= 2
    && routePath[0] === selectedPacket.sourceNodeId
    && routePath[routePath.length - 1] === selectedPacket.destinationNodeId

  const nextHint = useMemo(() => {
    if (!selectedPacket) return null
    const last = routePath[routePath.length - 1]
    if (last === selectedPacket.destinationNodeId) return 'Route reaches the destination. Ready to submit.'
    return `Click a node connected to ${last} and finish at ${selectedPacket.destinationNodeId}.`
  }, [routePath, selectedPacket])

  const onSubmit = async () => {
    if (!routeComplete) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await submitRoute(sessionId, {
        playerId,
        packetFlowId: selectedPacket.id,
        path: routePath,
      })
      setResult(`${res.packetStatus} | ${Math.round(res.latencyMs)}ms | ${res.scoreDelta >= 0 ? '+' : ''}${res.scoreDelta}`)
      onClearPacket()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const onUndo = () => onRoutePath((prev) => prev.slice(0, -1))

  return (
    <section className="panel route-panel">
      <div className="route-row">
        {selectedPacket ? (
          <>
            <span className="route-label">
              <strong>{selectedPacket.trafficType}</strong>
              &nbsp;{selectedPacket.sourceNodeId} to {selectedPacket.destinationNodeId}
            </span>
            <span className="route-path" title="Click connected nodes on the map to extend the path">
              {routePath.length ? routePath.join(' -> ') : '-'}
            </span>
            <button className="ghost" onClick={onUndo} disabled={routePath.length <= 1}>Undo</button>
            <button className="ghost" onClick={onClearPacket}>Cancel</button>
            <button disabled={!routeComplete || busy} onClick={onSubmit}>
              {busy ? 'Submitting...' : 'Submit route'}
            </button>
          </>
        ) : (
          <span className="muted">
            {pending.length
              ? 'Select a packet job on the left, then click connected map nodes to build a route.'
              : 'No pending packets right now.'}
          </span>
        )}
      </div>
      {selectedPacket && <p className="route-result">{routeNotice || nextHint}</p>}
      {result && <p className="route-result ok">{result}</p>}
      {error && <p className="route-result bad">{error}</p>}
    </section>
  )
}
