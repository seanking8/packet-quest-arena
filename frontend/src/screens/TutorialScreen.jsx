import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import TopBar from '../components/hud/TopBar'
import PacketJobsPanel from '../components/hud/PacketJobsPanel'
import LeaderboardPanel from '../components/hud/LeaderboardPanel'
import IncidentFeedPanel from '../components/hud/IncidentFeedPanel'
import RouteControlsPanel from '../components/hud/RouteControlsPanel'
import SelectedDetailPanel from '../components/hud/SelectedDetailPanel'
import NetworkScene from '../components/map/NetworkScene'
import TacticalMap from '../components/map/TacticalMap'
import { createTutorialState } from '../tutorial/tutorialState'
import { buildRouteAssist, isUsableLink } from '../utils/routeAssist'
import { friendlyNodeName } from '../utils/mapDisplay'
import { affectedSummary, incidentMeta, isWeather } from '../components/map/incidents'

const PLAYER_ID = 'tutorial-player'
const INITIAL_SECONDS = 75
const STUCK_AFTER_MS = 9000
const DEFAULT_PANELS = { jobs: true, leaderboard: false, incidents: true, route: true }
const TUTORIAL_LAYERS = { weather: true, incidents: true, labels: false }

export default function TutorialScreen() {
  const { leave } = useGame()
  const [remainingSeconds, setRemainingSeconds] = useState(INITIAL_SECONDS)
  const [packetStatus, setPacketStatus] = useState('PENDING')
  const [paused, setPaused] = useState(true)
  const [panels, setPanels] = useState(DEFAULT_PANELS)
  const [view, setView] = useState('iso')
  const [selected, setSelected] = useState(null)
  const [selectedPacket, setSelectedPacket] = useState(null)
  const [routePath, setRoutePath] = useState([])
  const [routeNotice, setRouteNotice] = useState(null)
  const [lastProgressAt, setLastProgressAt] = useState(Date.now())
  const [misses, setMisses] = useState(0)

  const state = useMemo(
    () => createTutorialState({ remainingSeconds, packetStatus }),
    [remainingSeconds, packetStatus]
  )
  const currentPacket = state.packetFlows[0]
  const routeAssist = useMemo(
    () => buildRouteAssist(state, selectedPacket, routePath),
    [state, selectedPacket, routePath]
  )
  const coach = useMemo(
    () => coachCopy({ selectedPacket, routePath, packetStatus, paused, misses, routeAssist, state }),
    [selectedPacket, routePath, packetStatus, paused, misses, routeAssist, state]
  )

  useEffect(() => {
    if (!selectedPacket || currentPacket.status !== 'PENDING') return
    setSelectedPacket(currentPacket)
  }, [currentPacket, selectedPacket])

  useEffect(() => {
    if (paused || packetStatus === 'DELIVERED') return undefined
    const id = setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 1) {
          setPaused(true)
          setRouteNotice('Timer paused: in a real match this would expire. Use the hint, then try the route again.')
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [paused, packetStatus])

  useEffect(() => {
    if (!selectedPacket || paused || packetStatus === 'DELIVERED') return undefined
    const id = setInterval(() => {
      if (Date.now() - lastProgressAt > STUCK_AFTER_MS) {
        setPaused(true)
        setMisses((value) => Math.max(value, 1))
        setRouteNotice('Timer paused: click a glowing cyan NEXT marker, BEST NEXT marker, or the cyan link beside it.')
      }
    }, 750)
    return () => clearInterval(id)
  }, [lastProgressAt, packetStatus, paused, selectedPacket])

  const toggle = (name) => setPanels((p) => ({ ...p, [name]: !p[name] }))

  const resetTutorial = () => {
    setRemainingSeconds(INITIAL_SECONDS)
    setPacketStatus('PENDING')
    setPaused(true)
    setSelected(null)
    setSelectedPacket(null)
    setRoutePath([])
    setRouteNotice(null)
    setLastProgressAt(Date.now())
    setMisses(0)
  }

  const handleSelectPacket = (flow) => {
    if (!flow) {
      setSelectedPacket(null)
      setRoutePath([])
      setRouteNotice(null)
      setPaused(true)
      return
    }

    setSelectedPacket(flow)
    setSelected(null)
    setRoutePath([flow.sourceNodeId])
    setRouteNotice('Good. The green START beacon is your packet source. Click BEST NEXT to extend the path.')
    setPaused(false)
    setLastProgressAt(Date.now())
  }

  const handleSelect = (item) => {
    if (!item) {
      setSelected(null)
      return
    }

    if ((item.kind === 'node' || item.kind === 'link') && selectedPacket) {
      extendRouteFromSelection(item)
      return
    }

    if (item.kind === 'node' || item.kind === 'link') {
      setSelected(item)
      setPaused(true)
      setRouteNotice('Start by clicking Route on the packet job. Then the map will highlight the source and valid next hops.')
      return
    }

    setSelected(item)
  }

  const extendRouteFromSelection = (item) => {
    const currentNodeId = routePath[routePath.length - 1] || selectedPacket.sourceNodeId
    const nodeId = item.kind === 'node'
      ? item.data.id
      : nextNodeFromLink(item.data, currentNodeId)

    if (!nodeId) {
      pauseForHint('That link is not attached to your current node. Use the cyan link leaving the highlighted current node.')
      return
    }

    if (nodeId === currentNodeId) {
      setRouteNotice('That is your current node. Pick one of the glowing cyan neighbours to move the packet forward.')
      return
    }

    const existingIndex = routePath.indexOf(nodeId)
    if (existingIndex >= 0) {
      setRoutePath((prev) => prev.slice(0, existingIndex + 1))
      setPaused(false)
      setRouteNotice('Route trimmed back to that node. Continue from the highlighted current point.')
      setLastProgressAt(Date.now())
      return
    }

    if (!connected(state.links || [], currentNodeId, nodeId)) {
      pauseForHint(`${friendlyNodeName(nodeId)} is not connected to ${friendlyNodeName(currentNodeId)}. Choose a cyan NEXT option.`)
      return
    }

    setRoutePath((prev) => [...prev, nodeId])
    setMisses(0)
    setSelected(null)
    setLastProgressAt(Date.now())

    if (nodeId === selectedPacket.destinationNodeId) {
      setPaused(true)
      setRouteNotice('Destination reached. Timer paused: click Submit route in the bottom panel.')
    } else {
      const nextName = routeAssist.suggestedNextId ? friendlyNodeName(routeAssist.suggestedNextId) : 'the next cyan marker'
      setPaused(false)
      setRouteNotice(`Nice hop. Keep going toward ${friendlyNodeName(selectedPacket.destinationNodeId)}; next best option is ${nextName}.`)
    }
  }

  const pauseForHint = (message) => {
    setMisses((value) => value + 1)
    setPaused(true)
    setRouteNotice(`Timer paused: ${message}`)
  }

  const handleTutorialSubmit = async ({ routeStats }) => {
    setPacketStatus('DELIVERED')
    setPaused(true)
    setRouteNotice(null)
    return {
      packetStatus: 'DELIVERED',
      latencyMs: routeStats?.latencyMs || 28,
      scoreDelta: 120,
    }
  }

  return (
    <div className="hud tutorial-mode">
      <div className="map-layer">
        {view === 'tactical' ? (
          <TacticalMap
            state={state}
            onSelect={handleSelect}
            routePath={routePath}
            selectedPacket={selectedPacket}
            layers={TUTORIAL_LAYERS}
          />
        ) : (
          <NetworkScene
            state={state}
            onSelect={handleSelect}
            routePath={routePath}
            selectedPacket={selectedPacket}
            view={view}
            layers={TUTORIAL_LAYERS}
          />
        )}
      </div>

      <div className="view-controls">
        <button className={`toggle ${view === 'close' ? 'on' : ''}`} onClick={() => setView('close')}>Close</button>
        <button className={`toggle ${view === 'iso' ? 'on' : ''}`} onClick={() => setView('iso')}>City</button>
        <button className={`toggle ${view === 'tactical' ? 'on' : ''}`} onClick={() => setView('tactical')}>2D</button>
        <button className={`toggle ${view === 'planet' ? 'on' : ''}`} onClick={() => setView('planet')}>Planet</button>
        <button className="ghost" onClick={() => setView('iso')}>{view === 'planet' ? 'Back to City' : 'Reset'}</button>
      </div>

      <TopBar state={state} transport={paused ? 'tutorial paused' : 'tutorial'} panels={panels} onToggle={toggle} />

      {panels.jobs && (
        <aside className="hud-left">
          <PacketJobsPanel
            state={state}
            playerId={PLAYER_ID}
            selectedPacketId={selectedPacket?.id}
            onSelectPacket={handleSelectPacket}
            timerPaused={paused}
          />
        </aside>
      )}

      <aside className="hud-right tutorial-right">
        <TutorialCoach
          coach={coach}
          incidents={state.incidents || []}
          paused={paused}
          complete={packetStatus === 'DELIVERED'}
          canResume={Boolean(selectedPacket)}
          onResume={() => {
            setPaused(false)
            setRouteNotice(null)
            setLastProgressAt(Date.now())
          }}
          onRestart={resetTutorial}
          onExit={leave}
        />
        {selected && <SelectedDetailPanel selected={selected} onClear={() => setSelected(null)} />}
        {panels.leaderboard && <LeaderboardPanel state={state} playerId={PLAYER_ID} />}
        {panels.incidents && <IncidentFeedPanel state={state} />}
      </aside>

      {panels.route && (
        <div className="hud-bottom">
          <RouteControlsPanel
            state={state}
            playerId={PLAYER_ID}
            selectedPacket={selectedPacket}
            routePath={routePath}
            onRoutePath={setRoutePath}
            routeNotice={routeNotice}
            onClearPacket={() => handleSelectPacket(null)}
            onSubmitRoute={handleTutorialSubmit}
          />
        </div>
      )}
    </div>
  )
}

function TutorialCoach({ coach, incidents, paused, complete, canResume, onResume, onRestart, onExit }) {
  return (
    <section className={`panel tutorial-coach ${paused ? 'paused' : ''} ${complete ? 'complete' : ''}`} aria-live="polite">
      <div className="tutorial-coach-head">
        <span className="tutorial-step">{coach.step}</span>
        <span className={`tutorial-pause-pill ${paused ? 'paused' : ''}`}>{paused ? 'Timer paused' : 'Timer running'}</span>
      </div>
      <h3>{coach.title}</h3>
      <p>{coach.body}</p>
      {incidents.length > 0 && <TutorialConditions incidents={incidents} />}
      {coach.tip && <p className="tutorial-tip">{coach.tip}</p>}
      <div className="tutorial-actions">
        {!complete && paused && canResume && <button onClick={onResume}>Resume timer</button>}
        <button className="ghost" onClick={onRestart}>Restart lesson</button>
        <button className="ghost" onClick={onExit}>{complete ? 'Finish tutorial' : 'Exit tutorial'}</button>
      </div>
    </section>
  )
}

function TutorialConditions({ incidents }) {
  return (
    <div className="tutorial-conditions">
      {incidents.map((incident) => {
        const meta = incidentMeta(incident.eventType)
        return (
          <div key={incident.id} className={`tutorial-condition ${isWeather(incident.eventType) ? 'weather' : 'incident'}`}>
            <strong style={{ color: meta.color }}>{meta.icon} {meta.label}</strong>
            <span>{affectedSummary(incident)}</span>
          </div>
        )
      })}
    </div>
  )
}

function coachCopy({ selectedPacket, routePath, packetStatus, paused, misses, routeAssist, state }) {
  if (packetStatus === 'DELIVERED') {
    return {
      step: 'Complete',
      title: 'Packet delivered',
      body: 'That is the core loop: choose a packet, follow connected network hops, watch route quality, and submit before the timer expires.',
      tip: 'In live play, weather and incidents keep changing the best route while everyone is racing.',
    }
  }

  if (!selectedPacket) {
    return {
      step: 'Step 1',
      title: 'Choose the packet job',
      body: 'Click Route on the CONTROL job. The map will jump to the source and destination so you are not hunting blindly.',
      tip: paused ? 'Notice the STORM and WORK markers too: weather is separate from incidents, and both can make nearby links risky.' : null,
    }
  }

  const nodes = state.nodes || []
  const currentId = routePath[routePath.length - 1]
  const destId = selectedPacket.destinationNodeId
  const suggested = routeAssist.suggestedNextId
  const currentName = friendlyNodeName(nodes.find((n) => n.id === currentId) || currentId)
  const destName = friendlyNodeName(nodes.find((n) => n.id === destId) || destId)
  const suggestedName = suggested ? friendlyNodeName(nodes.find((n) => n.id === suggested) || suggested) : null

  if (currentId === destId) {
    return {
      step: 'Step 4',
      title: 'Submit the completed route',
      body: `Your path reaches ${destName}. Click Submit route in the bottom panel to deliver it and score.`,
      tip: 'The timer is paused here because the tutorial is checking that you know the final action.',
    }
  }

  if (routePath.length <= 1) {
    return {
      step: 'Step 2',
      title: 'Click the first next hop',
      body: suggestedName
        ? `Start at ${currentName}. Click the BEST NEXT marker for ${suggestedName}, or click the cyan link leading to it.`
        : `Start at ${currentName}. Click a glowing cyan neighbour to move the packet forward.`,
      tip: misses ? 'You can click the floating labels, node models, or highlighted link markers. Coloured zones explain why some links look risky.' : 'Storms mostly affect wireless links; construction mostly affects fibre links.',
    }
  }

  return {
    step: 'Step 3',
    title: 'Build the route hop by hop',
    body: suggestedName
      ? `You are now at ${currentName}. The fastest suggested next hop is ${suggestedName}; keep moving toward ${destName}.`
      : `You are now at ${currentName}. Pick any glowing cyan connected node that moves you toward ${destName}.`,
    tip: misses || paused ? 'When the clock pauses, read the cyan markers first. The pink DESTINATION beacon is your goal.' : 'The bottom panel shows latency, loss, hops, and time left. The incident feed explains active map hazards.',
  }
}

function connected(links, a, b) {
  return links.some((link) => isUsableLink(link) && (
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
