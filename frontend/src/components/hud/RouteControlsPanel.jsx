import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../../state/GameContext'
import useAudio from '../../hooks/useAudio'
import { previewRoute, submitRoute } from '../../services/api'
import { buildRouteAssist, estimatePath } from '../../utils/routeAssist'
import { districtForNode, friendlyNodeName } from '../../utils/mapDisplay'

export default function RouteControlsPanel({
  state,
  playerId,
  selectedPacket,
  routePath,
  onRoutePath,
  routeNotice,
  onClearPacket,
  onSubmitRoute,
}) {
  const { sessionId } = useGame()
  const { play } = useAudio()
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
  const nodeIndex = useMemo(() => {
    return Object.fromEntries((state.nodes || []).map((n) => [n.id, n]))
  }, [state.nodes])

  const routeAssist = useMemo(
    () => buildRouteAssist(state, selectedPacket, routePath),
    [state, selectedPacket, routePath]
  )
  const routeStats = useMemo(
    () => estimatePath(state, routePath, selectedPacket),
    [state, routePath, selectedPacket]
  )

  const routeComplete = selectedPacket
    && routePath.length >= 2
    && routePath[0] === selectedPacket.sourceNodeId
    && routePath[routePath.length - 1] === selectedPacket.destinationNodeId

  // Fetch a non-binding backend estimate when a real match has a complete
  // candidate route. The tutorial keeps using its local guided estimate.
  useEffect(() => {
    if (!routeComplete || onSubmitRoute || !sessionId) {
      setPreview(null)
      setPreviewing(false)
      return undefined
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
  }, [routeComplete, onSubmitRoute, sessionId, playerId, selectedPacket?.id, routePath.join('|')])

  const nextHint = useMemo(() => {
    if (!selectedPacket) return null
    const last = routePath[routePath.length - 1]
    if (last === selectedPacket.destinationNodeId) return 'Route reaches the destination. Ready to submit.'
    const suggested = routeAssist.suggestedNextId ? friendlyNodeName(nodeIndex[routeAssist.suggestedNextId] || routeAssist.suggestedNextId) : null
    return suggested
      ? `Valid next hops are highlighted cyan. Best next: ${suggested}.`
      : `Click a highlighted node connected to ${friendlyNodeName(nodeIndex[last] || last)}.`
  }, [routePath, selectedPacket, routeAssist.suggestedNextId, nodeIndex])

  const onSubmit = async () => {
    if (!routeComplete) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = onSubmitRoute
        ? await onSubmitRoute({ selectedPacket, routePath, routeStats })
        : await submitRoute(sessionId, {
            playerId,
            packetFlowId: selectedPacket.id,
            path: routePath,
          })
      const summary = `${res.packetStatus} | ${Math.round(res.latencyMs)}ms | ${res.scoreDelta >= 0 ? '+' : ''}${res.scoreDelta}`
      play(res.packetStatus === 'DELIVERED' ? 'delivered' : 'dropped')
      setResult({
        delivered: res.packetStatus === 'DELIVERED',
        text: res.message ? `${summary} - ${res.message}` : summary,
      })
      onClearPacket()
    } catch (e) {
      // The round can end (intermission) in the ~1.5s between state polls; a
      // submit landing in that window is a harmless timing race, not a failure.
      if (/not active|INTERMISSION|COMPLETED/i.test(e.message || '')) {
        setError('Round ended — hold on for the next round.')
      } else {
        setError(e.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const onUndo = () => onRoutePath((prev) => prev.slice(0, -1))

  // Fire the about-to-expire sound once when the selected packet hits urgent.
  const urgentFiredRef = useRef(false)
  useEffect(() => {
    if (!selectedPacket || selectedPacket.status !== 'PENDING' || !selectedPacket.expiresAt) return
    urgentFiredRef.current = false
  }, [selectedPacket?.id])
  useEffect(() => {
    if (!selectedPacket || selectedPacket.status !== 'PENDING' || !selectedPacket.expiresAt) return
    const remainingMs = Date.parse(selectedPacket.expiresAt) - Date.now()
    const isUrgent = remainingMs <= 5000
    if (isUrgent && !urgentFiredRef.current) {
      urgentFiredRef.current = true
      play('aboutToExpire')
    }
  })

  return (
    <section className="panel route-panel">
      <div className="route-row">
        {selectedPacket ? (
          <>
            <span className="route-label">
              <strong>{selectedPacket.trafficType}</strong>
              &nbsp;{friendlyNodeName(nodeIndex[selectedPacket.sourceNodeId] || selectedPacket.sourceNodeId)}
              &nbsp;to&nbsp;
              {friendlyNodeName(nodeIndex[selectedPacket.destinationNodeId] || selectedPacket.destinationNodeId)}
            </span>
            <span className="route-path" title="Click connected nodes on the map to extend the path">
              {routePath.length ? routePath.map((id) => friendlyNodeName(nodeIndex[id] || id)).join(' -> ') : '-'}
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

      {selectedPacket && (
        <RouteQuality
          source={nodeIndex[selectedPacket.sourceNodeId] || selectedPacket.sourceNodeId}
          dest={nodeIndex[selectedPacket.destinationNodeId] || selectedPacket.destinationNodeId}
          stats={routeStats}
        />
      )}

      {selectedPacket && routeComplete && (
        <div className="route-preview">
          {previewing && <span className="muted">Estimating...</span>}
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
            <span className="risk risk-high">Route cannot be delivered</span>
          )}
          {!previewing && preview && preview.warnings?.length > 0 && (
            <ul className="route-warnings">
              {preview.warnings.map((warning, index) => <li key={index}>Warning: {warning}</li>)}
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

function RouteQuality({ source, dest, stats }) {
  const quality = stats?.quality || 'building'
  const timeLeft = stats?.timeLeftSeconds
  const utilisationPct = Math.round((stats?.worstUtilisation || 0) * 100)
  const lossPct = (stats?.lossPct || 0).toFixed(stats?.lossPct >= 10 ? 0 : 1)
  return (
    <div className={`route-quality route-${quality}`}>
      <div className="route-quality-main">
        <span>
          <strong>{friendlyNodeName(source)}</strong>
          <small>{districtForNode(source)}</small>
        </span>
        <div className="route-quality-bar" aria-hidden="true">
          <i style={{ width: `${Math.min(100, Math.max(10, utilisationPct || (stats?.hops ? 28 : 10)))}%` }} />
        </div>
        <span>
          <strong>{friendlyNodeName(dest)}</strong>
          <small>{districtForNode(dest)}</small>
        </span>
      </div>
      <div className="route-quality-stats">
        <span>{stats?.qualityLabel || 'Route in progress'}</span>
        <span>{stats?.hops || 0} hops</span>
        <span>{Math.round(stats?.latencyMs || 0)}ms latency</span>
        <span>{lossPct}% loss</span>
        {timeLeft != null && <span>{timeLeft}s left</span>}
      </div>
    </div>
  )
}

function scoreRangeLabel(range) {
  if (!range) return '-'
  return range.min === range.max ? `${range.min}` : `${range.min} to ${range.max}`
}
