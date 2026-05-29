import { useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { nodeColor, linkColor, isBrokenLink } from './colors'

const PLANET_R = 14
const ORBIT_R = 22
const SATELLITE_SPEED = 0.12

function Planet() {
  return (
    <mesh>
      <sphereGeometry args={[PLANET_R, 48, 48]} />
      <meshStandardMaterial color="#1a3a6e" emissive="#0a1a3a" emissiveIntensity={0.3} />
    </mesh>
  )
}

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
      <Line points={points} color="#2a4a8a" lineWidth={0.8} transparent opacity={0.4} />
    </group>
  )
}

function SatelliteNode({ node, position }) {
  const color = nodeColor(node)
  const failed = node.status === 'FAILED'
  const degraded = node.status === 'DEGRADED'

  return (
    <group position={position}>
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
      <meshStandardMaterial color="#7affc4" emissive="#7affc4" emissiveIntensity={0.6} />
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
      <Planet />
      <Continents />

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
    <Canvas camera={{ position: [0, 20, 55], fov: 50 }}>
      <color attach="background" args={['#020510']} />
      <ambientLight intensity={0.3} />
      <pointLight position={[60, 40, 60]} intensity={1.2} color="#fff8e0" />
      <PlanetContent state={state} />
      <OrbitControls enablePan={false} minDistance={30} maxDistance={90} />
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
  const nx = ((node.x || 0) - 15) / 60
  const nz = ((node.z || 0) - 15) / 60
  const phi = Math.PI / 2 - nx * 0.8
  const theta = nz * 0.8
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
