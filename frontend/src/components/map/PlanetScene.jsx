import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { nodeColor, linkColor, isBrokenLink } from './colors'

const PLANET_R = 14
const ORBIT_R = 22

/** Slow-spinning Earth-like sphere */
function Planet() {
  const ref = useRef()
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.04 })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[PLANET_R, 48, 48]} />
      <meshStandardMaterial color="#1a3a6e" emissive="#0a1a3a" emissiveIntensity={0.3} />
    </mesh>
  )
}

/** Faint continent-like patches */
function Continents() {
  const patches = useMemo(() => [
    { lat: 30, lon: 10, rx: 4, rz: 2.5 },
    { lat: 10, lon: -80, rx: 3, rz: 4 },
    { lat: -20, lon: 25, rx: 3.5, rz: 3 },
    { lat: 50, lon: 100, rx: 5, rz: 2 },
    { lat: -30, lon: 135, rx: 3, rz: 2 },
  ], [])

  return patches.map((p, i) => {
    const phi = (90 - p.lat) * (Math.PI / 180)
    const theta = p.lon * (Math.PI / 180)
    const r = PLANET_R + 0.05
    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.cos(phi)
    const z = r * Math.sin(phi) * Math.sin(theta)
    return (
      <mesh key={i} position={[x, y, z]}>
        <sphereGeometry args={[p.rx * 0.6, 8, 8]} />
        <meshStandardMaterial color="#2d6e3a" transparent opacity={0.55} />
      </mesh>
    )
  })
}

/** Dashed orbit ring */
function OrbitRing({ radius = ORBIT_R, tilt = 0 }) {
  const points = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    return pts
  }, [radius])
  return (
    <group rotation={[tilt, 0, 0]}>
      <Line points={points} color="#2a4a8a" lineWidth={0.8} transparent opacity={0.4} />
    </group>
  )
}

/** Animated satellite node on its orbit */
function OrbitingSatellite({ node, orbitRadius, orbitTilt, phase, speed = 0.12 }) {
  const ref = useRef()
  const angle = useRef(phase)
  const color = nodeColor(node)
  const failed = node.status === 'FAILED'
  const degraded = node.status === 'DEGRADED'

  useFrame((_, dt) => {
    if (!ref.current) return
    angle.current += dt * speed
    const a = angle.current
    const x = Math.cos(a) * orbitRadius
    const z = Math.sin(a) * orbitRadius
    const y = Math.sin(orbitTilt) * z
    ref.current.position.set(x, y, Math.cos(orbitTilt) * z)
  })

  return (
    <group ref={ref}>
      {/* body */}
      <mesh>
        <octahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={failed ? 0.05 : degraded ? 0.5 : 0.8}
          opacity={failed ? 0.5 : 1}
          transparent={failed}
        />
      </mesh>
      {/* solar panels */}
      <mesh position={[1.6, 0, 0]}>
        <boxGeometry args={[1.8, 0.08, 0.7]} />
        <meshStandardMaterial color="#4f8cff" transparent opacity={0.7} />
      </mesh>
      <mesh position={[-1.6, 0, 0]}>
        <boxGeometry args={[1.8, 0.08, 0.7]} />
        <meshStandardMaterial color="#4f8cff" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

/** Beam from a ground gateway position (on planet surface) to a satellite */
function SatelliteBeam({ link, satNode, groundNode }) {
  const color = linkColor(link)
  const broken = isBrokenLink(link.status)

  // Ground point: map city coords to planet surface
  const ground = useMemo(() => {
    // Normalise city x/z to lat/lon-ish angles
    const nx = ((groundNode.x || 0) - 15) / 60  // rough centre offset
    const nz = ((groundNode.z || 0) - 15) / 60
    const phi = Math.PI / 2 - nx * 0.8
    const theta = nz * 0.8
    const r = PLANET_R + 0.2
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    )
  }, [groundNode])

  // Satellite position is animated — approximate with a fixed high point for the static beam
  const satPos = useMemo(() => {
    const phase = (satNode.x || 0) * 0.1
    return new THREE.Vector3(
      Math.cos(phase) * ORBIT_R,
      Math.sin(0.3) * Math.sin(phase) * ORBIT_R,
      Math.cos(0.3) * Math.sin(phase) * ORBIT_R
    )
  }, [satNode])

  const mid = ground.clone().lerp(satPos, 0.5)
  mid.multiplyScalar(1.15)

  return (
    <Line
      points={[ground, mid, satPos]}
      color={color}
      lineWidth={broken ? 1 : 1.4}
      dashed={broken}
      dashSize={1.5}
      gapSize={0.8}
      transparent
      opacity={broken ? 0.35 : 0.65}
    />
  )
}

/** Ground gateway dots for non-satellite nodes that have satellite links */
function GroundGateway({ node }) {
  const phi = Math.PI / 2 - ((node.x || 0) - 15) / 60 * 0.8
  const theta = ((node.z || 0) - 15) / 60 * 0.8
  const r = PLANET_R + 0.3
  const pos = [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ]
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.35, 8, 8]} />
      <meshStandardMaterial color="#7affc4" emissive="#7affc4" emissiveIntensity={0.6} />
    </mesh>
  )
}

export default function PlanetScene({ state }) {
  const nodes = state.nodes || []
  const links = state.links || []

  const nodeIndex = useMemo(() => {
    const m = {}
    nodes.forEach((n) => (m[n.id] = n))
    return m
  }, [nodes])

  const satellites = nodes.filter((n) => n.type === 'SATELLITE')

  // Links that connect a satellite to a ground node
  const satLinks = useMemo(() => links.filter((l) => {
    const a = nodeIndex[l.sourceNodeId]
    const b = nodeIndex[l.targetNodeId]
    return (a?.type === 'SATELLITE') !== (b?.type === 'SATELLITE') // one sat, one ground
  }), [links, nodeIndex])

  // Ground nodes that have satellite links
  const gatewayIds = useMemo(() => {
    const ids = new Set()
    satLinks.forEach((l) => {
      const a = nodeIndex[l.sourceNodeId]
      const b = nodeIndex[l.targetNodeId]
      if (a?.type !== 'SATELLITE') ids.add(a?.id)
      if (b?.type !== 'SATELLITE') ids.add(b?.id)
    })
    return ids
  }, [satLinks, nodeIndex])

  // Assign each satellite an orbit slot
  const satSlots = useMemo(() => satellites.map((sat, i) => ({
    sat,
    orbitRadius: ORBIT_R + i * 2.5,
    orbitTilt: 0.2 + i * 0.15,
    phase: (i / Math.max(satellites.length, 1)) * Math.PI * 2,
  })), [satellites])

  return (
    <Canvas camera={{ position: [0, 20, 55], fov: 50 }}>
      <color attach="background" args={['#020510']} />
      <ambientLight intensity={0.3} />
      <pointLight position={[60, 40, 60]} intensity={1.2} color="#fff8e0" />

      {/* Stars */}
      <StarField />

      <Planet />
      <Continents />

      {/* Orbit rings */}
      {satSlots.map(({ orbitRadius, orbitTilt }, i) => (
        <OrbitRing key={i} radius={orbitRadius} tilt={orbitTilt} />
      ))}

      {/* Satellites */}
      {satSlots.map(({ sat, orbitRadius, orbitTilt, phase }) => (
        <OrbitingSatellite
          key={sat.id}
          node={sat}
          orbitRadius={orbitRadius}
          orbitTilt={orbitTilt}
          phase={phase}
        />
      ))}

      {/* Ground gateways */}
      {[...gatewayIds].map((id) => nodeIndex[id] && (
        <GroundGateway key={id} node={nodeIndex[id]} />
      ))}

      {/* Satellite beams */}
      {satLinks.map((link) => {
        const a = nodeIndex[link.sourceNodeId]
        const b = nodeIndex[link.targetNodeId]
        const satNode = a?.type === 'SATELLITE' ? a : b
        const groundNode = a?.type === 'SATELLITE' ? b : a
        if (!satNode || !groundNode) return null
        return <SatelliteBeam key={link.id} link={link} satNode={satNode} groundNode={groundNode} />
      })}

      <OrbitControls enablePan={false} minDistance={30} maxDistance={90} />
    </Canvas>
  )
}

function StarField() {
  const positions = useMemo(() => {
    const arr = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) {
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
