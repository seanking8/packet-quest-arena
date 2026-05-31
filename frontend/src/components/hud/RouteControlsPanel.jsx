import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../../state/GameContext'
import { submitRoute } from '../../services/api'
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
      {selectedPacket && <p className="route-result">{routeNotice || nextHint}</p>}
      {result && <p className="route-result ok">{result}</p>}
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
