import { useMemo } from 'react'
import { nodeColor, linkColor, isBrokenLink, nodeSize } from './colors'
import { incidentColor, isWeather, zoneCenter } from './incidents'

// Our own 2D map — a daytime top-down schematic that mirrors the realistic
// 3D city (light streets, building footprints) rather than the dark tactical
// grid. Shares the exact prop interface of NetworkScene / TacticalMap so
// GameScreen can swap it in as a player-selectable view.

const NODE_BADGES = {
  RADIO_TOWER: 'T',
  SMALL_CELL: 'SC',
  O_RU: 'RU',
  O_DU: 'DU',
  O_CU: 'CU',
  EDGE: 'E',
  UPF: 'UPF',
  CORE: 'C',
  DATA_CENTRE: 'DC',
  SATELLITE: 'SAT',
}

export default function CityMap2D({ state, onSelect, routePath = [], selectedPacket = null, layers }) {
  const showWeather = layers?.weather ?? true
  const showIncidents = layers?.incidents ?? true
  const showLabels = layers?.labels ?? false
  const nodes = state.nodes || []
  const links = state.links || []
  const mapObjects = state.mapObjects || []

  const nodeIndex = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes])
  const bounds = useMemo(() => mapBounds(nodes, mapObjects), [nodes, mapObjects])
  const routeEdges = useMemo(() => routeEdgeSet(routePath), [routePath])
  const affectedLinks = useMemo(
    () => affectedLinkColors(state.incidents || [], links, nodeIndex, showWeather, showIncidents),
    [state.incidents, links, nodeIndex, showWeather, showIncidents]
  )
  const { nextHopIds, nextHopEdges } = useMemo(
    () => nextHopSets(links, routePath, selectedPacket),
    [links, routePath, selectedPacket]
  )
  const currentNodeId = routePath[routePath.length - 1]
  const sourceId = selectedPacket?.sourceNodeId
  const destId = selectedPacket?.destinationNodeId

  const project = (node) => ({ x: node.x, y: -node.z })

  return (
    <div className="city2d-map" aria-label="2D city network map">
      <svg viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`} role="img">
        <defs>
          <pattern id="city2d-blocks" width="26" height="26" patternUnits="userSpaceOnUse">
            <rect width="26" height="26" fill="none" />
            <path d="M 26 0 L 0 0 0 26" fill="none" stroke="rgba(60,80,110,0.14)" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Daytime ground + street-grid backdrop */}
        <rect x={bounds.minX} y={bounds.minY} width={bounds.width} height={bounds.height} className="city2d-ground" />
        <rect x={bounds.minX} y={bounds.minY} width={bounds.width} height={bounds.height} fill="url(#city2d-blocks)" />

        {/* Building / construction footprints from the backend topology */}
        {mapObjects.map((obj) => {
          const w = (obj.width || 6) * 2
          const d = (obj.depth || 6) * 2
          const kind = (obj.type || '').toLowerCase()
          return (
            <rect
              key={obj.id}
              className={`city2d-object ${kind}`}
              x={obj.x - w / 2}
              y={-obj.z - d / 2}
              width={w}
              height={d}
              rx={2}
            >
              <title>{obj.name || obj.id}</title>
            </rect>
          )
        })}

        {/* Incident / weather zones */}
        {(state.incidents || []).map((incident) => {
          const weather = isWeather(incident.eventType)
          if (weather ? !showWeather : !showIncidents) return null
          const center = zoneCenter(incident, nodeIndex)
          if (!center) return null
          const color = incidentColor(incident.eventType)
          return (
            <circle
              key={incident.id}
              className={`city2d-zone ${weather ? 'weather' : 'incident'}`}
              cx={center.x}
              cy={-center.z}
              r={center.radius}
              fill={color}
              stroke={color}
            >
              <title>{incident.eventType}: {incident.message || 'active condition'}</title>
            </circle>
          )
        })}

        {/* Links */}
        {links.map((link) => {
          const source = nodeIndex[link.sourceNodeId]
          const target = nodeIndex[link.targetNodeId]
          if (!source || !target) return null
          const a = project(source)
          const b = project(target)
          const routeEdge = routeEdges.has(edgeKey(link.sourceNodeId, link.targetNodeId))
          const candidate = !routeEdge && nextHopEdges.has(edgeKey(link.sourceNodeId, link.targetNodeId))
          const color = routeEdge ? '#1b2740' : candidate ? '#4fe0ff' : (affectedLinks.get(link.id) || linkColor(link))
          const broken = isBrokenLink(link.status)
          return (
            <line
              key={link.id}
              className={`city2d-link ${link.status || ''} ${routeEdge ? 'route' : ''} ${candidate ? 'candidate' : ''}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={color}
              strokeWidth={routeEdge ? 2.6 : candidate ? 2.2 : 1.4}
              strokeDasharray={broken ? '3 3' : undefined}
              onClick={() => onSelect?.({ kind: 'link', data: link })}
            >
              <title>{link.id} | {link.linkType} | {link.status || 'HEALTHY'}</title>
            </line>
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const point = project(node)
          const role = nodeRole(node.id, sourceId, destId, currentNodeId, nextHopIds)
          const r = 5 + nodeSize(node.type) * 1.8
          return (
            <g
              key={node.id}
              className={`city2d-node ${node.status || ''} ${role}`}
              transform={`translate(${point.x} ${point.y})`}
              onClick={() => onSelect?.({ kind: 'node', data: node })}
            >
              {role === 'next' && <circle className="city2d-hop" r={r + 5} />}
              <circle r={r} fill={nodeColor(node)} />
              <text className="city2d-node-icon" textAnchor="middle" dominantBaseline="central">
                {NODE_BADGES[node.type] || '?'}
              </text>
              {(showLabels || role) && (
                <text className="city2d-node-label" textAnchor="middle" y={-(r + 6)}>
                  {shortName(node.name || node.id)}
                </text>
              )}
              <title>{node.name || node.id} | {node.type}</title>
            </g>
          )
        })}
      </svg>

      <div className="city2d-legend">
        <span><i style={{ background: '#36c98d' }} />Source</span>
        <span><i style={{ background: '#ff7ab6' }} />Destination</span>
        <span><i style={{ background: '#4fe0ff' }} />Next hop</span>
        <span><i style={{ background: '#7affc4' }} />Fibre</span>
        <span><i style={{ background: '#ffd479' }} />Satellite</span>
      </div>
    </div>
  )
}

function mapBounds(nodes, objects) {
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => -n.z)
  objects.forEach((obj) => {
    xs.push(obj.x - (obj.width || 0), obj.x + (obj.width || 0))
    ys.push(-obj.z - (obj.depth || 0), -obj.z + (obj.depth || 0))
  })
  const minX = Math.min(...xs, -160) - 24
  const maxX = Math.max(...xs, 170) + 24
  const minY = Math.min(...ys, -120) - 24
  const maxY = Math.max(...ys, 120) + 24
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

function routeEdgeSet(routePath) {
  const set = new Set()
  for (let i = 0; i < routePath.length - 1; i += 1) {
    set.add(edgeKey(routePath[i], routePath[i + 1]))
  }
  return set
}

function edgeKey(a, b) {
  return [a, b].sort().join('::')
}

function nextHopSets(links, routePath, selectedPacket) {
  const nextHopIds = new Set()
  const nextHopEdges = new Set()
  if (!selectedPacket) return { nextHopIds, nextHopEdges }
  const current = routePath[routePath.length - 1] || selectedPacket.sourceNodeId
  const visited = new Set(routePath)
  links.forEach((link) => {
    if (!isUsableLink(link)) return
    let neighbour = null
    if (link.sourceNodeId === current && !visited.has(link.targetNodeId)) neighbour = link.targetNodeId
    else if (link.targetNodeId === current && !visited.has(link.sourceNodeId)) neighbour = link.sourceNodeId
    if (neighbour) {
      nextHopIds.add(neighbour)
      nextHopEdges.add(edgeKey(link.sourceNodeId, link.targetNodeId))
    }
  })
  return { nextHopIds, nextHopEdges }
}

function nodeRole(id, sourceId, destId, currentNodeId, nextHopIds) {
  if (id === sourceId) return 'source'
  if (id === destId) return 'destination'
  if (id === currentNodeId) return 'current'
  if (nextHopIds.has(id)) return 'next'
  return ''
}

function affectedLinkColors(incidents, links, nodeIndex, showWeather, showIncidents) {
  const map = new Map()
  incidents.forEach((incident) => {
    const weather = isWeather(incident.eventType)
    if (weather ? !showWeather : !showIncidents) return
    links.forEach((link) => {
      if (incidentTouchesLink(incident, link, nodeIndex) && !map.has(link.id)) {
        map.set(link.id, incidentColor(incident.eventType))
      }
    })
  })
  return map
}

function incidentTouchesLink(incident, link, nodeIndex) {
  const affectedIds = new Set(incident.affectedLinkIds || [])
  if (affectedIds.has(link.id)) return true
  if ((incident.affectedLinkIds || []).length > 0) return false

  const affectedTypes = new Set(incident.affectedLinkTypes || [])
  if (!affectedTypes.has(link.linkType)) return false

  const zone = incident.visualZone
  if (!zone || !Number.isFinite(zone.x) || !Number.isFinite(zone.z)) return true

  const source = nodeIndex[link.sourceNodeId]
  const target = nodeIndex[link.targetNodeId]
  if (!source || !target) return false

  const radius = Math.max(0, zone.radius || 0) + 4
  const midpoint = { x: (source.x + target.x) / 2, z: (source.z + target.z) / 2 }
  return pointInZone(source, zone, radius) || pointInZone(target, zone, radius) || pointInZone(midpoint, zone, radius)
}

function pointInZone(point, zone, radius) {
  const dx = (point.x || 0) - zone.x
  const dz = (point.z || 0) - zone.z
  return Math.sqrt(dx * dx + dz * dz) <= radius
}

function isUsableLink(link) {
  return link.status !== 'FAILED' && link.status !== 'EXPIRED'
}

function shortName(value = '') {
  return value
    .replace('Emergency Satellite ', 'Sat ')
    .replace('Carrier ', '')
    .replace('Regional ', '')
    .replace('Metro ', '')
    .replace('Data Centre', 'DC')
    .replace('Control Centre', 'Control')
}
