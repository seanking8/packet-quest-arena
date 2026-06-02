import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import TopBar from '../components/hud/TopBar'
import PacketJobsPanel from '../components/hud/PacketJobsPanel'
import LeaderboardPanel from '../components/hud/LeaderboardPanel'
import IncidentFeedPanel from '../components/hud/IncidentFeedPanel'
import RouteControlsPanel from '../components/hud/RouteControlsPanel'
import SelectedDetailPanel from '../components/hud/SelectedDetailPanel'
import TutorialDistrictScene from '../components/map/TutorialDistrictScene'
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
  const [lesson, setLesson] = useState(1)
  const [loadingLesson, setLoadingLesson] = useState(false)
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
    // While the tutorial is paused, report a non-active status so the main
    // HUD timer freezes too (it only ticks while ACTIVE).
    () => createTutorialState({ remainingSeconds, packetStatus, paused, routePath, lesson }),
    [remainingSeconds, packetStatus, paused, routePath, lesson]
  )
  // The active job is the pending one (lesson 2 also lists lesson 1 as done).
  const currentPacket = state.packetFlows.find((f) => f.status === 'PENDING') || state.packetFlows[state.packetFlows.length - 1]
  const routeAssist = useMemo(
    () => buildRouteAssist(state, selectedPacket, routePath),
    [state, selectedPacket, routePath]
  )
  const coach = useMemo(() => {
    if (loadingLesson) {
      return {
        step: 'Loading…',
        title: '⏳ Lesson 2 loading…',
        body: 'Great — lesson 1 complete! Spinning up the next scenario with a broken link and a storm to navigate…',
        tip: 'Hang tight — the next packet job will appear in a moment.',
      }
    }
    return coachCopy({ selectedPacket, routePath, packetStatus, paused, misses, routeAssist, state, lesson })
  }, [loadingLesson, selectedPacket, routePath, packetStatus, paused, misses, routeAssist, state, lesson])

  // Which on-screen target the player should click right now, so we can point
  // a "👉 Click here" cue at the exact element for each step.
  const routeComplete = selectedPacket
    && routePath[routePath.length - 1] === selectedPacket.destinationNodeId
  const cueTarget = packetStatus === 'DELIVERED'
    ? 'none'
    : !selectedPacket
      ? 'route-button'      // step 1: click Route on the job
      : routeComplete
        ? 'submit-button'   // step 4: click Submit route
        : 'next-node'       // steps 2-3: click the glowing next node

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
    setLesson(1)
    setLoadingLesson(false)
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

  const startLessonTwo = () => {
    setLesson(2)
    setLoadingLesson(false)
    setPacketStatus('PENDING')
    setRemainingSeconds(INITIAL_SECONDS)
    setSelected(null)
    setSelectedPacket(null)
    setRoutePath([])
    setRouteNotice(null)
    setLastProgressAt(Date.now())
    setMisses(0)
    setPaused(true)
  }

  const handleTutorialSubmit = async ({ routeStats }) => {
    setPacketStatus('DELIVERED')
    setPaused(true)
    setRouteNotice(null)
    // After lesson 1 is delivered, automatically roll into lesson 2 (hazards).
    if (lesson === 1) {
      setLoadingLesson(true)
      setTimeout(startLessonTwo, 2200)
    }
    return {
      packetStatus: 'DELIVERED',
      latencyMs: routeStats?.latencyMs || 28,
      scoreDelta: lesson >= 2 ? 90 : 120,
    }
  }

  return (
    <div className="hud tutorial-mode">
      <div className="map-layer">
        {/* Tutorial uses the teammate's original district scene verbatim
            (its coaching was authored for this exact map). */}
        {view === 'tactical' ? (
          <TacticalMap
            state={state}
            onSelect={handleSelect}
            routePath={routePath}
            selectedPacket={selectedPacket}
            layers={TUTORIAL_LAYERS}
          />
        ) : (
          <TutorialDistrictScene
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
            cueRouteButton={cueTarget === 'route-button'}
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
            cueSubmit={cueTarget === 'submit-button'}
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

function coachCopy({ selectedPacket, routePath, packetStatus, paused, misses, routeAssist, state, lesson = 1 }) {
  const isHazardLesson = lesson >= 2

  if (packetStatus === 'DELIVERED') {
    return isHazardLesson
      ? {
          step: 'Tutorial complete! 🎉',
          title: '✅ You beat the hazards!',
          body: 'You routed around a broken link and through a storm zone. That\'s the real skill — the network keeps breaking and you adapt.',
          tip: 'Click "Exit tutorial" when you\'re ready to play a live match.',
        }
      : {
          step: 'Lesson 1 done!',
          title: '✅ Packet delivered!',
          body: 'That\'s the basic loop. Next lesson: the network won\'t always be friendly — let\'s handle a broken link and a storm…',
          tip: 'Lesson 2 starts automatically in a moment.',
        }
  }

  if (!selectedPacket) {
    return isHazardLesson
      ? {
          step: 'Lesson 2 · Step 1',
          title: '👉 Click "Route" on the new job',
          body: 'A new VIDEO packet arrived. Click its green "Route" button on the LEFT. Heads up: its direct path is broken, so you\'ll need a detour.',
          tip: 'Look at the map: a RED dashed link is DOWN, and the shaded patch is a STORM zone.',
        }
      : {
          step: 'Lesson 1 · Step 1',
          title: '👉 Click "Route" on a job',
          body: 'Look at the packet jobs on the LEFT. Click the green "Route" button under the CONTROL job to start.',
          tip: 'Each job is one packet you must deliver from its start node to its destination.',
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
      step: isHazardLesson ? 'Lesson 2 · Step 4' : 'Lesson 1 · Step 4',
      title: '👉 Click "Submit route"',
      body: isHazardLesson
        ? `Nicely done — you reached ${destName} despite the broken link. Click "Submit route" to deliver it.`
        : `Your path reached ${destName}! Now click the blue "Submit route" button in the bottom panel to deliver it.`,
      tip: 'Submitting before the timer runs out scores the packet.',
    }
  }

  if (routePath.length <= 1) {
    return isHazardLesson
      ? {
          step: 'Lesson 2 · Step 2',
          title: '⚠️ The direct link is broken',
          body: `From ${currentName}, the straight path is the RED dashed link — it's DOWN, so you can't use it. Click a glowing CYAN node to start routing AROUND it.`,
          tip: 'Cyan markers only ever appear on links you CAN use, so they always steer you past broken ones.',
        }
      : {
          step: 'Lesson 1 · Step 2',
          title: '👉 Click the glowing cyan node',
          body: suggestedName
            ? `You're at the green START node (${currentName}). Click the glowing cyan "CLICK HERE" node — ${suggestedName} — to take your first hop.`
            : `You're at the green START node (${currentName}). Click any glowing cyan node next to it to take your first hop.`,
          tip: 'Cyan = where you can go next. You can click the node, its label, or the cyan link.',
        }
  }

  return isHazardLesson
    ? {
        step: 'Lesson 2 · Step 3',
        title: '🌩️ Now mind the storm',
        body: suggestedName
          ? `Good — you dodged the break. Keep hopping toward the pink END (${destName}). Best next: ${suggestedName}.`
          : `Good — you dodged the break. Keep hopping cyan nodes toward the pink END (${destName}).`,
        tip: 'The shaded STORM zone adds packet loss to WIRELESS links (radio/satellite). FIBRE links through it are much safer — prefer them.',
      }
    : {
        step: 'Lesson 1 · Step 3',
        title: '👉 Keep hopping to the pink END node',
        body: suggestedName
          ? `Good — you're at ${currentName}. Keep clicking glowing cyan nodes toward the pink END beacon (${destName}). Best next: ${suggestedName}.`
          : `Good — you're at ${currentName}. Keep clicking glowing cyan nodes until you reach the pink END beacon (${destName}).`,
        tip: misses || paused ? 'Stuck? Click a glowing cyan node or its link. The pink beacon is your destination.' : 'The bottom panel shows latency, loss and time left as you build.',
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
