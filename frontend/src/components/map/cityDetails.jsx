import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Shared procedural window textures (built once). A dark facade with a grid of
// windows, a few lit, so a plain box reads as a real building.
// ---------------------------------------------------------------------------
let _texCache = null

// Facade texture: a saturated WALL colour with a dense grid of darker windows
// (a few lit warm). The wall dominates so the building keeps its colour, and the
// many small windows make it read as a real multi-storey building.
function buildTexture(wall, windowColor, litEvery = 9) {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = wall
  ctx.fillRect(0, 0, c.width, c.height)
  const cols = 5
  const rows = 12
  const cw = 7
  const ch = 7
  const gxs = (c.width - cols * cw) / (cols + 1)
  const gys = (c.height - rows * ch) / (rows + 1)
  let k = 0
  for (let r = 0; r < rows; r += 1) {
    for (let col = 0; col < cols; col += 1) {
      ctx.fillStyle = k % litEvery === 0 ? '#ffe28c' : windowColor
      ctx.fillRect(gxs + col * (cw + gxs), gys + r * (ch + gys), cw, ch)
      k += 1
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function windowTextures() {
  if (_texCache) return _texCache
  _texCache = {
    office: buildTexture('#7a8294', '#2a313c', 8),
    glass: buildTexture('#3b6fa0', '#1f2f44', 6),
  }
  return _texCache
}

// A varied palette of building facades so the skyline isn't one colour:
// concrete, blue glass, teal glass, brick, sandstone, grey office, modern white.
let _facadeCache = null
function facadeTextures() {
  if (_facadeCache) return _facadeCache
  // Soft pastel wall colours with subtle window insets → colourful but gentle.
  _facadeCache = [
    buildTexture('#8aa0c0', '#3a4759', 9), // soft blue-grey
    buildTexture('#7fa8cf', '#33485e', 7), // soft blue
    buildTexture('#7fc1b6', '#3c5f59', 8), // soft teal
    buildTexture('#d9a08c', '#6b4c44', 9), // pastel coral (was red)
    buildTexture('#d6c08a', '#5a4c30', 9), // soft cream / gold
    buildTexture('#9aa3b4', '#3a4250', 8), // light grey office
    buildTexture('#a6c8a6', '#566a56', 8), // pastel sage (was green)
    buildTexture('#e0c889', '#5a472a', 8), // soft amber
    buildTexture('#b0a0cf', '#473e5e', 8), // pastel lavender
    buildTexture('#d6a0bb', '#5e4350', 8), // pastel pink
    buildTexture('#a8c4d9', '#3c4e5e', 7), // pale sky blue
  ]
  return _facadeCache
}

// ---------------------------------------------------------------------------
// Node models — real-looking telecom kit instead of solid blocks.
// ---------------------------------------------------------------------------

const METAL = { color: '#9aa3b2', metalness: 0.6, roughness: 0.5 }
const PANEL = { color: '#e8edf4', metalness: 0.2, roughness: 0.5 }

// The cell tower is intentionally the tallest structure in the city so the
// network's radio sites stand above every building.
const TOWER_H = 22

/** Tall tapered lattice mast with antenna panels, a microwave drum and beacon. */
function CellTower() {
  return (
    <group>
      <mesh position={[0, TOWER_H / 2, 0]}>
        <cylinderGeometry args={[0.28, 1, TOWER_H, 6]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {[3, 6, 9, 12, 15, 18].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[Math.max(0.18, 0.5 - y * 0.016), 0.04, 5, 10]} />
          <meshStandardMaterial color="#7f8896" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      {[0, 120, 240].map((deg) => {
        const a = (deg * Math.PI) / 180
        return (
          <mesh key={deg} position={[Math.cos(a) * 0.5, TOWER_H - 1.6, Math.sin(a) * 0.5]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.16, 1.8, 0.5]} />
            <meshStandardMaterial {...PANEL} />
          </mesh>
        )
      })}
      {/* microwave drum dish part-way up */}
      <mesh position={[0.75, TOWER_H - 6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.7, 0.7, 0.5, 16]} />
        <meshStandardMaterial color="#e8edf4" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* red aircraft-warning beacon at the very top */}
      <mesh position={[0, TOWER_H + 0.5, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}

/** Street-level small cell: a slim pole with an antenna box and a mini dish. */
function SmallCell() {
  return (
    <group>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.11, 0.15, 4, 8]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <boxGeometry args={[0.45, 0.9, 0.28]} />
        <meshStandardMaterial {...PANEL} />
      </mesh>
      <mesh position={[0.45, 3.3, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 14]} />
        <meshStandardMaterial color="#d6dce6" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Multi-storey building with windows; optional rooftop kit / dish for telecom. */
function Tower({ color, w = 2.6, h = 6, d = 2.6, tex, dish = false }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} map={tex || null} metalness={0.2} roughness={0.75} />
      </mesh>
      {/* parapet / roof slab */}
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w * 1.04, 0.3, d * 1.04]} />
        <meshStandardMaterial color="#5b6473" />
      </mesh>
      {/* rooftop unit */}
      <mesh position={[w * 0.18, h + 0.55, d * 0.12]}>
        <boxGeometry args={[0.7, 0.5, 0.7]} />
        <meshStandardMaterial color="#8c93a3" />
      </mesh>
      {dish && (
        <mesh position={[-w * 0.2, h + 0.7, -d * 0.15]} rotation={[Math.PI / 3, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.05, 16]} />
          <meshStandardMaterial color="#dfe5ee" metalness={0.2} roughness={0.5} />
        </mesh>
      )}
    </group>
  )
}

// Height at which links/packets should attach to each node — the top of its
// structure (antenna on a tower, rooftop on a building), not the ground.
export function anchorY(node) {
  switch (node.type) {
    case 'SATELLITE':
      return node.y
    case 'RADIO_TOWER':
    case 'O_RU':
      return TOWER_H - 1.5
    case 'SMALL_CELL':
      return 4.6
    case 'CORE':
    case 'DATA_CENTRE':
      return 5.6
    case 'UPF':
      return 5
    default:
      return 6.2
  }
}

export function NodeModel({ type }) {
  const tex = windowTextures()
  switch (type) {
    case 'RADIO_TOWER':
    case 'O_RU':
      return <CellTower />
    case 'SMALL_CELL':
      return <SmallCell />
    case 'CORE':
    case 'DATA_CENTRE':
      return <Tower color="#cfd6e2" w={4.2} h={5} d={4.2} tex={tex.office} dish />
    case 'UPF':
      return <Tower color="#cdd3df" w={3} h={4.5} d={3} tex={tex.office} dish />
    case 'SATELLITE':
      return (
        <mesh>
          <octahedronGeometry args={[1.6, 0]} />
          <meshStandardMaterial color="#ffd479" emissive="#ffd479" emissiveIntensity={0.5} />
        </mesh>
      )
    default: // O_CU, O_DU, EDGE and anything else → glassy office block
      return <Tower color="#a9c4dd" w={2.8} h={5.5} d={2.8} tex={tex.glass} />
  }
}

// ---------------------------------------------------------------------------
// Decorative city skyline. Deterministic so it stays put across state polls,
// and every building is kept clear of nodes and links so gameplay stays clean.
// ---------------------------------------------------------------------------
const HOUSE = ['#cbb89a', '#bfa98c', '#c9bfae', '#b89a6f', '#a8b0a0', '#c0a4a0', '#b9c2cb', '#cdbfa0', '#9fae9a', '#c7b0b8', '#d3c6a8', '#d98c7a', '#7fae9a', '#e0c878', '#8aa6cf', '#c98aa6']
const ROOFS = ['#8a5a44', '#9a6a4a', '#7a4f3c', '#5f6b54', '#6a5a7a', '#7a5a4a', '#4f5f6a', '#864a4a']

function hash2(i, j) {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return n - Math.floor(n)
}

// Shared city grid. Streets are placed at irregular intervals with a mix of
// wide avenues and narrow side streets (not a perfect grid), and buildings are
// kept off them. The same ROAD_X / ROAD_Z lines drive <Roads/> and the skipping
// in <DecorBuildings/> so blocks and streets always line up.
const CITY = { x0: -120, x1: 135, z0: -66, z1: 40, step: 10 }

function roadLines(min, max) {
  const lines = []
  let p = min + 8
  let i = 0
  while (p <= max - 4) {
    const r = hash2(p * 1.7, i * 5.3)
    const main = i % 2 === 1 // alternate wide avenue / narrow street
    lines.push({ p: Math.round(p), width: main ? 7.5 : 4, main })
    p += 26 + r * 20 // larger, irregular blocks → fewer roads (26–46 units)
    i += 1
  }
  return lines
}

const ROAD_X = roadLines(CITY.x0, CITY.x1)
const ROAD_Z = roadLines(CITY.z0, CITY.z1)
const onRoad = (v, lines, pad = 1.5) => lines.some((L) => Math.abs(v - L.p) < L.width / 2 + pad)

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz || 1
  let t = ((px - ax) * dx + (pz - az) * dz) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}

// Curved avenues were removed at the user's request; the related geometry and
// proximity check were dead code and have been removed too.

export function DecorBuildings({ nodes, links, nodeIndex }) {
  const items = useMemo(() => {
    const pts = nodes.filter((n) => n.type !== 'SATELLITE').map((n) => [n.x, n.z])
    const segs = []
    links.forEach((l) => {
      const a = nodeIndex[l.sourceNodeId]
      const b = nodeIndex[l.targetNodeId]
      if (a && b) segs.push([a.x, a.z, b.x, b.z])
    })
    const nearNode = (x, z, r) => pts.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < r * r)
    const nearLink = (x, z, r) => segs.some(([ax, az, bx, bz]) => distToSeg(x, z, ax, az, bx, bz) < r)

    const out = []
    const STEP = 8 // denser block fill
    for (let gx = CITY.x0; gx <= CITY.x1; gx += STEP) {
      for (let gz = CITY.z0; gz <= CITY.z1; gz += STEP) {
        const r1 = hash2(gx, gz)
        const r2 = hash2(gz * 1.3, gx * 0.7)
        const r3 = hash2(gx * 0.5, gz * 1.7)
        if (r3 < 0.06) continue // only the occasional empty lot
        const x = gx + (r1 - 0.5) * 2.4
        const z = gz + (r2 - 0.5) * 2.4
        // Clear the road by a building half-width so no footprint edge spills onto it.
        if (onRoad(x, ROAD_X, 4) || onRoad(z, ROAD_Z, 4)) continue
        if (nearNode(x, z, 14)) continue
        if (nearLink(x, z, 7)) continue
        const downtown = Math.hypot(x - 10, z) < 55
        out.push({ x, z, r1, r2, r3, downtown })
      }
    }
    return out
  }, [nodes, links, nodeIndex])

  const facades = facadeTextures()

  return items.map((b, i) => {
    // Facade picked from its own hash so colour doesn't track height/type.
    const facade = facades[Math.floor(hash2(b.x * 0.31, b.z * 0.97) * facades.length) % facades.length]
    const aspect = 0.7 + b.r2 * 0.6 // rectangular footprints, not just squares

    // Downtown → tall towers (some stepped). Mid → blocks. Outskirts → houses.
    if (b.downtown && b.r3 > 0.42) {
      const h = 8 + b.r1 * 13
      const w = 2.8 + b.r2 * 2
      const d = w * aspect
      const stepped = b.r1 > 0.55
      const topY = stepped ? h + h * 0.36 : h
      return (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial map={facade} roughness={0.6} metalness={0.25} />
          </mesh>
          {stepped && (
            <mesh position={[0, h + h * 0.18, 0]}>
              <boxGeometry args={[w * 0.62, h * 0.36, d * 0.62]} />
              <meshStandardMaterial map={facade} roughness={0.6} metalness={0.25} />
            </mesh>
          )}
          {b.r2 > 0.5 ? (
            <mesh position={[0, topY + 1.3, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 2.6, 5]} />
              <meshStandardMaterial color="#cf3b3b" emissive="#cf3b3b" emissiveIntensity={0.35} />
            </mesh>
          ) : (
            <mesh position={[w * 0.18, topY + 0.4, d * 0.12]}>
              <boxGeometry args={[w * 0.35, 0.8, d * 0.35]} />
              <meshStandardMaterial color="#6b7382" />
            </mesh>
          )}
        </group>
      )
    }
    if (b.r3 > 0.5) {
      const h = 3.5 + b.r1 * 5
      const w = 3.4 + b.r2 * 2
      const d = w * aspect
      return (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial map={facade} roughness={0.8} metalness={0.08} />
          </mesh>
          <mesh position={[w * 0.18, h + 0.3, -d * 0.15]}>
            <boxGeometry args={[1, 0.6, 1]} />
            <meshStandardMaterial color="#8c93a3" />
          </mesh>
        </group>
      )
    }
    // house with a peaked roof
    const bh = 2.2 + b.r1 * 1.8
    const w = 3 + b.r2 * 1.6
    const d = w * (0.8 + b.r1 * 0.3)
    return (
      <group key={i} position={[b.x, 0, b.z]}>
        <mesh position={[0, bh / 2, 0]}>
          <boxGeometry args={[w, bh, d]} />
          <meshStandardMaterial color={HOUSE[Math.floor(b.r1 * 100) % HOUSE.length]} roughness={0.95} metalness={0} />
        </mesh>
        <mesh position={[0, bh + 0.85, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[Math.max(w, d) * 0.62, 1.7, 4]} />
          <meshStandardMaterial color={ROOFS[Math.floor(b.r3 * 100) % ROOFS.length]} roughness={1} />
        </mesh>
      </group>
    )
  })
}

// ---------------------------------------------------------------------------
// Streets — a grid of asphalt strips aligned to the building blocks, with a
// dashed centre line so they read as real roads.
// ---------------------------------------------------------------------------
export function Roads() {
  const cx = (CITY.x0 + CITY.x1) / 2
  const cz = (CITY.z0 + CITY.z1) / 2
  const lenX = CITY.x1 - CITY.x0 + CITY.step
  const lenZ = CITY.z1 - CITY.z0 + CITY.step

  return (
    <group>
      {ROAD_X.map((L, i) => (
        <group key={`x${i}`}>
          <mesh position={[L.p, 0.05, cz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <planeGeometry args={[L.width, lenZ]} />
            <meshStandardMaterial color={L.main ? '#3c4149' : '#33373e'} roughness={1} />
          </mesh>
          {L.main && (
            <mesh position={[L.p, 0.07, cz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <planeGeometry args={[0.22, lenZ]} />
              <meshStandardMaterial color="#d8c873" roughness={1} />
            </mesh>
          )}
        </group>
      ))}
      {ROAD_Z.map((L, i) => (
        <group key={`z${i}`}>
          <mesh position={[cx, 0.06, L.p]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <planeGeometry args={[lenX, L.width]} />
            <meshStandardMaterial color={L.main ? '#3c4149' : '#33373e'} roughness={1} />
          </mesh>
          {L.main && (
            <mesh position={[cx, 0.08, L.p]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <planeGeometry args={[lenX, 0.22]} />
              <meshStandardMaterial color="#d8c873" roughness={1} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Low-poly trees and park greenery.
// ---------------------------------------------------------------------------
function Tree({ position, s = 1 }) {
  return (
    <group position={position} scale={s} raycast={() => null}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 6]} />
        <meshStandardMaterial color="#6b4a2b" roughness={1} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <icosahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color="#3f7d3a" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#4f9a47" roughness={1} flatShading />
      </mesh>
    </group>
  )
}

// Scatters trees across the given park rectangles (coords relative to the same
// group the parks are drawn in).
export function Greenery({ parks }) {
  const trees = useMemo(() => {
    const out = []
    parks.forEach((p) => {
      for (let i = -p.w / 2 + 2.5; i < p.w / 2 - 2; i += 3) {
        for (let j = -p.d / 2 + 2.5; j < p.d / 2 - 2; j += 3) {
          const r = hash2(p.x + i, p.z + j)
          if (r < 0.18) continue
          const tx = p.x + i + (r - 0.5) * 2
          const tz = p.z + j + (hash2(j, i) - 0.5) * 2
          // Parks sit in a group offset +10 on x, so world-x is tx + 10.
          if (onRoad(tx + 10, ROAD_X, 1) || onRoad(tz, ROAD_Z, 1)) continue
          out.push({ x: tx, z: tz, s: 0.8 + r * 0.7 })
        }
      }
    })
    return out
  }, [parks])

  return trees.map((t, i) => <Tree key={i} position={[t.x, 0, t.z]} s={t.s} />)
}

// ---------------------------------------------------------------------------
// Animated traffic lights at the main avenue intersections. Each cycles
// green -> amber -> red on its own phase offset by mutating the bulb emissive
// in useFrame (no React re-render per frame).
// ---------------------------------------------------------------------------
function TrafficLight({ position, phase }) {
  const red = useRef()
  const amber = useRef()
  const green = useRef()

  useFrame((state) => {
    const t = (state.clock.elapsedTime + phase) % 6
    const set = (ref, lit) => {
      if (ref.current) ref.current.material.emissiveIntensity = lit ? 1.6 : 0.04
    }
    set(green, t < 3)
    set(amber, t >= 3 && t < 3.8)
    set(red, t >= 3.8)
  })

  return (
    <group position={position} raycast={() => null}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 3, 6]} />
        <meshStandardMaterial color="#3a3f47" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[0.42, 1.15, 0.32]} />
        <meshStandardMaterial color="#1c1f24" />
      </mesh>
      <mesh ref={red} position={[0, 3.55, 0.18]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={0.04} />
      </mesh>
      <mesh ref={amber} position={[0, 3.2, 0.18]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ffce3b" emissive="#ffce3b" emissiveIntensity={0.04} />
      </mesh>
      <mesh ref={green} position={[0, 2.85, 0.18]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#3bff7a" emissive="#3bff7a" emissiveIntensity={0.04} />
      </mesh>
    </group>
  )
}

export function TrafficLights() {
  const lights = useMemo(() => {
    const xs = ROAD_X.filter((L) => L.main).map((L) => L.p)
    const zs = ROAD_Z.filter((L) => L.main).map((L) => L.p)
    const out = []
    xs.forEach((x, i) => {
      zs.forEach((z, j) => {
        out.push({ x: x + 3.2, z: z + 3.2, phase: ((i * 3 + j) % 4) * 1.5 })
      })
    })
    return out
  }, [])
  return lights.map((l, k) => <TrafficLight key={k} position={[l.x, 0, l.z]} phase={l.phase} />)
}

// ---------------------------------------------------------------------------
// Bridges spanning the north river, aligned to a few main avenues.
// ---------------------------------------------------------------------------
function Bridge({ x }) {
  // The river spans roughly z 44..120; the deck runs from the city edge all the
  // way across to the far bank so it fully covers the water.
  const z0 = 34
  const z1 = 128
  const len = z1 - z0
  const cz = (z0 + z1) / 2
  const deckY = 2.4
  return (
    <group position={[x, 0, cz]} raycast={() => null}>
      <mesh position={[0, deckY, 0]}>
        <boxGeometry args={[10, 0.5, len]} />
        <meshStandardMaterial color="#7c7f86" roughness={0.9} />
      </mesh>
      {[-4.7, 4.7].map((off) => (
        <mesh key={off} position={[off, deckY + 0.6, 0]}>
          <boxGeometry args={[0.3, 1.1, len]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
      {[-len / 2 + 10, 0, len / 2 - 10].map((zz) =>
        [-3.8, 3.8].map((px) => (
          <mesh key={`${zz}_${px}`} position={[px, deckY / 2, zz]}>
            <boxGeometry args={[1.1, deckY, 1.1]} />
            <meshStandardMaterial color="#6b6f76" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  )
}

export function Bridges() {
  const xs = useMemo(() => {
    const mains = ROAD_X.filter((L) => L.main).map((L) => L.p)
    // a couple of evenly spread avenues become bridges
    return mains.filter((_, i) => i % 2 === 0)
  }, [])
  return xs.map((x, i) => <Bridge key={i} x={x} />)
}

// Sparse street trees scattered across the city (off the roads and away from
// nodes) so there is greenery everywhere, not only in the parks.
export function StreetTrees({ nodes }) {
  const trees = useMemo(() => {
    const pts = nodes.filter((n) => n.type !== 'SATELLITE').map((n) => [n.x, n.z])
    const out = []
    for (let x = CITY.x0; x <= CITY.x1; x += 7) {
      for (let z = CITY.z0; z <= CITY.z1 - 8; z += 7) {
        const r = hash2(x * 2.3, z * 1.9)
        if (r < 0.78) continue // keep them sparse
        const jx = x + (hash2(x, z) - 0.5) * 4
        const jz = z + (hash2(z, x) - 0.5) * 4
        // Stay well clear of the roads (and therefore the bridge approaches).
        if (onRoad(jx, ROAD_X, 2.5) || onRoad(jz, ROAD_Z, 2.5)) continue
        if (pts.some(([px, pz]) => (px - jx) ** 2 + (pz - jz) ** 2 < 30)) continue
        out.push({ x: jx, z: jz, s: 0.65 + r * 0.5 })
      }
    }
    return out
  }, [nodes])
  return trees.map((t, i) => <Tree key={i} position={[t.x, 0, t.z]} s={t.s} />)
}

// ---------------------------------------------------------------------------
// Moving traffic — small cars driving along the main avenues in two lanes,
// looping. Animated by mutating position in useFrame (no per-frame re-render).
// ---------------------------------------------------------------------------
const CAR_COLORS = ['#e0564b', '#4b78e0', '#e0c24b', '#eef0f4', '#2f3338', '#46b06a', '#d96fb0']

const CARS = (() => {
  const cars = []
  let id = 0
  ROAD_X.filter((L) => L.main).forEach((L, li) => {
    for (let k = 0; k < 2; k += 1) {
      cars.push({
        id: id++, axis: 'x', p: L.p, lane: (k ? 1 : -1) * 1.5, dir: k ? 1 : -1,
        phase: hash2(L.p, k * 3), color: CAR_COLORS[(li * 2 + k) % CAR_COLORS.length],
        speed: 7 + hash2(k, L.p) * 7,
      })
    }
  })
  ROAD_Z.filter((L) => L.main).forEach((L, li) => {
    for (let k = 0; k < 2; k += 1) {
      cars.push({
        id: id++, axis: 'z', p: L.p, lane: (k ? 1 : -1) * 1.5, dir: k ? 1 : -1,
        phase: hash2(L.p, k * 3 + 9), color: CAR_COLORS[(li * 2 + k + 3) % CAR_COLORS.length],
        speed: 7 + hash2(k + 5, L.p) * 7,
      })
    }
  })
  return cars
})()

function Car({ car }) {
  const ref = useRef()
  const along = car.axis === 'x' ? CITY.z1 - CITY.z0 : CITY.x1 - CITY.x0
  const min = car.axis === 'x' ? CITY.z0 : CITY.x0
  useFrame((state) => {
    if (!ref.current) return
    let t = (state.clock.elapsedTime * car.speed * 0.03 + car.phase) % 1
    if (car.dir < 0) t = 1 - t
    const pos = min + t * along
    if (car.axis === 'x') ref.current.position.set(car.p + car.lane, 0.45, pos)
    else ref.current.position.set(pos, 0.45, car.p + car.lane)
  })
  const w = car.axis === 'x' ? 0.9 : 1.9
  const d = car.axis === 'x' ? 1.9 : 0.9
  return (
    <mesh ref={ref} raycast={() => null}>
      <boxGeometry args={[w, 0.55, d]} />
      <meshStandardMaterial color={car.color} metalness={0.5} roughness={0.4} />
    </mesh>
  )
}

export function Cars() {
  return CARS.map((c) => <Car key={c.id} car={c} />)
}
