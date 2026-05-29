import { useState, useEffect } from 'react'
import { useGame } from '../../state/GameContext'
import { submitRoute } from '../../services/api'

/**
 * Route builder. selectedPacket and routePath are owned by GameScreen so the
 * 3D map can also append nodes to the path by clicking.
 */
export default function RouteControlsPanel({
  state,
  playerId,
  selectedPacket,
  routePath,
  onRoutePath,
  onClearPacket,
}) {
  const { sessionId } = useGame()
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Reset feedback when packet changes
  useEffect(() => { setResult(null); setError(null) }, [selectedPacket?.id])

  const onSubmit = async () => {
    if (!selectedPacket || routePath.length < 2) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await submitRoute(sessionId, {
        playerId,
        packetFlowId: selectedPacket.id,
        path: routePath,
      })
      setResult(`${res.packetStatus} · ${Math.round(res.latencyMs)}ms · ${res.scoreDelta >= 0 ? '+' : ''}${res.scoreDelta}`)
      onClearPacket()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const onUndo = () => onRoutePath((prev) => prev.slice(0, -1))

  const pending = (state.packetFlows || []).filter(
    (f) => f.ownerPlayerId === playerId && f.status === 'PENDING'
  )

  return (
    <section className="panel route-panel">
      <div className="route-row">
        {selectedPacket ? (
          <>
            <span className="route-label">
              <strong>{selectedPacket.trafficType}</strong>
              &nbsp;{selectedPacket.sourceNodeId} → {selectedPacket.destinationNodeId}
            </span>
            <span className="route-path" title="Click nodes on the map to extend the path">
              {routePath.length ? routePath.join(' → ') : '—'}
            </span>
            <button className="ghost" onClick={onUndo} disabled={routePath.length <= 1}>Undo</button>
            <button className="ghost" onClick={onClearPacket}>Cancel</button>
            <button disabled={routePath.length < 2 || busy} onClick={onSubmit}>
              {busy ? 'Submitting…' : 'Submit route'}
            </button>
          </>
        ) : (
          <span className="muted">
            {pending.length
              ? 'Select a packet job on the left to start routing.'
              : 'No pending packets right now.'}
          </span>
        )}
      </div>
      {result && <p className="route-result ok">{result}</p>}
      {error && <p className="route-result bad">{error}</p>}
    </section>
  )
}
