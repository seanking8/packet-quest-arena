import { useState } from 'react'
import { useGame } from '../state/GameContext'
import TopBar from '../components/hud/TopBar'
import PacketJobsPanel from '../components/hud/PacketJobsPanel'
import LeaderboardPanel from '../components/hud/LeaderboardPanel'
import IncidentFeedPanel from '../components/hud/IncidentFeedPanel'
import RouteControlsPanel from '../components/hud/RouteControlsPanel'
import SelectedDetailPanel from '../components/hud/SelectedDetailPanel'
import MapPlaceholder from '../components/map/MapPlaceholder'

const DEFAULT_PANELS = { jobs: true, leaderboard: true, incidents: true, route: true }

export default function GameScreen({ state, transport }) {
  const { playerId } = useGame()
  const [panels, setPanels] = useState(DEFAULT_PANELS)
  const [selected, setSelected] = useState(null) // { kind: 'node'|'link', data }

  const toggle = (name) => setPanels((p) => ({ ...p, [name]: !p[name] }))

  return (
    <div className="hud">
      {/* Map fills the whole screen; HUD floats at the edges. */}
      <div className="map-layer">
        <MapPlaceholder state={state} onSelect={setSelected} />
      </div>

      <TopBar state={state} transport={transport} panels={panels} onToggle={toggle} />

      {panels.jobs && (
        <aside className="hud-left">
          <PacketJobsPanel state={state} playerId={playerId} />
        </aside>
      )}

      <aside className="hud-right">
        <SelectedDetailPanel selected={selected} onClear={() => setSelected(null)} />
        {panels.leaderboard && <LeaderboardPanel state={state} playerId={playerId} />}
        {panels.incidents && <IncidentFeedPanel state={state} />}
      </aside>

      {panels.route && (
        <div className="hud-bottom">
          <RouteControlsPanel state={state} playerId={playerId} />
        </div>
      )}
    </div>
  )
}
