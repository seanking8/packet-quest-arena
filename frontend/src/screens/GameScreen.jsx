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
  const { playerId, selectedMapFamily } = useGame()
  const { play } = useAudio()
  const [webglAvailable, setWebglAvailable] = useState(canUseWebGL)
  const [panels, setPanels] = useState(DEFAULT_PANELS)
  const [jobsCollapsed, setJobsCollapsed] = useState(false)
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  // The map family is chosen once by the host at start and stored on the
  // session, so every player renders the same map for the whole match. There
  // is no in-game switch between families.
  const mapFamily = (selectedMapFamily || state.mapFamily || 'CITY').toLowerCase() === 'district' ? 'district' : 'city'
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

  // Play 'dropped' whenever any packet transitions to EXPIRED or DROPPED.
  const prevFlowStatusesRef = useRef({})
  useEffect(() => {
    const flows = state.packetFlows || []
    flows.forEach((f) => {
      const prev = prevFlowStatusesRef.current[f.id]
      if (prev === 'PENDING' && (f.status === 'EXPIRED' || f.status === 'DROPPED')) {
        play('dropped')
      }
    })
    prevFlowStatusesRef.current = Object.fromEntries(flows.map((f) => [f.id, f.status]))
  }, [state.packetFlows, play])

  // About-to-expire warning — fires once per packet when it enters the last 4 seconds.
  // Uses serverTime to correct for clock skew between browser and backend.
  const warnedPacketsRef = useRef(new Set())
  useEffect(() => {
    const flows = state.packetFlows || []
    const serverNow = parseInstant(state.serverTime)
    const now = serverNow || Date.now()
    flows.forEach((f) => {
      if (f.status !== 'PENDING' || warnedPacketsRef.current.has(f.id)) return
      const expiry = parseInstant(f.expiresAt)
      if (expiry && expiry - now <= 4000) {
        warnedPacketsRef.current.add(f.id)
        play('aboutToExpire')
      }
    })
  }, [state.packetFlows, state.serverTime, play])

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
      // Resolve the target nodeId outside the setter so we can call play() reliably.
      setRoutePath((prev) => {
        const nodeId = item.kind === 'node'
          ? item.data.id
          : nextNodeFromLink(item.data, prev[prev.length - 1])
        if (!nodeId) {
          setRouteNotice('Click a highlighted next-hop link connected to your current node.')
          return prev
        }
        const existingIndex = prev.indexOf(nodeId)
        if (existingIndex >= 0) {
          setRouteNotice(null)
          return prev.slice(0, existingIndex + 1)
        }
        const last = prev[prev.length - 1]
        if (last === selectedPacket.destinationNodeId) {
          setRouteNotice('Route already reaches the destination — submit it, or Undo to change it.')
          return prev
        }
        if (!last || connected(state.links || [], last, nodeId)) {
          setRouteNotice(null)
          return [...prev, nodeId]
        }
        if (linkExists(state.links || [], last, nodeId)) {
          setRouteNotice(`The link from ${friendlyNodeName(last)} to ${friendlyNodeName(nodeId)} is down — pick a glowing cyan neighbour instead.`)
        } else {
          setRouteNotice(`${friendlyNodeName(nodeId)} isn't connected to ${friendlyNodeName(last)}. Pick a glowing cyan neighbour.`)
        }
        return prev
      })

      // Determine validity outside the setter for the audio call.
      const prev = routePath
      const nodeId = item.kind === 'node'
        ? item.data.id
        : nextNodeFromLink(item.data, prev[prev.length - 1])
      if (!nodeId) {
        play('hopInvalid')
      } else if (prev.indexOf(nodeId) >= 0) {
        play('hopValid') // trim back counts as valid navigation
      } else if (prev[prev.length - 1] === selectedPacket.destinationNodeId) {
        play('hopInvalid')
      } else if (!prev[prev.length - 1] || connected(state.links || [], prev[prev.length - 1], nodeId)) {
        play('hopValid')
      } else {
        play('hopInvalid')
      }
      return
    }

    setSelected(item)
    // Clicking a node/link with no active route is a misclick — signal it.
    if (item.kind === 'node' || item.kind === 'link') {
      play('hopInvalid')
    }
  }

  const handleSelectPacket = (flow) => {
    setSelectedPacket(flow)
    setRoutePath(flow ? [flow.sourceNodeId] : [])
    setRouteNotice(null)
    setSelected(null)
  }

  return (
    <div className={`hud ${!panels.jobs ? 'jobs-hidden' : jobsCollapsed ? 'jobs-collapsed' : ''}`}>
      <TopBar state={state} transport={transport} panels={panels} onToggle={toggle} />

      {panels.jobs && (
        <aside className={`hud-left ${jobsCollapsed ? 'collapsed' : ''}`}>
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={jobsCollapsed ? 'Expand packet jobs' : 'Collapse packet jobs'}
            aria-expanded={!jobsCollapsed}
            onClick={() => setJobsCollapsed((value) => !value)}
          >
            {jobsCollapsed ? '>' : '<'}
          </button>
          {!jobsCollapsed && (
            <PacketJobsPanel
              state={state}
              playerId={playerId}
              selectedPacketId={selectedPacket?.id}
              onSelectPacket={handleSelectPacket}
            />
          )}
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

/**
 * Parse a Java Instant from the backend into a JS epoch ms number.
 * Handles ISO strings ("2026-06-02T14:30:00Z"), plain numbers (epoch seconds
 * or ms), and Jackson's array format ([year, month, day, ...]).
 */
function parseInstant(value) {
  if (!value) return null
  if (typeof value === 'number') {
    // Epoch seconds (< 1e11) vs epoch ms
    return value < 1e11 ? value * 1000 : value
  }
  if (Array.isArray(value)) {
    // Jackson LocalDateTime array: [year, month, day, hour, minute, second, nano]
    const [y, mo, d, h = 0, mi = 0, s = 0] = value
    return Date.UTC(y, mo - 1, d, h, mi, s)
  }
  // ISO string — standard Date.parse
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}
