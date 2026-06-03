import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { nodeColor, linkColor, nodeSize, isArcLink, isBrokenLink } from './colors'
import { isWeather, incidentColor } from './incidents'
import IncidentZones from './IncidentZones'
import PlanetScene from './PlanetScene'
import {
  DecorBuildings,
  EdgeBuildings,
  NodeModel,
  Roads,
  Greenery,
  StreetTrees,
  TrafficLights,
  Bridges,
  Cars,
  anchorY,
  roadSafeFootprint,
  roadSafePosition,
} from './cityDetails'
import { friendlyNodeName } from '../../utils/mapDisplay'

// Camera presets — y is up, matching backend coordinates.
const VIEWS = {
  close: { pos: [18, 16, 30], target: [0, 2, 0] },
  iso: { pos: [70, 60, 70], target: [10, 0, 0] },
}

// The merged backend topology spans ~±150 (stretched ~2.4x on X, ~2.9x on Z
// from our original layout), which leaves the city nodes too far apart. For
// OUR city map only, compress node/zone/building POSITIONS back to the tighter
// pre-merge proportions — without shrinking the models themselves — so the
// city reads like it did before the merge. Backend + district map are
// untouched; both axes use one factor each so everything stays aligned.
const CITY_SX = 0.94
const CITY_SZ = 0.88

// Remap a backend (x,z) into the compact city layout.
const cx = (x) => (x || 0) * CITY_SX
const cz = (z) => (z || 0) * CITY_SZ

function nodeFootprint(type) {
  switch (type) {
    case 'RADIO_TOWER':
    case 'O_RU':
      return { w: 13, d: 13 }
    case 'CORE':
    case 'DATA_CENTRE':
      return { w: 13, d: 13 }
    case 'UPF':
      return { w: 11, d: 11 }
    case 'SMALL_CELL':
      return { w: 8, d: 8 }
    default:
      return { w: 10, d: 10 }
  }
}

function cityNodePosition(node) {
  if (node.type === 'SATELLITE') return { x: cx(node.x), z: cz(node.z) }
  const x = cx(node.x)
  const z = cz(node.z)
  const { w, d } = nodeFootprint(node.type)
  return roadSafePosition(x, z, w, d, Math.floor(Math.abs(x * 3 + z * 5)))
}

// Return a copy of game state with node / map-object / weather-zone positions
// compressed into the compact city layout. Memoised by the caller.
function toCityLayout(state) {
  if (!state) return state
  const r = (CITY_SX + CITY_SZ) / 2
  return {
    ...state,
    nodes: (state.nodes || []).map((n) => {
      const pos = cityNodePosition(n)
      return { ...n, x: pos.x, z: pos.z }
    }),
    mapObjects: (state.mapObjects || []).map((o) => ({
      ...o, x: cx(o.x), z: cz(o.z),
      sizeX: (o.sizeX || 0) * CITY_SX, sizeZ: (o.sizeZ || 0) * CITY_SZ,
    })),
    incidents: (state.incidents || []).map((i) => (
      i.visualZone
        ? { ...i, visualZone: {
            ...i.visualZone,
            x: cx(i.visualZone.x), z: cz(i.visualZone.z),
            radius: (i.visualZone.radius || 0) * r,
          } }
        : i
    )),
  }
}

function CameraRig({ view, focus }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  useEffect(() => {
    const preset = VIEWS[view] || VIEWS.iso
    camera.position.set(...preset.pos)
    if (controls) {
      controls.target.set(...preset.target)
      controls.update()
    } else {
      camera.lookAt(...preset.target)
    }
  }, [view, camera, controls])

  // Focus an incident: re-centre on its zone. Declared after the view effect so
  // a click that changes both view and focus lands the camera on the incident.
  useEffect(() => {
    if (!focus) return
    // focus.x/z are backend coords; map them into the compact city layout.
    const fx = cx(focus.x)
    const fz = cz(focus.z)
    camera.position.set(fx + 22, 26, fz + 22)
    if (controls) {
      controls.target.set(fx, 0, fz)
      controls.update()
    } else {
      camera.lookAt(fx, 0, fz)
    }
  }, [focus?.key]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// A tall, pulsing light column + floating marker so the sender / receiver of a
// selected packet are impossible to miss in the busy city. A "START"/"END"
// label floats above the beam so it's clear which end is which.
function Beacon({ color, label }) {
  const beam = useRef()
  const marker = useRef()
  useFrame((state) => {
    const p = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3)
    if (beam.current) beam.current.material.opacity = 0.16 + p * 0.24
    if (marker.current) marker.current.position.y = 40 + p * 1.6
  })
  return (
    <group raycast={() => null}>
      <mesh ref={beam} position={[0, 20, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 40, 14, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={marker} position={[0, 40, 0]}>
        <octahedronGeometry args={[1.8, 0]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
      {label && (
        <Html position={[0, 46, 0]} center distanceFactor={140} style={{ pointerEvents: 'none' }}>
          <div className="route-endpoint-label" style={{ '--label-color': color }}>{label}</div>
        </Html>
      )}
    </group>
  )
}

// A pulsing cyan "click here next" cue on every node you're currently allowed
// to add to the route, so building a path in the busy city is obvious.
function HopMarker() {
  const dot = useRef()
  useFrame((state) => {
    if (!dot.current) return
    const p = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4)
    dot.current.position.y = 7 + p * 1.4
    dot.current.material.opacity = 0.55 + p * 0.4
  })
  return (
    <group raycast={() => null}>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 3.1, 28]} />
        <meshBasicMaterial color="#4fe0ff" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={dot} position={[0, 7, 0]}>
        <octahedronGeometry args={[0.85, 0]} />
        <meshBasicMaterial color="#4fe0ff" transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

/** Selection highlight colour for a node, or null when not part of the route. */
function nodeHighlight(isSource, isDest, inPath) {
  if (isSource) return '#36c98d'
  if (isDest) return '#ff7ab6'
  if (inPath) return '#ffd479'
  return null
}

/** Ring colour by node health when not otherwise highlighted. */
function nodeHealthColor(node) {
  if (node.status === 'FAILED') return '#ff5d6c'
  if (node.status === 'DEGRADED') return '#ffb454'
  return nodeColor(node)
}

function NodeMesh({ node, onSelect, inPath, isSource, isDest, isNextHop }) {
  const [hovered, setHovered] = useState(false)
  const failed = node.status === 'FAILED'
  const highlight = nodeHighlight(isSource, isDest, inPath)
  // Ring shows selection first, then health, then the node-type colour.
  const ringColor = highlight || nodeHealthColor(node)
  const active = hovered || inPath || isSource || isDest
  const sat = node.type === 'SATELLITE'
  const s = nodeSize(node.type)

  return (
    <group
      position={[node.x, sat ? node.y : 0, node.z]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect({ kind: 'node', data: node })
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Invisible click/hover target — a tall thin cylinder so the node stays
          selectable even with buildings in front, without overlapping its
          neighbours now that nodes sit close together in the compact layout. */}
      <mesh position={[0, 9, 0]}>
        <cylinderGeometry args={[isNextHop ? s * 1.6 : s * 1.2, isNextHop ? s * 1.6 : s * 1.2, 20, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group scale={failed ? 0.95 : 1}>
        <NodeModel type={node.type} />
      </group>

      {/* Sender / receiver of the packet being routed get a tall light beam
          with a START / END label so each end is unmistakable. */}
      {(isSource || isDest) && (
        <Beacon color={isSource ? '#36c98d' : '#ff7ab6'} label={isSource ? 'START' : 'END'} />
      )}

      {/* Valid next click while building the route. */}
      {/* Show the cyan "click to add" cue on valid next hops, including the
          destination so it's clearly clickable to finish the route. */}
      {isNextHop && !inPath && !isSource && <HopMarker />}

      {/* Base marker ring — makes each node easy to spot in the city and shows
          its selection / health state. */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[s * 1.5, s * 2.1, 28]} />
        <meshBasicMaterial color={ringColor} transparent opacity={active ? 0.9 : 0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {active && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[s * 2.1, 28]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

function linkPoints(a, b, arc) {
  // Attach at the top of each structure (antenna / rooftop), not the ground.
  const start = new THREE.Vector3(a.x, anchorY(a), a.z)
  const end = new THREE.Vector3(b.x, anchorY(b), b.z)
  if (!arc) return [start, end]
  const mid = start.clone().lerp(end, 0.5)
  mid.y += Math.max(4, start.distanceTo(end) * 0.25)
  return [start, mid, end]
}

/** Link colour: route edges glow yellow, candidates cyan, else normal colour. */
function linkLineColor(inRoute, candidate, link) {
  if (inRoute) return '#ffd479'
  if (candidate) return '#4fe0ff'
  return linkColor(link)
}

/** Link thickness: route > candidate > congested > normal. */
function linkLineWidth(inRoute, candidate, status) {
  if (inRoute) return 4
  if (candidate) return 3
  if (status === 'OVERLOADED' || status === 'CONGESTED') return 3
  return 1.6
}

/** Link opacity: solid for route, near-solid for candidates, faded when broken. */
function linkLineOpacity(inRoute, candidate, broken) {
  if (inRoute) return 1
  if (candidate) return 0.95
  if (broken) return 0.6
  return 0.9
}

function LinkLine({ link, a, b, onSelect, inRoute, candidate, affectedColor }) {
  const arc = isArcLink(link.linkType)
  const points = useMemo(() => linkPoints(a, b, arc), [a, b, arc])
  // Route edges glow yellow; valid next-hop candidates glow cyan (matching the
  // node HopMarkers); everything else keeps its normal link colour.
  const color = linkLineColor(inRoute, candidate, link)
  const broken = isBrokenLink(link.status)
  const mid = points[Math.floor(points.length / 2)]
  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={linkLineWidth(inRoute, candidate, link.status)}
        dashed={broken}
        dashSize={1}
        gapSize={0.6}
        transparent
        opacity={linkLineOpacity(inRoute, candidate, broken)}
      />
      {/* At-risk overlay: this link is touched by an active weather/incident. */}
      {affectedColor && !inRoute && (
        <Line points={points} color={affectedColor} lineWidth={3} dashed dashSize={0.8} gapSize={1.2} transparent opacity={0.55} />
      )}
      {/* small clickable handle at the midpoint for reliable selection */}
      <mesh
        position={[mid.x, mid.y, mid.z]}
        onClick={(e) => {
          e.stopPropagation()
          onSelect({ kind: 'link', data: link })
        }}
      >
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
    </group>
  )
}

function buildingColor(construction, tall) {
  if (construction) return '#caa24a'
  if (tall) return '#3a4775'
  return '#2b3358'
}

function Building({ obj }) {
  const tall = obj.type === 'TALL_OBSTRUCTION'
  const construction = obj.type === 'CONSTRUCTION_ZONE'
  const h = obj.sizeY || 6
  const w = obj.sizeX || 6
  const d = obj.sizeZ || 6
  const safe = roadSafePosition(obj.x, obj.z, w, d, Math.floor((obj.x || 0) + (obj.z || 0)))
  if (!roadSafeFootprint(safe.x, safe.z, w, d, 1.2)) return null
  return (
    <mesh position={[safe.x, h / 2, safe.z]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={buildingColor(construction, tall)}
        transparent
        opacity={tall ? 0.45 : 0.28}
      />
    </mesh>
  )
}

// Daytime city floor: ground, a river along the north edge, a few parks, and a
// faint street grid. Centred on x=10 to match the iso camera target.
const PARKS = [
  { x: -95, z: -18, w: 30, d: 30 },
  { x: 118, z: 8, w: 28, d: 26 },
  { x: 18, z: -58, w: 42, d: 22 },
  { x: -78, z: 20, w: 26, d: 24 },
  { x: 100, z: -22, w: 26, d: 22 },
  { x: -34, z: -56, w: 32, d: 18 },
  { x: 64, z: -54, w: 30, d: 18 },
]

function CityGround() {
  return (
    <group position={[10, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[320, 240]} />
        <meshStandardMaterial color="#74815b" roughness={1} />
      </mesh>
      {/* River along the north edge (clear of the node field). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 82]}>
        <planeGeometry args={[320, 76]} />
        <meshStandardMaterial color="#2f6f9e" emissive="#1d4d72" emissiveIntensity={0.25} roughness={0.4} metalness={0.2} />
      </mesh>
      {PARKS.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.02, p.z]}>
          <planeGeometry args={[p.w, p.d]} />
          <meshStandardMaterial color="#4e7a3f" roughness={1} />
        </mesh>
      ))}
      <Greenery parks={PARKS} />
    </group>
  )
}

// A bright electric packet pulse travelling along the route. Uses a hot
// cyan/white glow (not the player's colour, which can be green and vanish into
// the trees) plus a pulsing halo and a short trailing dot so the direction of
// travel reads clearly.
function Packet({ points }) {
  const head = useRef()
  const halo = useRef()
  const trail = useRef()
  const progress = useRef(0)

  const at = (p) => {
    const t = p * (points.length - 1)
    const i = Math.floor(t)
    const frac = t - i
    const a = points[i]
    const b = points[Math.min(i + 1, points.length - 1)]
    return [
      a.x + (b.x - a.x) * frac,
      a.y + (b.y - a.y) * frac + 1.6,
      a.z + (b.z - a.z) * frac,
    ]
  }

  useFrame((state, delta) => {
    if (points.length < 2) return
    progress.current = (progress.current + delta * 0.25) % 1
    const [x, y, z] = at(progress.current)
    if (head.current) head.current.position.set(x, y, z)
    if (halo.current) {
      halo.current.position.set(x, y, z)
      // Blink the halo so it pulses as it moves forward.
      const pulse = 0.55 + 0.45 * Math.sin(state.clock.elapsedTime * 9)
      halo.current.material.opacity = 0.25 + pulse * 0.4
      const s = 1 + pulse * 0.5
      halo.current.scale.set(s, s, s)
    }
    if (trail.current) {
      const tp = (progress.current - 0.05 + 1) % 1
      const [tx, ty, tz] = at(tp)
      trail.current.position.set(tx, ty, tz)
    }
  })

  return (
    <group raycast={() => null}>
      {/* trailing spark */}
      <mesh ref={trail}>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshBasicMaterial color="#bff4ff" transparent opacity={0.5} />
      </mesh>
      {/* pulsing halo */}
      <mesh ref={halo}>
        <sphereGeometry args={[1.1, 12, 12]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* bright core */}
      <mesh ref={head}>
        <sphereGeometry args={[0.62, 12, 12]} />
        <meshStandardMaterial color="#eaffff" emissive="#00e5ff" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

function SceneContent({ state, onSelect, routePath, selectedPacket, layers }) {
  const { weather: showWeather = true, incidents: showIncidents = true, labels: showLabels = false } = layers || {}

  const nodeIndex = useMemo(() => {
    const map = {}
    ;(state.nodes || []).forEach((n) => (map[n.id] = n))
    return map
  }, [state.nodes])

  // Links touched by an active weather/incident — coloured by the incident so
  // players can see which paths are risky even before status flips.
  const affectedLinkColor = useMemo(() => {
    const map = new Map()
    ;(state.incidents || []).forEach((inc) => {
      const weather = isWeather(inc.eventType)
      if (weather ? !showWeather : !showIncidents) return
      const color = incidentColor(inc.eventType)
      const types = new Set(inc.affectedLinkTypes || [])
      ;(inc.affectedLinkIds || []).forEach((id) => { if (!map.has(id)) map.set(id, color) })
      if (types.size) {
        ;(state.links || []).forEach((l) => {
          if (types.has(l.linkType) && !map.has(l.id)) map.set(l.id, color)
        })
      }
    })
    return map
  }, [state.incidents, state.links, showWeather, showIncidents])

  const playerColor = useMemo(() => {
    const map = {}
    ;(state.players || []).forEach((p) => (map[p.id] = p.color))
    return map
  }, [state.players])

  const packets = useMemo(() => {
    return (state.packetFlows || [])
      .filter((f) => Array.isArray(f.selectedPath) && f.selectedPath.length >= 2)
      .map((f) => ({
        id: f.id,
        color: playerColor[f.ownerPlayerId] || '#ffffff',
        points: f.selectedPath
          .map((id) => nodeIndex[id])
          .filter(Boolean)
          .map((n) => ({ x: n.x, y: anchorY(n), z: n.z })),
      }))
      .filter((p) => p.points.length >= 2)
  }, [state.packetFlows, nodeIndex, playerColor])

  const pathSet = useMemo(() => new Set(routePath), [routePath])
  const routeEdges = useMemo(() => {
    const edges = new Set()
    for (let i = 0; i < routePath.length - 1; i += 1) {
      edges.add(edgeKey(routePath[i], routePath[i + 1]))
    }
    return edges
  }, [routePath])
  const sourceId = selectedPacket?.sourceNodeId
  const destId = selectedPacket?.destinationNodeId

  // While building a route, the nodes you're actually allowed to click next:
  // neighbours of the current path end that aren't already on the path.
  const lastInPath = routePath.at(-1)
  // While building a route, the valid next moves from the current path end:
  // usable links to unvisited neighbours. We track both the neighbour node ids
  // (for the cyan markers) and the candidate edges (so the links glow too).
  const { nextHops, nextHopEdges } = useMemo(() => {
    const nodes = new Set()
    const edges = new Set()
    if (!selectedPacket || !lastInPath || lastInPath === destId) {
      return { nextHops: nodes, nextHopEdges: edges }
    }
    ;(state.links || []).forEach((l) => {
      if (isBrokenLink(l.status)) return // can't route through a dead link
      let neighbour = null
      if (l.sourceNodeId === lastInPath && !pathSet.has(l.targetNodeId)) neighbour = l.targetNodeId
      else if (l.targetNodeId === lastInPath && !pathSet.has(l.sourceNodeId)) neighbour = l.sourceNodeId
      if (neighbour) {
        nodes.add(neighbour)
        edges.add(edgeKey(l.sourceNodeId, l.targetNodeId))
      }
    })
    return { nextHops: nodes, nextHopEdges: edges }
  }, [selectedPacket, lastInPath, destId, state.links, pathSet])

  return (
    <>
      <hemisphereLight args={['#dce8ff', '#5b6446', 0.7]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[60, 95, 35]} intensity={1.5} color="#fff4dc" />
      <CityGround />
      <Roads />
      <Bridges />
      <TrafficLights />
      <Cars />
      <StreetTrees nodes={state.nodes || []} />
      <DecorBuildings nodes={state.nodes || []} links={state.links || []} nodeIndex={nodeIndex} />
      <EdgeBuildings nodes={state.nodes || []} />

      {(state.mapObjects || []).map((o) => (
        <Building key={o.id} obj={o} />
      ))}

      {(state.links || []).map((link) => {
        const a = nodeIndex[link.sourceNodeId]
        const b = nodeIndex[link.targetNodeId]
        if (!a || !b) return null
        return (
          <LinkLine
            key={link.id}
            link={link}
            a={a}
            b={b}
            onSelect={onSelect}
            inRoute={routeEdges.has(edgeKey(link.sourceNodeId, link.targetNodeId))}
            candidate={nextHopEdges.has(edgeKey(link.sourceNodeId, link.targetNodeId))}
            affectedColor={affectedLinkColor.get(link.id)}
          />
        )
      })}

      {(state.nodes || []).map((n) => (
        <NodeMesh
          key={n.id}
          node={n}
          onSelect={onSelect}
          inPath={pathSet.has(n.id)}
          isSource={n.id === sourceId}
          isDest={n.id === destId}
          isNextHop={nextHops.has(n.id)}
        />
      ))}

      {showLabels && (state.nodes || []).map((n) => (
        <Html key={`lbl-${n.id}`} position={[n.x, anchorY(n) + 4, n.z]} center distanceFactor={150} style={{ pointerEvents: 'none' }}>
          <div className="node-label">{friendlyNodeName(n)}</div>
        </Html>
      ))}

      <IncidentZones
        incidents={state.incidents || []}
        nodeIndex={nodeIndex}
        serverTime={state.serverTime}
        showWeather={showWeather}
        showIncidents={showIncidents}
      />

      {packets.map((p) => (
        <Packet key={p.id} points={p.points} />
      ))}
    </>
  )
}

export default function NetworkScene({ state, onSelect, routePath = [], selectedPacket = null, view = 'iso', layers, focus }) {
  const planet = view === 'planet'
  // Compact city layout (positions only) so nodes sit close like pre-merge.
  const cityState = useMemo(() => toCityLayout(state), [state])

  if (!state?.nodes?.length) {
    return (
      <div className="map-placeholder">
        <div className="map-placeholder-inner">
          <h2>Waiting for topology…</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="scene-wrap">
      <div style={{ position: 'absolute', inset: 0, visibility: planet ? 'hidden' : 'visible' }}>
        <Canvas camera={{ position: VIEWS.iso.pos, fov: 45 }} onPointerMissed={() => onSelect(null)}>
          <color attach="background" args={['#9fb3cf']} />
          <fog attach="fog" args={['#9fb3cf', 180, 360]} />
          <CameraRig view={view} focus={focus} />
          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
          <SceneContent state={cityState} onSelect={onSelect} routePath={routePath} selectedPacket={selectedPacket} layers={layers} />
        </Canvas>
      </div>

      {planet && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <PlanetScene state={state} />
          <div className="planet-overlay-label">
            <span>Satellite Network Overview</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {(state.nodes || []).filter(n => n.type === 'SATELLITE').length} satellites active
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function edgeKey(a, b) {
  return [a, b].sort((x, y) => x.localeCompare(y)).join('--')
}
