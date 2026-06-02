import { Component, useEffect, useRef, useState } from 'react'
import { useGame } from '../state/GameContext'
import useAudio from '../hooks/useAudio'
import TopBar from '../components/hud/TopBar'
import PacketJobsPanel from '../components/hud/PacketJobsPanel'
import LeaderboardPanel from '../components/hud/LeaderboardPanel'
import IncidentFeedPanel from '../components/hud/IncidentFeedPanel'
import RouteControlsPanel from '../components/hud/RouteControlsPanel'
import SelectedDetailPanel from '../components/hud/SelectedDetailPanel'
import NetworkScene from '../components/map/NetworkScene'
import DistrictScene from '../components/map/DistrictScene'
import CityMap2D from '../components/map/CityMap2D'
import TacticalMap from '../components/map/TacticalMap'
import { isUsableLink } from '../utils/routeAssist'
import { friendlyNodeName } from '../utils/mapDisplay'
import { zoneCenter } from '../components/map/incidents'

const DEFAULT_PANELS = { jobs: true, leaderboard: true, incidents: true, route: true }
const DEFAULT_LAYERS = { weather: true, incidents: true, labels: false }

export default function GameScreen({ state, transport }) {
  const { playerId } = useGame()
  const { play, playMusic } = useAudio()
  const [webglAvailable, setWebglAvailable] = useState(canUseWebGL)
  const [panels, setPanels] = useState(DEFAULT_PANELS)
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  // The map family is chosen once by the host at start and stored on the
  // session, so every player renders the same map for the whole match. There
  // is no in-game switch between families.
  const mapFamily = (state.mapFamily || 'CITY').toLowerCase() === 'district' ? 'district' : 'city'

  // Background music — pick track based on map family, start once on mount.
  useEffect(() => {
    playMusic(mapFamily === 'district' ? 'districtMusic' : 'cityMusic')
  }, [mapFamily, playMusic])
  const [view, setView] = useState(() => (canUseWebGL() ? 'iso' : 'tactical'))
  const [focus, setFocus] = useState(null)
  const [selected, setSelected] = useState(null)
  const [selectedPacket, setSelectedPacket] = useState(null)
  const [routePath, setRoutePath] = useState([])
  const [routeNotice, setRouteNotice] = useState(null)

  const toggle = (name) => setPanels((p) => ({ ...p, [name]: !p[name] }))
  const toggleLayer = (name) => setLayers((l) => ({ ...l, [name]: !l[name] }))
  const show3d = (nextView) => {
    if (!webglAvailable) {
      setView('tactical')
      return
    }
    setView(nextView)
  }

  const handleSceneError = () => {
    setWebglAvailable(false)
    setView('tactical')
  }

  // Click an incident in the feed → bring the city view to its zone.
  const handleFocusIncident = (incident) => {
    const nodeIndex = {}
    ;(state.nodes || []).forEach((n) => (nodeIndex[n.id] = n))
    const center = zoneCenter(incident, nodeIndex)
    if (!center) return
    setView((current) => (current === 'tactical' ? 'tactical' : 'iso'))
    setFocus({ x: center.x, z: center.z, key: (focus?.key || 0) + 1 })
  }

  useEffect(() => {
    if (!selectedPacket) return
    const latest = (state.packetFlows || []).find((f) => f.id === selectedPacket.id)
    if (!latest || latest.status !== 'PENDING') {
      handleSelectPacket(null)
    } else if (latest !== selectedPacket) {
      setSelectedPacket(latest)
    }
  }, [state.packetFlows, selectedPacket])

  // Play a sound when a new incident arrives.
  const incidentIdsRef = useRef(new Set())
  useEffect(() => {
    const ids = (state.incidents || []).map((i) => i.id)
    const newOnes = ids.filter((id) => !incidentIdsRef.current.has(id))
    if (newOnes.length > 0) play('incident')
    incidentIdsRef.current = new Set(ids)
  }, [state.incidents, play])

  const handleSelect = (item) => {
    if (!item) {
      setSelected(null)
      return
    }

    if ((item.kind === 'node' || item.kind === 'link') && selectedPacket) {
      setRoutePath((prev) => {
        const nodeId = item.kind === 'node'
          ? item.data.id
          : nextNodeFromLink(item.data, prev[prev.length - 1])
        if (!nodeId) {
          play('hopInvalid')
          setRouteNotice('Click a highlighted next-hop link connected to your current node.')
          return prev
        }
        const existingIndex = prev.indexOf(nodeId)
        if (existingIndex >= 0) {
          play('hopValid')
          setRouteNotice(null)
          return prev.slice(0, existingIndex + 1)
        }

        const last = prev[prev.length - 1]
        // Once the path already reaches the destination, don't let further
        // clicks extend past it — the route is finished at the destination.
        if (last === selectedPacket.destinationNodeId) {
          play('hopInvalid')
          setRouteNotice('Route already reaches the destination — submit it, or Undo to change it.')
          return prev
        }
        if (!last || connected(state.links || [], last, nodeId)) {
          play('hopValid')
          setRouteNotice(null)
          return [...prev, nodeId]
        }

        // Explain why this node can't be added: either there's no link at all,
        // or the only link to it is down (FAILED/EXPIRED) and unusable.
        play('hopInvalid')
        if (linkExists(state.links || [], last, nodeId)) {
          setRouteNotice(`The link from ${friendlyNodeName(last)} to ${friendlyNodeName(nodeId)} is down — pick a glowing cyan neighbour instead.`)
        } else {
          setRouteNotice(`${friendlyNodeName(nodeId)} isn't connected to ${friendlyNodeName(last)}. Pick a glowing cyan neighbour.`)
        }
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

      <div className="hud-center">
      <div className="map-layer">
        {view === 'tactical' ? (
          mapFamily === 'district' ? (
            <TacticalMap
              state={state}
              onSelect={handleSelect}
              routePath={routePath}
              selectedPacket={selectedPacket}
              layers={layers}
            />
          ) : (
            <CityMap2D
              state={state}
              onSelect={handleSelect}
              routePath={routePath}
              selectedPacket={selectedPacket}
              layers={layers}
            />
          )
        ) : (
          <SceneErrorBoundary onError={handleSceneError}>
            {mapFamily === 'district' ? (
              <DistrictScene
                state={state}
                onSelect={handleSelect}
                routePath={routePath}
                selectedPacket={selectedPacket}
                view={view}
                layers={layers}
                focus={focus}
              />
            ) : (
              <NetworkScene
                state={state}
                onSelect={handleSelect}
                routePath={routePath}
                selectedPacket={selectedPacket}
                view={view}
                layers={layers}
                focus={focus}
              />
            )}
          </SceneErrorBoundary>
        )}
      </div>

      <div className="view-controls">
        <button className={`toggle ${view === 'close' ? 'on' : ''}`} disabled={!webglAvailable} onClick={() => show3d('close')}>Close</button>
        <button className={`toggle ${view === 'iso' ? 'on' : ''}`} disabled={!webglAvailable} onClick={() => show3d('iso')}>3D</button>
        <button className={`toggle ${view === 'tactical' ? 'on' : ''}`} onClick={() => setView('tactical')}>2D</button>
        <button className={`toggle ${view === 'planet' ? 'on' : ''}`} disabled={!webglAvailable} onClick={() => show3d('planet')}>Planet</button>
        <button className="ghost" onClick={() => setView(webglAvailable ? 'iso' : 'tactical')}>{view === 'planet' ? 'Back to 3D' : 'Reset'}</button>
      </div>

      <div className="layer-controls">
        <button className={`toggle ${layers.weather ? 'on' : ''}`} aria-pressed={layers.weather} onClick={() => toggleLayer('weather')}>Weather</button>
        <button className={`toggle ${layers.incidents ? 'on' : ''}`} aria-pressed={layers.incidents} onClick={() => toggleLayer('incidents')}>Incidents</button>
        <button className={`toggle ${layers.labels ? 'on' : ''}`} aria-pressed={layers.labels} onClick={() => toggleLayer('labels')}>Labels</button>
      </div>

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

      <aside className="hud-right">
        {selected && <SelectedDetailPanel selected={selected} onClear={() => setSelected(null)} />}
        {panels.leaderboard && <LeaderboardPanel state={state} playerId={playerId} />}
        {panels.incidents && <IncidentFeedPanel state={state} onFocus={handleFocusIncident} />}
      </aside>
    </div>
  )
}

class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    if (error?.message?.includes('WebGL')) this.props.onError?.(error)
    else throw error
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

function canUseWebGL() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext
      && (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

function connected(links, a, b) {
  return links.some((link) => isUsableLink(link) && (
    (link.sourceNodeId === a && link.targetNodeId === b)
    || (link.sourceNodeId === b && link.targetNodeId === a)
  ))
}

// Like connected(), but ignores link status — used to tell "no link at all"
// apart from "link exists but is down" when explaining a blocked pick.
function linkExists(links, a, b) {
  return links.some((link) => (
    (link.sourceNodeId === a && link.targetNodeId === b)
    || (link.sourceNodeId === b && link.targetNodeId === a)
  ))
}

function nextNodeFromLink(link, currentNodeId) {
  if (!isUsableLink(link)) return null
  if (link.sourceNodeId === currentNodeId) return link.targetNodeId
  if (link.targetNodeId === currentNodeId) return link.sourceNodeId
  return null
}
