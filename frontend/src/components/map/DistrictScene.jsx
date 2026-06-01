import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { nodeColor, linkColor, isBrokenLink } from './colors'
import { isWeather, incidentColor } from './incidents'
import IncidentZones from './IncidentZones'
import PlanetScene from './PlanetScene'
import { buildRouteAssist, edgeKey } from '../../utils/routeAssist'
import { districtForNode, friendlyNodeName, friendlyNodeType } from '../../utils/mapDisplay'

// Camera presets. y is up, matching backend coordinates.
const VIEWS = {
  close: { pos: [80, 58, 95], target: [-18, 6, 18] },
  iso: { pos: [190, 145, 190], target: [4, 0, 4] },
}

const DISTRICTS = [
  { id: 'remote', label: 'Remote Hill', x: -136, z: 5, w: 58, d: 70, color: '#2e513d' },
  { id: 'north', label: 'North Suburbs', x: -56, z: 78, w: 92, d: 58, color: '#334e45' },
  { id: 'downtown', label: 'Downtown', x: -8, z: 22, w: 92, d: 76, color: '#394152' },
  { id: 'harbor', label: 'Harbor', x: 24, z: -78, w: 88, d: 64, color: '#344d5b' },
  { id: 'airport', label: 'Airport District', x: 92, z: 74, w: 80, d: 58, color: '#4d4840' },
  { id: 'core', label: 'Core Campus', x: 126, z: 9, w: 98, d: 74, color: '#473d50' },
]

const ROADS = [
  { id: 'r-eastwest', x: 10, z: 7, w: 310, d: 7, rot: 0 },
  { id: 'r-northsouth', x: -24, z: 0, w: 250, d: 7, rot: Math.PI / 2 },
  { id: 'r-harbor', x: 22, z: -49, w: 112, d: 6, rot: 0.18 },
  { id: 'r-airport', x: 72, z: 63, w: 116, d: 6, rot: -0.18 },
  { id: 'r-campus', x: 118, z: 23, w: 84, d: 6, rot: Math.PI / 2 },
  { id: 'r-remote', x: -102, z: 8, w: 70, d: 5, rot: -0.08 },
]

const CITY_BLOCKS = [
  { id: 'dt-1', x: -32, z: 20, w: 12, h: 17, d: 10, color: '#53616e' },
  { id: 'dt-2', x: -6, z: 32, w: 10, h: 24, d: 12, color: '#60717c' },
  { id: 'dt-3', x: 14, z: 16, w: 14, h: 32, d: 10, color: '#566374' },
  { id: 'dt-4', x: -44, z: 48, w: 16, h: 10, d: 14, color: '#5f6a5f' },
  { id: 'north-1', x: -76, z: 68, w: 18, h: 9, d: 14, color: '#56695c' },
  { id: 'north-2', x: -44, z: 92, w: 16, h: 8, d: 16, color: '#63705d' },
  { id: 'harbor-1', x: 6, z: -76, w: 24, h: 8, d: 16, color: '#59646d' },
  { id: 'harbor-2', x: 48, z: -68, w: 30, h: 7, d: 18, color: '#53606c' },
  { id: 'airport-1', x: 80, z: 88, w: 36, h: 7, d: 14, color: '#6d6758' },
  { id: 'airport-2', x: 115, z: 60, w: 28, h: 8, d: 14, color: '#686058' },
  { id: 'core-1', x: 112, z: -26, w: 34, h: 13, d: 18, color: '#665d72' },
  { id: 'core-2', x: 148, z: 22, w: 30, h: 12, d: 20, color: '#62576e' },
]

function CameraRig({ view, focusNodes = [], focusKey = '', focus }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  useEffect(() => {
    if (focusNodes.length >= 2 && view !== 'planet') {
      const anchors = focusNodes.map(nodeAnchor)
      const box = new THREE.Box3().setFromPoints(anchors)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const span = Math.max(size.x, size.z, 55)
      const distance = Math.min(220, Math.max(82, span * 1.15))
      camera.position.set(center.x + distance * 0.78, Math.max(58, distance * 0.55), center.z + distance * 0.88)
      if (controls) {
        controls.target.set(center.x, 7, center.z)
        controls.update()
      } else {
        camera.lookAt(center.x, 7, center.z)
      }
      return
    }

    const preset = VIEWS[view] || VIEWS.iso
    camera.position.set(...preset.pos)
    if (controls) {
      controls.target.set(...preset.target)
      controls.update()
    } else {
      camera.lookAt(...preset.target)
    }
  }, [view, camera, controls, focusKey])

  // Focus an incident after view/route focus so clicking an incident lands there.
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
      ;(state.links || []).forEach((link) => {
        if (incidentTouchesLink(inc, link, nodeIndex) && !map.has(link.id)) map.set(link.id, color)
      })
    })
    return map
  }, [state.incidents, state.links, nodeIndex, showWeather, showIncidents])

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
        points: f.selectedPath.map((id) => nodeIndex[id]).filter(Boolean).map(nodeAnchor),
      }))
      .filter((p) => p.points.length >= 2)
  }, [state.packetFlows, nodeIndex, playerColor])

  const pathSet = useMemo(() => new Set(routePath), [routePath])
  const routeAssist = useMemo(
    () => buildRouteAssist(state, selectedPacket, routePath),
    [state, selectedPacket, routePath]
  )
  const routeEdges = useMemo(() => {
    const edges = new Set()
    for (let i = 0; i < routePath.length - 1; i += 1) {
      edges.add(edgeKey(routePath[i], routePath[i + 1]))
    }
    return edges
  }, [routePath])
  const sourceId = selectedPacket?.sourceNodeId
  const destId = selectedPacket?.destinationNodeId
  const routeMode = routeAssist.active

  return (
    <>
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#cfe8ff', '#243225', 0.52]} />
      <directionalLight position={[80, 110, 60]} intensity={1.1} castShadow={false} />
      <RegionalGround />

      {(state.mapObjects || []).map((o) => (
        <Building key={o.id} obj={o} />
      ))}

      {CITY_BLOCKS.map((o) => (
        <Building key={o.id} obj={o} decorative />
      ))}

      {(state.links || []).map((link) => {
        const a = nodeIndex[link.sourceNodeId]
        const b = nodeIndex[link.targetNodeId]
        if (!a || !b) return null
        const key = edgeKey(link.sourceNodeId, link.targetNodeId)
        const inRoute = routeEdges.has(key)
        const isValidNext = routeAssist.validNextEdges.has(key)
        const isSuggested = routeAssist.suggestedEdges.has(key)
        return (
          <LinkLine
            key={link.id}
            link={link}
            a={a}
            b={b}
            onSelect={onSelect}
            inRoute={inRoute}
            isValidNext={isValidNext}
            isSuggested={isSuggested}
            dimmed={routeMode && !inRoute && !isValidNext && !isSuggested}
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
          isCurrent={n.id === routeAssist.currentId}
          isValidNext={routeAssist.validNextIds.has(n.id)}
          isSuggestedNext={n.id === routeAssist.suggestedNextId}
          dimmed={routeMode && !routeAssist.relevantIds.has(n.id)}
        />
      ))}

      {routeMode && nodeIndex[sourceId] && nodeIndex[destId] && (
        <RouteCorridor
          source={nodeIndex[sourceId]}
          dest={nodeIndex[destId]}
          suggestedPath={routeAssist.suggestedPath.map((id) => nodeIndex[id]).filter(Boolean)}
        />
      )}

      {showLabels && (state.nodes || []).map((n) => (
        <Html key={`lbl-${n.id}`} position={[n.x, nodeAnchorHeight(n.type) + 7, n.z]} center distanceFactor={120} style={{ pointerEvents: 'none' }}>
          <div className="node-mini-label">{friendlyNodeName(n)}</div>
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

function RegionalGround() {
  return (
    <group>
      <mesh position={[8, -0.08, 0]} receiveShadow>
        <boxGeometry args={[350, 0.1, 245]} />
        <meshStandardMaterial color="#253527" roughness={0.95} />
      </mesh>

      <mesh position={[45, 0.02, -119]}>
        <boxGeometry args={[180, 0.08, 34]} />
        <meshStandardMaterial color="#1e5364" roughness={0.9} />
      </mesh>

      {DISTRICTS.map((d) => (
        <group key={d.id}>
          <mesh position={[d.x, 0.01, d.z]}>
            <boxGeometry args={[d.w, 0.08, d.d]} />
            <meshStandardMaterial color={d.color} transparent opacity={0.78} roughness={0.9} />
          </mesh>
          <Html center position={[d.x, 0.5, d.z - d.d / 2 + 8]} className="district-label">
            {d.label}
          </Html>
        </group>
      ))}

      {ROADS.map((r) => (
        <mesh key={r.id} position={[r.x, 0.08, r.z]} rotation={[0, r.rot, 0]}>
          <boxGeometry args={[r.w, 0.08, r.d]} />
          <meshStandardMaterial color="#42484f" roughness={0.8} />
        </mesh>
      ))}

      <gridHelper args={[350, 35, '#5d704d', '#354738']} position={[8, 0.11, 0]} />
    </group>
  )
}

function NodeMesh({
  node,
  onSelect,
  inPath,
  isSource,
  isDest,
  isCurrent,
  isValidNext,
  isSuggestedNext,
  dimmed,
}) {
  const [hovered, setHovered] = useState(false)
  const color = isSource
    ? '#36c98d'
    : isDest
      ? '#ff4f9a'
      : isSuggestedNext
        ? '#b8f7ff'
        : isValidNext
          ? '#66e6ff'
          : inPath
            ? '#ffd479'
            : nodeColor(node)
  const failed = node.status === 'FAILED'
  const degraded = node.status === 'DEGRADED'
  const active = hovered || inPath || isSource || isDest || isCurrent || isValidNext || isSuggestedNext
  const anchor = nodeAnchor(node)
  const hitRadius = node.type === 'SATELLITE' ? 5.2 : node.type === 'DATA_CENTRE' || node.type === 'CORE' ? 8 : 5

  const handleSelect = (e) => {
    e.stopPropagation()
    onSelect({ kind: 'node', data: node })
  }

  return (
    <group position={[node.x, 0, node.z]}>
      <group
        onClick={handleSelect}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <NodeVisual node={node} color={color} failed={failed} degraded={degraded} active={active} dimmed={dimmed} />
        <mesh position={[0, anchor.y, 0]}>
          <sphereGeometry args={[hitRadius, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.02} depthWrite={false} />
        </mesh>
      </group>

      <StatusHalo node={node} color={color} active={active} failed={failed} dimmed={dimmed} onSelect={handleSelect} />
      {(isSource || isDest) && (
        <RouteBeacon
          node={node}
          color={color}
          label={isSource ? 'START' : 'END'}
          onSelect={handleSelect}
        />
      )}
      {isValidNext && !isSource && !isDest && (
        <NextHopMarker node={node} suggested={isSuggestedNext} onSelect={handleSelect} />
      )}
      <NodeLabel
        node={node}
        color={color}
        active={active}
        dimmed={dimmed}
        role={isSource ? 'start' : isDest ? 'dest' : isCurrent ? 'current' : isSuggestedNext ? 'suggested' : isValidNext ? 'next' : null}
        onSelect={handleSelect}
      />
    </group>
  )
}

function NodeVisual({ node, color, failed, degraded, active, dimmed }) {
  const mat = {
    color,
    emissive: color,
    emissiveIntensity: active ? 0.55 : degraded ? 0.35 : failed ? 0.04 : 0.18,
    transparent: failed || dimmed,
    opacity: failed ? 0.55 : dimmed ? 0.38 : 1,
  }

  switch (node.type) {
    case 'RADIO_TOWER':
      return <RadioTower color={color} mat={mat} />
    case 'O_RU':
      return <RooftopRadio color={color} mat={mat} />
    case 'SMALL_CELL':
      return <SmallCell color={color} mat={mat} />
    case 'O_DU':
    case 'O_CU':
      return <TelecomHub color={color} mat={mat} label={node.type === 'O_CU' ? 'CU' : 'DU'} />
    case 'EDGE':
      return <DataCentre color={color} mat={mat} scale={0.72} label="EDGE" />
    case 'UPF':
      return <GatewayExchange color={color} mat={mat} />
    case 'CORE':
      return <DataCentre color={color} mat={mat} scale={1.0} label="CORE" />
    case 'DATA_CENTRE':
      return <DataCentre color={color} mat={mat} scale={1.15} label="CLOUD" />
    case 'SATELLITE':
      return <SatelliteModel y={node.y} color={color} mat={mat} />
    default:
      return <TelecomHub color={color} mat={mat} label="NET" />
  }
}

function RadioTower({ color, mat }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[3.6, 4.2, 0.5, 20]} />
        <meshStandardMaterial color="#34473d" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[5.2, 3.2, 4.2]} />
        <meshStandardMaterial color="#596170" roughness={0.8} />
      </mesh>
      <mesh position={[0, 10.2, 0]}>
        <cylinderGeometry args={[0.32, 0.5, 15.6, 8]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 18.2, 0]}>
        <sphereGeometry args={[1.15, 14, 14]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {[
        [1.4, 13.5, 0],
        [-1.4, 12.2, 0],
        [0, 11.2, 1.4],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.32, 3.2, 1.25]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
        </mesh>
      ))}
      <SignalRing y={16} color={color} radius={4.6} />
    </group>
  )
}

function RooftopRadio({ color, mat }) {
  return (
    <group>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[9, 4, 7]} />
        <meshStandardMaterial color="#5b6470" roughness={0.82} />
      </mesh>
      <mesh position={[0, 5.8, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 4.2, 8]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[1.4, 6.8, 0]}>
        <boxGeometry args={[0.3, 2.4, 1.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
      <SignalRing y={8.2} color={color} radius={3.8} />
    </group>
  )
}

function SmallCell({ color, mat }) {
  return (
    <group>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[2.1, 1.3, 1.8]} />
        <meshStandardMaterial color="#4b5960" roughness={0.82} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.14, 0.22, 5.2, 8]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <boxGeometry args={[0.55, 1.35, 0.55]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

function TelecomHub({ color, mat, label }) {
  return (
    <group>
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[8, 3.6, 6]} />
        <meshStandardMaterial color="#58616d" roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.85, 0]}>
        <boxGeometry args={[7, 0.4, 5]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[-2.5, 4.55, -1.5]}>
        <boxGeometry args={[1.2, 0.7, 1.2]} />
        <meshStandardMaterial color="#323b44" roughness={0.7} />
      </mesh>
      <mesh position={[2.6, 4.8, 1.4]}>
        <cylinderGeometry args={[0.22, 0.28, 1.8, 8]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <Html center position={[0, 6.2, 0]} className="node-mini-label">
        {label}
      </Html>
    </group>
  )
}

function GatewayExchange({ color, mat }) {
  return (
    <group>
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[10, 4.8, 7]} />
        <meshStandardMaterial color="#62636a" roughness={0.78} />
      </mesh>
      <mesh position={[0, 5.1, 0]}>
        <cylinderGeometry args={[2.8, 2.8, 0.35, 24]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 6.1, -1.2]} rotation={[Math.PI / 3, 0, 0]}>
        <cylinderGeometry args={[1.6, 0.5, 0.45, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
    </group>
  )
}

function DataCentre({ color, mat, scale, label }) {
  const s = scale
  return (
    <group scale={[s, s, s]}>
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[16, 6, 11]} />
        <meshStandardMaterial color="#5f6570" roughness={0.82} />
      </mesh>
      <mesh position={[0, 6.4, 0]}>
        <boxGeometry args={[17, 0.5, 12]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {[-5.2, 0, 5.2].map((x) => (
        <mesh key={x} position={[x, 7.05, -2.6]}>
          <boxGeometry args={[2.2, 0.7, 2.1]} />
          <meshStandardMaterial color="#343c45" roughness={0.7} />
        </mesh>
      ))}
      {[-4.5, 0, 4.5].map((x) => (
        <mesh key={x} position={[x, 3, 5.65]}>
          <boxGeometry args={[2.2, 1.2, 0.16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
        </mesh>
      ))}
      <Html center position={[0, 8.5, 0]} className="node-mini-label">
        {label}
      </Html>
    </group>
  )
}

function SatelliteModel({ y, color, mat }) {
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <boxGeometry args={[2.8, 1.4, 1.4]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[3.2, 0, 0]}>
        <boxGeometry args={[3.2, 0.12, 1.5]} />
        <meshStandardMaterial color="#3b75ff" emissive="#3b75ff" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-3.2, 0, 0]}>
        <boxGeometry args={[3.2, 0.12, 1.5]} />
        <meshStandardMaterial color="#3b75ff" emissive="#3b75ff" emissiveIntensity={0.25} />
      </mesh>
      <SignalRing y={0} color={color} radius={5.5} />
    </group>
  )
}

function SignalRing({ y, color, radius }) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.035, 8, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.55} />
    </mesh>
  )
}

function StatusHalo({ node, color, active, failed, dimmed, onSelect }) {
  const anchor = nodeAnchor(node)
  const radius = node.type === 'SATELLITE' ? 6 : node.type === 'DATA_CENTRE' || node.type === 'CORE' ? 8 : 5
  return (
    <mesh position={[0, node.type === 'SATELLITE' ? anchor.y : 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={onSelect}>
      <torusGeometry args={[radius, active ? 0.18 : 0.08, 8, 64]} />
      <meshBasicMaterial color={failed ? '#ff5d6c' : color} transparent opacity={dimmed ? 0.12 : active ? 0.9 : 0.38} />
    </mesh>
  )
}

function RouteBeacon({ node, color, label, onSelect }) {
  const anchor = nodeAnchor(node)
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.08
    ref.current.scale.set(pulse, 1, pulse)
  })

  return (
    <group ref={ref}>
      <Line
        points={[
          new THREE.Vector3(0, 0.6, 0),
          new THREE.Vector3(0, anchor.y + 35, 0),
        ]}
        color={color}
        lineWidth={4}
        transparent
        opacity={0.9}
      />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, anchor.y + 8 + i * 7, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5.5 + i * 1.2, 0.06, 8, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.45 - i * 0.08} />
        </mesh>
      ))}
      <Html
        center
        position={[0, anchor.y + 42, 0]}
        className={`route-beacon-label ${label === 'START' ? 'start' : 'dest'}`}
      >
        <button type="button" onClick={onSelect}>
          {label}
        </button>
      </Html>
    </group>
  )
}

function NextHopMarker({ node, suggested, onSelect }) {
  const anchor = nodeAnchor(node)
  return (
    <Html center position={[0, anchor.y + 18, 0]} className={`next-hop-marker ${suggested ? 'suggested' : ''}`}>
      <button type="button" onClick={onSelect}>
        {suggested ? 'BEST NEXT' : 'NEXT'}
      </button>
    </Html>
  )
}

function NodeLabel({ node, color, active, dimmed, role, onSelect }) {
  const anchor = nodeAnchor(node)
  return (
    <Html
      center
      position={[0, anchor.y + (node.type === 'SATELLITE' ? 5 : 8), 0]}
      className={`node-label ${active ? 'active' : ''} ${dimmed ? 'dimmed' : ''} ${role ? `role-${role}` : ''}`}
      style={{ '--node-color': color }}
    >
      <button type="button" onClick={onSelect}>
        <span>{friendlyNodeName(node)}</span>
        <small>{role === 'start' ? 'source node' : role === 'dest' ? 'destination node' : friendlyNodeType(node.type)}</small>
      </button>
    </Html>
  )
}

function LinkLine({ link, a, b, onSelect, inRoute, isValidNext, isSuggested, dimmed, affectedColor }) {
  const points = useMemo(() => linkPoints(a, b, link), [a, b, link])
  const color = inRoute ? '#ffd479' : isValidNext ? '#66e6ff' : isSuggested ? '#b8f7ff' : linkColor(link)
  const broken = isBrokenLink(link.status)
  const isGround = link.linkType === 'FIBRE' || link.linkType === 'LEGACY'
  const mid = points[Math.floor(points.length / 2)]
  const lineWidth = inRoute
    ? 5.2
    : isValidNext
      ? 4.5
      : isSuggested
        ? 3.4
        : link.status === 'OVERLOADED' || link.status === 'CONGESTED'
          ? 3.8
          : isGround
            ? 2.4
            : 1.8
  const opacity = dimmed ? 0.2 : inRoute ? 1 : isValidNext ? 0.96 : isSuggested ? 0.62 : broken ? 0.48 : isGround ? 0.92 : 0.78
  const selectLink = (e) => {
    e.stopPropagation()
    onSelect({ kind: 'link', data: link })
  }

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        dashed={broken || link.linkType === 'LEGACY' || isSuggested}
        dashSize={1.4}
        gapSize={0.7}
        transparent
        opacity={opacity}
        onClick={selectLink}
      />
      {affectedColor && !inRoute && (
        <Line
          points={points}
          color={affectedColor}
          lineWidth={Math.max(3, lineWidth - 0.4)}
          dashed
          dashSize={0.8}
          gapSize={1.2}
          transparent
          opacity={dimmed ? 0.22 : 0.55}
        />
      )}
      <mesh position={[mid.x, mid.y, mid.z]} onClick={selectLink}>
        <sphereGeometry args={[isValidNext ? 2.4 : 1.35, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.04 : isValidNext ? 0.28 : 0.16} />
      </mesh>
    </group>
  )
}

function RouteCorridor({ source, dest, suggestedPath }) {
  const directPoints = useMemo(() => {
    const a = nodeAnchor(source)
    const b = nodeAnchor(dest)
    const mid = a.clone().lerp(b, 0.5)
    mid.y += Math.max(18, a.distanceTo(b) * 0.12)
    return [a, mid, b]
  }, [source, dest])

  const suggestedPoints = useMemo(() => {
    if (!suggestedPath?.length) return []
    return suggestedPath.map(nodeAnchor)
  }, [suggestedPath])

  return (
    <group>
      <Line points={directPoints} color="#ffffff" lineWidth={1.2} dashed dashSize={2.2} gapSize={1.4} transparent opacity={0.22} />
      {suggestedPoints.length >= 2 && (
        <Line points={suggestedPoints} color="#b8f7ff" lineWidth={2.2} dashed dashSize={1.8} gapSize={0.9} transparent opacity={0.52} />
      )}
    </group>
  )
}

function linkPoints(a, b, link) {
  if (link.linkType === 'FIBRE' || link.linkType === 'LEGACY') {
    const start = new THREE.Vector3(a.x, 0.45, a.z)
    const end = new THREE.Vector3(b.x, 0.45, b.z)
    const mid = new THREE.Vector3((a.x + b.x) / 2, 0.45, (a.z + b.z) / 2)
    const jog = link.linkType === 'FIBRE' ? 5 : -5
    return [
      start,
      new THREE.Vector3(mid.x, 0.45, start.z + jog),
      new THREE.Vector3(mid.x, 0.45, end.z - jog),
      end,
    ]
  }

  const start = nodeAnchor(a)
  const end = nodeAnchor(b)
  const distance = start.distanceTo(end)
  const mid = start.clone().lerp(end, 0.5)
  const lift = link.linkType === 'SATELLITE' ? Math.max(22, distance * 0.18) : Math.max(9, distance * 0.16)
  mid.y += lift
  return [start, mid, end]
}

function Building({ obj, decorative = false }) {
  const construction = obj.type === 'CONSTRUCTION_ZONE'
  const tall = obj.type === 'TALL_OBSTRUCTION'
  const h = obj.sizeY || obj.h || 8
  const sx = obj.sizeX || obj.w || 8
  const sz = obj.sizeZ || obj.d || 8
  const color = obj.color || (construction ? '#b77e36' : tall ? '#636b78' : '#56616a')

  if (construction) {
    return (
      <group position={[obj.x, 0, obj.z]}>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[sx, 0.35, sz]} />
          <meshStandardMaterial color="#8a6638" roughness={0.85} />
        </mesh>
        {[-0.32, 0, 0.32].map((offset, i) => (
          <mesh key={i} position={[offset * sx, 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[sx * 0.18, 0.55, 1.2]} />
            <meshStandardMaterial color={i % 2 ? '#f4c15d' : '#6e4a2c'} roughness={0.8} />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group position={[obj.x, 0, obj.z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[sx, h, sz]} />
        <meshStandardMaterial color={color} transparent opacity={decorative ? 0.9 : tall ? 0.82 : 0.88} roughness={0.82} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[sx * 0.92, 0.3, sz * 0.92]} />
        <meshStandardMaterial color="#2f3941" roughness={0.8} />
      </mesh>
      {h >= 10 && [-0.3, 0.3].map((offset) => (
        <mesh key={offset} position={[offset * sx, h * 0.55, sz / 2 + 0.04]}>
          <boxGeometry args={[sx * 0.22, h * 0.5, 0.08]} />
          <meshStandardMaterial color="#8fb2c8" emissive="#5c8aa5" emissiveIntensity={0.08} transparent opacity={0.65} />
        </mesh>
      ))}
    </group>
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
      <sphereGeometry args={[0.9, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} />
    </mesh>
  )
}

export default function DistrictScene({ state, onSelect, routePath = [], selectedPacket = null, view = 'iso', layers, focus }) {
  const planet = view === 'planet'
  const focusNodes = useMemo(() => {
    if (!selectedPacket || view === 'planet') return []
    const nodes = state?.nodes || []
    const source = nodes.find((n) => n.id === selectedPacket.sourceNodeId)
    const dest = nodes.find((n) => n.id === selectedPacket.destinationNodeId)
    return source && dest ? [source, dest] : []
  }, [state?.nodes, selectedPacket, view])
  const focusKey = selectedPacket && view !== 'planet'
    ? `${selectedPacket.sourceNodeId}|${selectedPacket.destinationNodeId}`
    : ''
  const routeAssist = useMemo(
    () => buildRouteAssist(state || {}, selectedPacket, routePath),
    [state, selectedPacket, routePath]
  )

  if (!state?.nodes?.length) {
    return (
      <div className="map-placeholder">
        <div className="map-placeholder-inner">
          <h2>Waiting for topology...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="scene-wrap">
      <div style={{ position: 'absolute', inset: 0, visibility: planet ? 'hidden' : 'visible' }}>
        <Canvas camera={{ position: VIEWS.iso.pos, fov: 42 }} onPointerMissed={() => onSelect(null)}>
          <color attach="background" args={['#17251d']} />
          <fog attach="fog" args={['#17251d', 175, 420]} />
          <CameraRig view={view} focusNodes={focusNodes} focusKey={focusKey} focus={focus} />
          <OrbitControls makeDefault enablePan enableZoom enableRotate minDistance={35} maxDistance={330} />
          <SceneContent state={state} onSelect={onSelect} routePath={routePath} selectedPacket={selectedPacket} layers={layers} />
        </Canvas>
        <MapLegend />
        <MapRouteAssist state={state} selectedPacket={selectedPacket} routeAssist={routeAssist} />
      </div>

      {planet && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <PlanetScene state={state} />
          <div className="planet-overlay-label">
            <span>Regional Satellite Overview</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {(state.nodes || []).filter(n => n.type === 'SATELLITE').length} emergency relays active
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function MapLegend() {
  return (
    <div className="map-legend" aria-hidden="true">
      <span><i className="legend-tower" /> tower</span>
      <span><i className="legend-dc" /> data centre</span>
      <span><i className="legend-fibre" /> fibre</span>
      <span><i className="legend-radio" /> radio beam</span>
      <span><i className="legend-sat" /> satellite fallback</span>
    </div>
  )
}

function MapRouteAssist({ state, selectedPacket, routeAssist }) {
  if (!selectedPacket || !routeAssist?.active) return null
  const nodes = state.nodes || []
  const source = nodes.find((n) => n.id === selectedPacket.sourceNodeId)
  const dest = nodes.find((n) => n.id === selectedPacket.destinationNodeId)
  const next = nodes.find((n) => n.id === routeAssist.suggestedNextId)
  return (
    <div className="map-route-assist" aria-live="polite">
      <div>
        <span className="assist-chip start">Start</span>
        <strong>{friendlyNodeName(source || selectedPacket.sourceNodeId)}</strong>
        <small>{districtForNode(source || selectedPacket.sourceNodeId)}</small>
      </div>
      <div>
        <span className="assist-chip dest">Deliver</span>
        <strong>{friendlyNodeName(dest || selectedPacket.destinationNodeId)}</strong>
        <small>{districtForNode(dest || selectedPacket.destinationNodeId)}</small>
      </div>
      {next && (
        <div>
          <span className="assist-chip next">Best next</span>
          <strong>{friendlyNodeName(next)}</strong>
          <small>{districtForNode(next)}</small>
        </div>
      )}
    </div>
  )
}

function incidentTouchesLink(incident, link, nodeIndex) {
  const affectedIds = new Set(incident.affectedLinkIds || [])
  if (affectedIds.has(link.id)) return true

  const affectedTypes = new Set(incident.affectedLinkTypes || [])
  if (!affectedTypes.has(link.linkType)) return false

  const zone = incident.visualZone
  if (!zone || !Number.isFinite(zone.x) || !Number.isFinite(zone.z)) return true

  const a = nodeIndex[link.sourceNodeId]
  const b = nodeIndex[link.targetNodeId]
  if (!a || !b) return false

  const radius = Math.max(0, zone.radius || 0) + 4
  const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }
  return pointInZone(a, zone, radius) || pointInZone(b, zone, radius) || pointInZone(mid, zone, radius)
}

function pointInZone(point, zone, radius) {
  const dx = (point.x || 0) - zone.x
  const dz = (point.z || 0) - zone.z
  return Math.sqrt(dx * dx + dz * dz) <= radius
}

function nodeAnchor(node) {
  const y = node.type === 'SATELLITE' ? node.y : nodeAnchorHeight(node.type)
  return new THREE.Vector3(node.x, y, node.z)
}

function nodeAnchorHeight(type) {
  switch (type) {
    case 'RADIO_TOWER':
      return 18
    case 'O_RU':
      return 8.2
    case 'SMALL_CELL':
      return 6.4
    case 'CORE':
    case 'DATA_CENTRE':
      return 9
    case 'EDGE':
    case 'UPF':
    case 'O_DU':
    case 'O_CU':
      return 6.2
    default:
      return 5
  }
}
