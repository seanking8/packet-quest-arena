import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../../state/GameContext'
import { previewRoute, submitRoute } from '../../services/api'

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
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)

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

  // Fetch a non-binding estimate whenever the player has a complete candidate
  // route. The preview is advisory only — a failure never blocks submission,
  // and the authoritative result still comes from submitRoute.
  useEffect(() => {
    if (!routeComplete) {
      setPreview(null)
      setPreviewing(false)
      return
    }
    let cancelled = false
    setPreviewing(true)
    previewRoute(sessionId, {
      playerId,
      packetFlowId: selectedPacket.id,
      path: routePath,
    })
      .then((res) => { if (!cancelled) setPreview(res) })
      .catch(() => { if (!cancelled) setPreview(null) })
      .finally(() => { if (!cancelled) setPreviewing(false) })
    return () => { cancelled = true }
  }, [routeComplete, sessionId, playerId, selectedPacket?.id, routePath.join('|')])

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
      const summary = `${res.packetStatus} | ${Math.round(res.latencyMs)}ms | ${res.scoreDelta >= 0 ? '+' : ''}${res.scoreDelta}`
      setResult({ delivered: res.packetStatus === 'DELIVERED', text: res.message ? `${summary} — ${res.message}` : summary })
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
      {selectedPacket && routeComplete && (
        <div className="route-preview">
          {previewing && <span className="muted">Estimating…</span>}
          {!previewing && preview && preview.valid && (
            <div className="route-preview-row">
              <span className="preview-stat">~{Math.round(preview.estimatedLatencyMs)}ms</span>
              <span className={`risk risk-${preview.packetLossRisk.toLowerCase()}`}>
                {preview.packetLossRisk} loss risk
              </span>
              <span className="preview-stat">
                Est. score {scoreRangeLabel(preview.estimatedScoreRange)}
              </span>
            </div>
          )}
          {!previewing && preview && !preview.valid && (
            <span className="risk risk-high">Route can't be delivered</span>
          )}
          {!previewing && preview && preview.warnings?.length > 0 && (
            <ul className="route-warnings">
              {preview.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
            </ul>
          )}
        </div>
      )}
      {selectedPacket && <p className="route-result">{routeNotice || nextHint}</p>}
      {result && <p className={`route-result ${result.delivered ? 'ok' : 'bad'}`}>{result.text}</p>}
      {error && <p className="route-result bad">{error}</p>}
    </section>
  )
}

function scoreRangeLabel(range) {
  if (!range) return '-'
  return range.min === range.max ? `${range.min}` : `${range.min} to ${range.max}`
}
