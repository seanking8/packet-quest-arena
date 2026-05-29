import { useEffect, useState } from 'react'
import { useGame } from '../state/GameContext'
import TopBar from '../components/hud/TopBar'
import PacketJobsPanel from '../components/hud/PacketJobsPanel'
import LeaderboardPanel from '../components/hud/LeaderboardPanel'
import IncidentFeedPanel from '../components/hud/IncidentFeedPanel'
import RouteControlsPanel from '../components/hud/RouteControlsPanel'
import SelectedDetailPanel from '../components/hud/SelectedDetailPanel'
import NetworkScene from '../components/map/NetworkScene'

const DEFAULT_PANELS = { jobs: true, leaderboard: true, incidents: true, route: true }

export default function GameScreen({ state, transport }) {
  const { playerId } = useGame()
  const [panels, setPanels] = useState(DEFAULT_PANELS)
  const [view, setView] = useState('iso')
  const [selected, setSelected] = useState(null)
  const [selectedPacket, setSelectedPacket] = useState(null)
  const [routePath, setRoutePath] = useState([])
  const [routeNotice, setRouteNotice] = useState(null)

  const toggle = (name) => setPanels((p) => ({ ...p, [name]: !p[name] }))

  useEffect(() => {
    if (!selectedPacket) return
    const latest = (state.packetFlows || []).find((f) => f.id === selectedPacket.id)
    if (!latest || latest.status !== 'PENDING') {
      handleSelectPacket(null)
    } else if (latest !== selectedPacket) {
      setSelectedPacket(latest)
    }
  }, [state.packetFlows, selectedPacket])

  const handleSelect = (item) => {
    if (!item) {
      setSelected(null)
      return
    }

    if (item.kind === 'node' && selectedPacket) {
      setRoutePath((prev) => {
        const nodeId = item.data.id
        const existingIndex = prev.indexOf(nodeId)
        if (existingIndex >= 0) {
          setRouteNotice(null)
          return prev.slice(0, existingIndex + 1)
        }

        const last = prev[prev.length - 1]
        if (!last || connected(state.links || [], last, nodeId)) {
          setRouteNotice(null)
          return [...prev, nodeId]
        }

        setRouteNotice(`${nodeId} is not connected to ${last}. Pick a neighbouring node.`)
        return prev
      })
      return
    }

    setSelected(item)
  }

  const handleSelectPacket = (flow) => {
    setSelectedPacket(flow)
    setRoutePath(flow ? [flow.sourceNodeId] : [])
    setRouteNotice(null)
    setSelected(null)
  }

  return (
    <div className="hud">
      <div className="map-layer">
        <NetworkScene
          state={state}
          onSelect={handleSelect}
          routePath={routePath}
          selectedPacket={selectedPacket}
          view={view}
        />
      </div>

      <div className="view-controls">
        <button className={`toggle ${view === 'close' ? 'on' : ''}`} onClick={() => setView('close')}>Close</button>
        <button className={`toggle ${view === 'iso' ? 'on' : ''}`} onClick={() => setView('iso')}>City</button>
        <button className={`toggle ${view === 'planet' ? 'on' : ''}`} onClick={() => setView('planet')}>Planet</button>
        <button className="ghost" onClick={() => setView('iso')}>{view === 'planet' ? 'Back to City' : 'Reset'}</button>
      </div>

      <TopBar state={state} transport={transport} panels={panels} onToggle={toggle} />

      {panels.jobs && (
        <aside className="hud-left">
          <PacketJobsPanel
            state={state}
            playerId={playerId}
            selectedPacketId={selectedPacket?.id}
            onSelectPacket={handleSelectPacket}
          />
        </aside>
      )}

      <aside className="hud-right">
        <SelectedDetailPanel selected={selected} onClear={() => setSelected(null)} />
        {panels.leaderboard && <LeaderboardPanel state={state} playerId={playerId} />}
        {panels.incidents && <IncidentFeedPanel state={state} />}
      </aside>

      {panels.route && (
        <div className="hud-bottom">
          <RouteControlsPanel
            state={state}
            playerId={playerId}
            selectedPacket={selectedPacket}
            routePath={routePath}
            onRoutePath={setRoutePath}
            routeNotice={routeNotice}
            onClearPacket={() => handleSelectPacket(null)}
          />
        </div>
      )}
    </div>
  )
}

function connected(links, a, b) {
  return links.some((link) =>
    (link.sourceNodeId === a && link.targetNodeId === b)
    || (link.sourceNodeId === b && link.targetNodeId === a)
  )
}
