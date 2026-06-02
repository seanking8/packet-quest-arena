import { useMemo } from 'react'
import { incidentColor, isWeather, zoneCenter } from './incidents'
import useSvgZoom from './useSvgZoom'

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

const LINK_COLORS = {
  FIBRE: '#7affc4',
  RADIO: '#5fd0ff',
  MMWAVE: '#9b8cff',
  MICROWAVE: '#66e6ff',
  LEGACY: '#b7bdd8',
  SATELLITE: '#ffd479',
}

export default function TacticalMap({ state, onSelect, routePath = [], selectedPacket = null, layers }) {
  const showWeather = layers?.weather ?? true
  const showIncidents = layers?.incidents ?? true
  const showLabels = layers?.labels ?? false
  const nodes = state.nodes || []
  const links = state.links || []
  const nodeIndex = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes])
  const bounds = useMemo(() => mapBounds(nodes, state.mapObjects || []), [nodes, state.mapObjects])
  const routeEdges = useMemo(() => routeEdgeSet(routePath), [routePath])
  const affectedLinks = useMemo(
    () => affectedLinkColors(state.incidents || [], links, nodeIndex, showWeather, showIncidents),
    [state.incidents, links, nodeIndex, showWeather, showIncidents]
  )
  const nextHopIds = useMemo(
    () => nextHopSet(links, routePath, selectedPacket),
    [links, routePath, selectedPacket]
  )
  const currentNodeId = routePath[routePath.length - 1]
  // Edges from the current node to a valid next hop, so candidate links glow
  // (not just the candidate nodes).
  const nextHopEdges = useMemo(() => {
    const edges = new Set()
    if (!selectedPacket) return edges
    const current = currentNodeId || selectedPacket.sourceNodeId
    const visited = new Set(routePath)
    links.forEach((link) => {
      if (!isUsableLink(link)) return
      const hitsCurrent = link.sourceNodeId === current || link.targetNodeId === current
      const other = link.sourceNodeId === current ? link.targetNodeId : link.sourceNodeId
      if (hitsCurrent && !visited.has(other)) edges.add(edgeKey(link.sourceNodeId, link.targetNodeId))
    })
    return edges
  }, [links, routePath, selectedPacket, currentNodeId])

  const project = (node) => ({ x: node.x, y: -node.z })
  const { svgRef, viewBox, zoomed, reset, handlers } = useSvgZoom(bounds)

  return (
    <div className="tactical-map" aria-label="2D tactical network map">
      {zoomed && (
        <button className="map2d-reset" onClick={reset}>Reset view</button>
      )}
      <svg ref={svgRef} viewBox={viewBox} role="img" {...handlers} style={{ touchAction: 'none', cursor: 'grab' }}>
        <defs>
          <pattern id="tactical-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x={bounds.minX} y={bounds.minY} width={bounds.width} height={bounds.height} fill="url(#tactical-grid)" />

        {(state.incidents || []).map((incident) => {
          const weather = isWeather(incident.eventType)
          if (weather ? !showWeather : !showIncidents) return null
          const center = zoneCenter(incident, nodeIndex)
          if (!center) return null
          const color = incidentColor(incident.eventType)
          return (
            <circle
              key={incident.id}
              className={`tactical-zone ${weather ? 'weather' : 'incident'}`}
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

        {links.map((link) => {
          const source = nodeIndex[link.sourceNodeId]
          const target = nodeIndex[link.targetNodeId]
          if (!source || !target) return null
          const a = project(source)
          const b = project(target)
          const routeEdge = routeEdges.has(edgeKey(link.sourceNodeId, link.targetNodeId))
          const candidate = !routeEdge && nextHopEdges.has(edgeKey(link.sourceNodeId, link.targetNodeId))
          const color = candidate ? '#66e6ff' : (affectedLinks.get(link.id) || LINK_COLORS[link.linkType] || '#d8e3ff')
          return (
            <line
              key={link.id}
              className={`tactical-link ${link.status || ''} ${routeEdge ? 'route' : ''} ${candidate ? 'candidate' : ''}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={color}
              onClick={() => onSelect?.({ kind: 'link', data: link })}
            >
              <title>{link.id} | {link.linkType} | {link.status || 'HEALTHY'}</title>
            </line>
          )
        })}

        {nodes.map((node) => {
          const point = project(node)
          const role = nodeRole(node.id, selectedPacket, currentNodeId, nextHopIds)
          return (
            <g
              key={node.id}
              className={`tactical-node ${node.type || ''} ${node.status || ''} ${role}`}
              transform={`translate(${point.x} ${point.y})`}
              onClick={() => onSelect?.({ kind: 'node', data: node })}
            >
              <circle r={node.type === 'SATELLITE' ? 9 : 7} />
              <text className="tactical-node-icon" textAnchor="middle" dominantBaseline="central">
                {NODE_BADGES[node.type] || '?'}
              </text>
              {(showLabels || role) && (
                <text className="tactical-node-label" textAnchor="middle" y={-13}>
                  {shortName(node.name)}
                </text>
              )}
              <title>{node.name || node.id} | {node.type}</title>
            </g>
          )
        })}
      </svg>
      <div className="tactical-legend">
        <span><i style={{ background: LINK_COLORS.FIBRE }} />Fibre</span>
        <span><i style={{ background: LINK_COLORS.RADIO }} />Radio</span>
        <span><i style={{ background: LINK_COLORS.MMWAVE }} />mmWave</span>
        <span><i style={{ background: LINK_COLORS.SATELLITE }} />Satellite</span>
      </div>
    </div>
  )
}

function mapBounds(nodes, objects) {
  const xs = nodes.map((node) => node.x)
  const ys = nodes.map((node) => -node.z)
  objects.forEach((obj) => {
    xs.push(obj.x - (obj.width || 0), obj.x + (obj.width || 0))
    ys.push(-obj.z - (obj.depth || 0), -obj.z + (obj.depth || 0))
  })
  const minX = Math.min(...xs, -160) - 22
  const maxX = Math.max(...xs, 170) + 22
  const minY = Math.min(...ys, -120) - 22
  const maxY = Math.max(...ys, 120) + 22
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

function nextHopSet(links, routePath, selectedPacket) {
  if (!selectedPacket) return new Set()
  const current = routePath[routePath.length - 1] || selectedPacket.sourceNodeId
  const visited = new Set(routePath)
  const result = new Set()
  links.forEach((link) => {
    if (!isUsableLink(link)) return
    if (link.sourceNodeId === current && !visited.has(link.targetNodeId)) result.add(link.targetNodeId)
    if (link.targetNodeId === current && !visited.has(link.sourceNodeId)) result.add(link.sourceNodeId)
  })
  return result
}

function nodeRole(id, selectedPacket, currentNodeId, nextHopIds) {
  if (!selectedPacket) return ''
  if (id === currentNodeId) return 'current'
  if (id === selectedPacket.sourceNodeId) return 'source'
  if (id === selectedPacket.destinationNodeId) return 'destination'
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
