import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { nodeColor, linkColor, nodeSize, isArcLink, isBrokenLink } from './colors'
import { isWeather, incidentColor } from './incidents'
import IncidentZones from './IncidentZones'
import PlanetScene from './PlanetScene'

// Camera presets — y is up, matching backend coordinates.
const VIEWS = {
  close: { pos: [18, 16, 30], target: [0, 2, 0] },
  iso: { pos: [70, 60, 70], target: [10, 0, 0] },
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
    camera.position.set(focus.x + 22, 26, focus.z + 22)
    if (controls) {
      controls.target.set(focus.x, 0, focus.z)
      controls.update()
    } else {
      camera.lookAt(focus.x, 0, focus.z)
    }
  }, [focus?.key]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function nodeMeshGeometry(type) {
  const s = nodeSize(type)
  switch (type) {
    case 'RADIO_TOWER':
    case 'O_RU':
      return <cylinderGeometry args={[0.25 * s, 0.45 * s, 3 * s, 6]} />
    case 'SATELLITE':
      return <octahedronGeometry args={[1.1 * s, 0]} />
    case 'UPF':
      return <sphereGeometry args={[1.0 * s, 16, 16]} />
    case 'CORE':
    case 'DATA_CENTRE':
      return <boxGeometry args={[2.4 * s, 2.0 * s, 2.4 * s]} />
    case 'SMALL_CELL':
      return <boxGeometry args={[0.8 * s, 1.2 * s, 0.8 * s]} />
    default:
      return <boxGeometry args={[1.4 * s, 1.2 * s, 1.4 * s]} />
  }
}

function NodeMesh({ node, onSelect, inPath, isSource, isDest }) {
  const [hovered, setHovered] = useState(false)
  const color = isSource ? '#36c98d' : isDest ? '#ff7ab6' : inPath ? '#ffd479' : nodeColor(node)
  const degraded = node.status === 'DEGRADED'
  const failed = node.status === 'FAILED'
  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
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
        {nodeMeshGeometry(node.type)}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={inPath || isSource || isDest ? 0.9 : failed ? 0.1 : degraded ? 0.6 : 0.35}
          opacity={failed ? 0.6 : 1}
          transparent={failed}
        />
      </mesh>
      {(hovered || inPath || isSource || isDest) && (
        <mesh>
          <sphereGeometry args={[nodeSize(node.type) * 1.6, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} />
        </mesh>
      )}
    </group>
  )
}

function linkPoints(a, b, arc) {
  const start = new THREE.Vector3(a.x, a.y, a.z)
  const end = new THREE.Vector3(b.x, b.y, b.z)
  if (!arc) return [start, end]
  const mid = start.clone().lerp(end, 0.5)
  mid.y += Math.max(4, start.distanceTo(end) * 0.25)
  return [start, mid, end]
}

function LinkLine({ link, a, b, onSelect, inRoute, affectedColor }) {
  const arc = isArcLink(link.linkType)
  const points = useMemo(() => linkPoints(a, b, arc), [a, b, arc])
  const color = inRoute ? '#ffd479' : linkColor(link)
  const broken = isBrokenLink(link.status)
  const mid = points[Math.floor(points.length / 2)]
  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={inRoute ? 4 : link.status === 'OVERLOADED' || link.status === 'CONGESTED' ? 3 : 1.6}
        dashed={broken}
        dashSize={1}
        gapSize={0.6}
        transparent
        opacity={inRoute ? 1 : broken ? 0.6 : 0.9}
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

function Building({ obj }) {
  const tall = obj.type === 'TALL_OBSTRUCTION'
  const construction = obj.type === 'CONSTRUCTION_ZONE'
  const h = obj.sizeY || 6
  return (
    <mesh position={[obj.x, h / 2, obj.z]}>
      <boxGeometry args={[obj.sizeX || 6, h, obj.sizeZ || 6]} />
      <meshStandardMaterial
        color={construction ? '#caa24a' : tall ? '#3a4775' : '#2b3358'}
        transparent
        opacity={tall ? 0.45 : 0.28}
      />
    </mesh>
  )
}

function Packet({ points, color }) {
  const ref = useRef()
  const progress = useRef(0)
  useFrame((_, delta) => {
    if (!ref.current || points.length < 2) return
    progress.current = (progress.current + delta * 0.25) % 1
    const t = progress.current * (points.length - 1)
    const i = Math.floor(t)
    const frac = t - i
    const a = points[i]
    const b = points[Math.min(i + 1, points.length - 1)]
    ref.current.position.set(
      a.x + (b.x - a.x) * frac,
      a.y + (b.y - a.y) * frac + 1.2,
      a.z + (b.z - a.z) * frac
    )
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.6, 10, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
    </mesh>
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
        points: f.selectedPath.map((id) => nodeIndex[id]).filter(Boolean),
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

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[40, 80, 40]} intensity={0.9} />
      <gridHelper args={[240, 24, '#21305e', '#16204a']} position={[10, 0, 0]} />

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
        />
      ))}

      {showLabels && (state.nodes || []).map((n) => (
        <Html key={`lbl-${n.id}`} position={[n.x, (nodeSize(n.type) || 1) * 2 + 2, n.z]} center distanceFactor={120} style={{ pointerEvents: 'none' }}>
          <div className="node-label">{n.label || n.id}</div>
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
        <Packet key={p.id} points={p.points} color={p.color} />
      ))}
    </>
  )
}

export default function NetworkScene({ state, onSelect, routePath = [], selectedPacket = null, view = 'iso', layers, focus }) {
  const planet = view === 'planet'

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
          <color attach="background" args={['#0b1020']} />
          <CameraRig view={view} focus={focus} />
          <OrbitControls makeDefault enablePan enableZoom enableRotate />
          <SceneContent state={state} onSelect={onSelect} routePath={routePath} selectedPacket={selectedPacket} layers={layers} />
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
  return [a, b].sort().join('--')
}
