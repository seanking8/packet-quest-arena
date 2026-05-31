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
          <meshBasicMaterial color={meta.color} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      )}

      <group position={[0, 0.08, 0]}>
        <Line points={ring} color={meta.color} lineWidth={weather ? 1.2 : 1.6} transparent opacity={0.55} dashed={!weather} dashSize={1.4} gapSize={0.9} />
      </group>

      {/* Central beacon — the hover/click target and a clear marker. */}
      <mesh
        position={[0, 3, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
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

      {hovered && <group position={[0, 8.5, 0]}><ZoneTooltip incident={incident} serverTime={serverTime} /></group>}
    </group>
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