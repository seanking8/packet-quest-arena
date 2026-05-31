import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  isWeather, incidentMeta, affectedSummary, remainingSeconds, zoneCenter,
} from './incidents'

function ringPoints(radius, segments = 64) {
  const pts = []
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
  }
  return pts
}

function ZoneTooltip({ incident, serverTime }) {
  const meta = incidentMeta(incident.eventType)
  const remaining = remainingSeconds(incident, serverTime)
  return (
    <Html center distanceFactor={70} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="zone-tooltip" style={{ borderColor: meta.color }}>
        <div className="zone-tt-head">
          <span className="zone-tt-icon">{meta.icon}</span>
          <strong>{meta.label}</strong>
        </div>
        {incident.message && <div className="zone-tt-msg">{incident.message}</div>}
        <dl className="zone-tt-kv">
          <dt>Affected</dt><dd>{affectedSummary(incident)}</dd>
          <dt>Severity</dt><dd>{Math.round((incident.severity || 0) * 100)}%</dd>
          {remaining != null && (<><dt>Time left</dt><dd>{remaining}s</dd></>)}
          <dt>Impact</dt><dd>{meta.impact}</dd>
        </dl>
      </div>
    </Html>
  )
}

function Zone({ incident, center, serverTime }) {
  const meta = incidentMeta(incident.eventType)
  const weather = isWeather(incident.eventType)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const beaconRef = useRef()

  // Gentle pulse so active zones read as "live" without dominating the scene.
  useFrame((s) => {
    if (!beaconRef.current) return
    const t = s.clock.elapsedTime
    beaconRef.current.material.emissiveIntensity = 0.6 + Math.sin(t * 2.4) * 0.25
  })

  const ring = useMemo(() => ringPoints(center.radius), [center.radius])

  return (
    <group position={[center.x, 0, center.z]}>
      {/* Flat translucent fill — no pointer handlers, so it never blocks node clicks. */}
      {weather && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <circleGeometry args={[center.radius, 48]} />
          <meshBasicMaterial color={meta.color} transparent opacity={incident.eventType === 'WEATHER_CLEAR' ? 0.07 : 0.12} depthWrite={false} />
        </mesh>
      )}

      <ZoneVisual incident={incident} center={center} meta={meta} weather={weather} />

      <group position={[0, 0.08, 0]}>
        <Line points={ring} color={meta.color} lineWidth={weather ? 1.2 : 1.6} transparent opacity={0.55} dashed={!weather} dashSize={1.4} gapSize={0.9} />
      </group>

      {/* Central beacon — the hover/click target and a clear marker. */}
      <mesh
        position={[0, 3, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); setPinned((value) => !value) }}
      >
        <cylinderGeometry args={[0.18, 0.18, 6, 6]} />
        <meshBasicMaterial color={meta.color} transparent opacity={0.5} />
      </mesh>
      <mesh ref={beaconRef} position={[0, 6.4, 0]}>
        <sphereGeometry args={[0.7, 14, 14]} />
        <meshStandardMaterial color={meta.color} emissive={meta.color} emissiveIntensity={0.7} />
      </mesh>

      {/* Always-on icon chip; full details on hover. */}
      <Html position={[0, 7.6, 0]} center distanceFactor={90} style={{ pointerEvents: 'none' }}>
        <div className="zone-chip" style={{ borderColor: meta.color }}>{meta.icon}</div>
      </Html>

      {(hovered || pinned) && <group position={[0, 8.5, 0]}><ZoneTooltip incident={incident} serverTime={serverTime} /></group>}
    </group>
  )
}

function ZoneVisual({ incident, center, meta, weather }) {
  switch (incident.eventType) {
    case 'WEATHER_ELECTRICAL_STORM':
      return <StormVisual color={meta.color} radius={center.radius} />
    case 'WEATHER_HIGH_WINDS':
      return <WindVisual color={meta.color} radius={center.radius} />
    case 'WEATHER_CLEAR':
      return <ClearVisual color={meta.color} radius={center.radius} />
    case 'CONSTRUCTION':
      return <ConstructionVisual color={meta.color} radius={center.radius} />
    case 'FIBRE_CUT':
    case 'LINK_FAILURE':
      return <CutVisual color={meta.color} />
    case 'BUILDING_OBSTRUCTION':
      return <ObstructionVisual color={meta.color} radius={center.radius} />
    case 'POWER_OUTAGE':
    case 'NODE_FAILURE':
    case 'NODE_DEGRADED':
      return <OutageVisual color={meta.color} radius={center.radius} />
    default:
      return weather ? null : <IncidentPulse color={meta.color} radius={center.radius} />
  }
}

function StormVisual({ color, radius }) {
  const bolts = [
    [-radius * 0.28, 11, -radius * 0.08],
    [radius * 0.16, 10, radius * 0.18],
  ]
  return (
    <group>
      {[-0.28, 0, 0.28].map((offset, index) => (
        <mesh key={offset} position={[offset * radius, 9 + index * 0.6, (index - 1) * 3]}>
          <sphereGeometry args={[Math.max(3, radius * 0.12), 12, 8]} />
          <meshBasicMaterial color="#2f2b58" transparent opacity={0.45} />
        </mesh>
      ))}
      {bolts.map(([x, y, z], index) => (
        <Line
          key={index}
          points={[
            new THREE.Vector3(x, y, z),
            new THREE.Vector3(x + 2, y - 3, z + 1),
            new THREE.Vector3(x - 1, y - 3.2, z + 2),
            new THREE.Vector3(x + 1.5, y - 6, z + 1.5),
          ]}
          color="#fff0a8"
          lineWidth={2.2}
          transparent
          opacity={0.82}
        />
      ))}
      <IncidentPulse color={color} radius={radius} />
    </group>
  )
}

function WindVisual({ color, radius }) {
  return (
    <group>
      {[-0.5, -0.18, 0.18, 0.5].map((offset, index) => (
        <Line
          key={offset}
          points={[
            new THREE.Vector3(-radius * 0.62, 3 + index * 0.8, offset * radius),
            new THREE.Vector3(-radius * 0.15, 3.4 + index * 0.8, offset * radius + 2),
            new THREE.Vector3(radius * 0.55, 3.1 + index * 0.8, offset * radius - 1),
          ]}
          color={color}
          lineWidth={1.7}
          transparent
          opacity={0.55}
        />
      ))}
    </group>
  )
}

function ClearVisual({ color, radius }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
      <ringGeometry args={[radius * 0.5, radius * 0.55, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.22} />
    </mesh>
  )
}

function ConstructionVisual({ color, radius }) {
  return (
    <group>
      {[-0.42, -0.14, 0.14, 0.42].map((offset, index) => (
        <mesh key={offset} position={[offset * radius, 0.22, 0]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[radius * 0.18, 0.38, 2]} />
          <meshStandardMaterial color={index % 2 ? '#6e4a2c' : color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function CutVisual({ color }) {
  return (
    <group position={[0, 2.2, 0]}>
      <Line points={[new THREE.Vector3(-4, 0, -4), new THREE.Vector3(4, 0, 4)]} color={color} lineWidth={3} />
      <Line points={[new THREE.Vector3(-4, 0, 4), new THREE.Vector3(4, 0, -4)]} color={color} lineWidth={3} />
    </group>
  )
}

function ObstructionVisual({ color, radius }) {
  return (
    <mesh position={[0, 6, 0]}>
      <boxGeometry args={[Math.max(4, radius * 0.18), 12, Math.max(4, radius * 0.18)]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} />
    </mesh>
  )
}

function OutageVisual({ color, radius }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
      <circleGeometry args={[radius * 0.72, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
    </mesh>
  )
}

function IncidentPulse({ color, radius }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
      <ringGeometry args={[radius * 0.72, radius * 0.78, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.32} />
    </mesh>
  )
}

/**
 * Renders weather zones and incident markers from backend state.incidents.
 * Weather and non-weather incidents are toggled independently and styled
 * distinctly. All values come from the backend — nothing is invented here.
 */
export default function IncidentZones({ incidents = [], nodeIndex = {}, serverTime, showWeather = true, showIncidents = true }) {
  const placed = useMemo(() => incidents
    .map((incident) => ({ incident, center: zoneCenter(incident, nodeIndex) }))
    .filter(({ incident, center }) => {
      if (!center) return false
      return isWeather(incident.eventType) ? showWeather : showIncidents
    }), [incidents, nodeIndex, showWeather, showIncidents])

  return (
    <>
      {placed.map(({ incident, center }) => (
        <Zone key={incident.id} incident={incident} center={center} serverTime={serverTime} />
      ))}
    </>
  )
}
