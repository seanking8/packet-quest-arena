// Pure presentation helpers for weather/incident rendering.
// The backend owns severity, effects, expiry, and affected elements.

export const WEATHER_TYPES = new Set([
  'WEATHER_ELECTRICAL_STORM',
  'WEATHER_HIGH_WINDS',
  'WEATHER_CLEAR',
])

export const KNOWN_EVENT_TYPES = [
  'WEATHER_ELECTRICAL_STORM',
  'WEATHER_HIGH_WINDS',
  'WEATHER_CLEAR',
  'CONSTRUCTION',
  'FIBRE_CUT',
  'BUILDING_OBSTRUCTION',
  'LINK_CONGESTION',
  'PACKET_LOSS_SPIKE',
  'LATENCY_SPIKE',
  'TRAFFIC_SURGE',
  'NODE_FAILURE',
  'NODE_DEGRADED',
  'LINK_FAILURE',
  'POWER_OUTAGE',
  'RECOVERY',
]

/** True for weather conditions; false for construction/fibre/node/link incidents. */
export function isWeather(eventType) {
  return WEATHER_TYPES.has(eventType)
}

const META = {
  WEATHER_ELECTRICAL_STORM: { color: '#9b8cff', icon: 'STORM', label: 'Electrical storm', impact: 'Latency and packet-loss risk on wireless links. Avoid radio/mmWave routes.' },
  WEATHER_HIGH_WINDS: { color: '#5fd0ff', icon: 'WIND', label: 'High winds', impact: 'Radio/microwave instability. Prefer fibre where possible.' },
  WEATHER_CLEAR: { color: '#36c98d', icon: 'CLEAR', label: 'Clearing skies', impact: 'Wireless conditions improving in this area.' },
  CONSTRUCTION: { color: '#caa24a', icon: 'WORK', label: 'Construction', impact: 'Fibre routes at risk. Plan a reroute.' },
  FIBRE_CUT: { color: '#ff5d6c', icon: 'CUT', label: 'Fibre cut', impact: 'Fibre link down. Route around it.' },
  BUILDING_OBSTRUCTION: { color: '#b08cff', icon: 'BLOCK', label: 'Building obstruction', impact: 'Line-of-sight radio/mmWave degraded near tall buildings.' },
  LINK_CONGESTION: { color: '#ffb454', icon: 'JAM', label: 'Link congestion', impact: 'Load spike - expect drops on this link.' },
  PACKET_LOSS_SPIKE: { color: '#ff9ec7', icon: 'LOSS', label: 'Packet-loss spike', impact: 'Risky link - high drop chance.' },
  LATENCY_SPIKE: { color: '#ffd479', icon: 'SLOW', label: 'Latency spike', impact: 'Slower delivery - watch tight SLAs.' },
  TRAFFIC_SURGE: { color: '#ff9ec7', icon: 'LOAD', label: 'Traffic surge', impact: 'Background load rising across links.' },
  NODE_FAILURE: { color: '#ff5d6c', icon: 'NODE', label: 'Node failure', impact: 'Node unusable - exclude it from routes.' },
  NODE_DEGRADED: { color: '#ffb454', icon: 'WARN', label: 'Node degraded', impact: 'Slower node - adds latency to routes through it.' },
  LINK_FAILURE: { color: '#ff5d6c', icon: 'LINK', label: 'Link failure', impact: 'Link unusable - route around it.' },
  POWER_OUTAGE: { color: '#8a93b5', icon: 'POWER', label: 'Power outage', impact: 'District nodes degraded or down.' },
  RECOVERY: { color: '#36c98d', icon: 'OK', label: 'Recovery', impact: 'Affected elements are being restored.' },
}

const FALLBACK = { color: '#ffb454', icon: 'WARN', label: 'Incident', impact: 'Network condition changed in this area.' }

export function incidentMeta(eventType) {
  return META[eventType] || FALLBACK
}

export function incidentColor(eventType) {
  return incidentMeta(eventType).color
}

export function incidentLabel(eventType) {
  return incidentMeta(eventType).label
}

/** Human summary of affected links/link types for tooltips and the feed. */
export function affectedSummary(incident) {
  const types = incident.affectedLinkTypes || []
  const linkIds = incident.affectedLinkIds || []
  const nodeIds = incident.affectedNodeIds || []
  const parts = []
  if (types.length) parts.push(types.join(', '))
  if (linkIds.length) parts.push(`${linkIds.length} link${linkIds.length > 1 ? 's' : ''}`)
  if (nodeIds.length) parts.push(`${nodeIds.length} node${nodeIds.length > 1 ? 's' : ''}`)
  return parts.length ? parts.join(' | ') : '-'
}

/**
 * Seconds until an incident expires, using the backend server clock so the
 * countdown matches authoritative time. Returns null when no expiry is known.
 */
export function remainingSeconds(incident, serverTime) {
  if (!incident.expiresAt) return null
  const end = Date.parse(incident.expiresAt)
  const now = serverTime ? Date.parse(serverTime) : Date.parse(incident.startedAt)
  if (Number.isNaN(end) || Number.isNaN(now)) return null
  return Math.max(0, Math.round((end - now) / 1000))
}

/**
 * Ground-plane centre + radius for a zone. Prefers backend visualZone, then
 * falls back to the centroid of affected nodes or the target node.
 */
export function zoneCenter(incident, nodeIndex) {
  const vz = incident.visualZone
  if (vz && Number.isFinite(vz.x) && Number.isFinite(vz.z)) {
    return { x: vz.x, z: vz.z, radius: vz.radius > 0 ? vz.radius : 10 }
  }

  const ids = new Set(incident.affectedNodeIds || [])
  if (incident.targetType === 'NODE' && incident.targetId) ids.add(incident.targetId)
  const points = [...ids].map((id) => nodeIndex[id]).filter(Boolean)
  if (points.length) {
    const x = points.reduce((s, n) => s + (n.x || 0), 0) / points.length
    const z = points.reduce((s, n) => s + (n.z || 0), 0) / points.length
    return { x, z, radius: 8 }
  }
  return null
}
