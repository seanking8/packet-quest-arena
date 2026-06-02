import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { nodeColor, linkColor, isBrokenLink } from './colors'

const PLANET_R = 14
const ORBIT_R = 22
const SATELLITE_SPEED = 0.12

/**
 * Photoreal-ish Earth: a real NASA day-map wrapped on the sphere, a slowly
 * drifting cloud layer, and an additive back-side shell for the blue
 * atmosphere rim. Lit by a directional "sun" so one side is bright (see the
 * lights in PlanetScene), matching the reference look.
 */
function Earth() {
  const earthRef = useRef()
  const cloudRef = useRef()
  const [day, clouds] = useTexture([
    '/textures/earth_daymap.jpg',
    '/textures/earth_clouds.png',
  ])
  day.colorSpace = THREE.SRGBColorSpace
  clouds.colorSpace = THREE.SRGBColorSpace

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.03
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.045
  })

  return (
    <group>
      {/* Atmosphere glow — a slightly larger shell rendered inside-out. */}
      <mesh scale={1.07}>
        <sphereGeometry args={[PLANET_R, 64, 64]} />
        <meshBasicMaterial
          color="#3a86ff"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* The planet itself. emissiveMap keeps the night side dimly visible. */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[PLANET_R, 64, 64]} />
        <meshStandardMaterial
          map={day}
          emissiveMap={day}
          emissive="#16305a"
          emissiveIntensity={0.35}
          roughness={0.85}
          metalness={0.0}
        />
      </mesh>

      {/* Drifting cloud layer. */}
      <mesh ref={cloudRef} scale={1.015}>
        <sphereGeometry args={[PLANET_R, 64, 64]} />
        <meshStandardMaterial map={clouds} transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  )
}

function OrbitRing({ radius = ORBIT_R, tilt = 0 }) {
  const points = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 96; i += 1) {
      const a = (i / 96) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    return pts
  }, [radius])
  return (
    <group rotation={[tilt, 0, 0]}>
      <Line points={points} color="#5ad0ff" lineWidth={1.2} transparent opacity={0.5} />
    </group>
  )
}

function SatelliteNode({ node, position }) {
  const color = nodeColor(node)
  const failed = node.status === 'FAILED'
  const degraded = node.status === 'DEGRADED'
  const bodyEmissive = failed ? 0.1 : degraded ? 0.5 : 1.0

  return (
    <group position={position} scale={1.35}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[1.1, 0.8, 0.8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={bodyEmissive}
          metalness={0.6}
          roughness={0.3}
          opacity={failed ? 0.5 : 1}
          transparent={failed}
        />
      </mesh>
      {/* Boom connecting the two solar-panel wings */}
      <mesh>
        <boxGeometry args={[3.6, 0.05, 0.05]} />
        <meshStandardMaterial color="#9aa7c0" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Solar panels */}
      <mesh position={[1.75, 0, 0]}>
        <boxGeometry args={[2.0, 0.06, 0.9]} />
        <meshStandardMaterial color="#2f5fd0" emissive="#1b3a8a" emissiveIntensity={0.55} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[-1.75, 0, 0]}>
        <boxGeometry args={[2.0, 0.06, 0.9]} />
        <meshStandardMaterial color="#2f5fd0" emissive="#1b3a8a" emissiveIntensity={0.55} metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  )
}

function SatelliteBeam({ link, satellitePosition, groundNode }) {
  const color = linkColor(link)
  const broken = isBrokenLink(link.status)
  const ground = useMemo(() => cityToPlanet(groundNode, PLANET_R + 0.2), [groundNode])
  const satPos = useMemo(() => new THREE.Vector3(...satellitePosition), [satellitePosition])
  const mid = ground.clone().lerp(satPos, 0.5).multiplyScalar(1.15)

  return (
    <Line
      points={[ground, mid, satPos]}
      color={color}
      lineWidth={broken ? 1 : 1.4}
      dashed={broken}
      dashSize={1.5}
      gapSize={0.8}
      transparent
      opacity={broken ? 0.35 : 0.72}
    />
  )
}

function GroundGateway({ node }) {
  const pos = cityToPlanet(node, PLANET_R + 0.3)
  return (
    <mesh position={[pos.x, pos.y, pos.z]}>
      <sphereGeometry args={[0.35, 8, 8]} />
      <meshStandardMaterial color="#7affc4" emissive="#7affc4" emissiveIntensity={0.7} />
    </mesh>
  )
}

function PlanetContent({ state }) {
  const [elapsed, setElapsed] = useState(0)
  useFrame((_, delta) => setElapsed((t) => t + delta))

  const nodes = state.nodes || []
  const links = state.links || []
  const nodeIndex = useMemo(() => {
    const m = {}
    nodes.forEach((n) => (m[n.id] = n))
    return m
  }, [nodes])

  const satellites = nodes.filter((n) => n.type === 'SATELLITE')
  const satLinks = useMemo(() => links.filter((l) => {
    const a = nodeIndex[l.sourceNodeId]
    const b = nodeIndex[l.targetNodeId]
    return Boolean(a && b && ((a.type === 'SATELLITE') !== (b.type === 'SATELLITE')))
  }), [links, nodeIndex])

  const satSlots = useMemo(() => satellites.map((sat, i) => ({
    sat,
    orbitRadius: ORBIT_R + i * 2.5,
    orbitTilt: 0.2 + i * 0.15,
    phase: (i / Math.max(satellites.length, 1)) * Math.PI * 2,
  })), [satellites])

  const satPositions = useMemo(() => {
    const positions = {}
    satSlots.forEach((slot) => {
      positions[slot.sat.id] = satellitePosition(slot, elapsed)
    })
    return positions
  }, [satSlots, elapsed])

  const gatewayIds = useMemo(() => {
    const ids = new Set()
    satLinks.forEach((l) => {
      const a = nodeIndex[l.sourceNodeId]
      const b = nodeIndex[l.targetNodeId]
      if (a?.type !== 'SATELLITE' && a?.id) ids.add(a.id)
      if (b?.type !== 'SATELLITE' && b?.id) ids.add(b.id)
    })
    return ids
  }, [satLinks, nodeIndex])

  return (
    <>
      <StarField />
      <Earth />

      {satSlots.map(({ orbitRadius, orbitTilt }, i) => (
        <OrbitRing key={i} radius={orbitRadius} tilt={orbitTilt} />
      ))}

      {satSlots.map(({ sat }) => (
        <SatelliteNode key={sat.id} node={sat} position={satPositions[sat.id]} />
      ))}

      {[...gatewayIds].map((id) => nodeIndex[id] && (
        <GroundGateway key={id} node={nodeIndex[id]} />
      ))}

      {satLinks.map((link) => {
        const a = nodeIndex[link.sourceNodeId]
        const b = nodeIndex[link.targetNodeId]
        const satNode = a?.type === 'SATELLITE' ? a : b
        const groundNode = a?.type === 'SATELLITE' ? b : a
        if (!satNode || !groundNode) return null
        return (
          <SatelliteBeam
            key={link.id}
            link={link}
            satellitePosition={satPositions[satNode.id]}
            groundNode={groundNode}
          />
        )
      })}
    </>
  )
}

export default function PlanetScene({ state }) {
  return (
    <Canvas camera={{ position: [0, 16, 48], fov: 50 }}>
      <color attach="background" args={['#03060f']} />
      {/* Soft fill so nothing is pure black, plus a bright directional "sun". */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[40, 25, 30]} intensity={2.2} color="#fff6e6" />
      <directionalLight position={[-50, -10, -40]} intensity={0.22} color="#33557f" />
      <Suspense fallback={null}>
        <PlanetContent state={state} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={22} maxDistance={90} />
    </Canvas>
  )
}

function satellitePosition(slot, elapsed) {
  const a = slot.phase + elapsed * SATELLITE_SPEED
  const x = Math.cos(a) * slot.orbitRadius
  const z = Math.sin(a) * slot.orbitRadius
  const y = Math.sin(slot.orbitTilt) * z
  return [x, y, Math.cos(slot.orbitTilt) * z]
}

function cityToPlanet(node, radius) {
  const nx = THREE.MathUtils.clamp(((node.x || 0) - 5) / 180, -1, 1)
  const nz = THREE.MathUtils.clamp((node.z || 0) / 140, -1, 1)
  const phi = Math.PI / 2 - nx * 1.15
  const theta = nz * 1.2
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

function StarField() {
  const positions = useMemo(() => {
    const arr = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i += 1) {
      const r = 180 + Math.random() * 60
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi)
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.5} transparent opacity={0.7} sizeAttenuation />
    </points>
  )
}
