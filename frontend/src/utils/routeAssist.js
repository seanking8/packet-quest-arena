const BROKEN_STATUS = new Set(['FAILED', 'EXPIRED'])

export function edgeKey(a, b) {
  return [a, b].sort((x, y) => x.localeCompare(y)).join('--')
}

export function linkBetween(links, a, b) {
  return (links || []).find((link) =>
    (link.sourceNodeId === a && link.targetNodeId === b)
    || (link.sourceNodeId === b && link.targetNodeId === a)
  )
}

export function isUsableLink(link) {
  return link && !BROKEN_STATUS.has(link.status)
}

export function buildRouteAssist(state, selectedPacket, routePath = []) {
  const nodes = state.nodes || []
  const links = state.links || []
  const sourceId = selectedPacket?.sourceNodeId
  const destId = selectedPacket?.destinationNodeId
  const currentId = routePath[routePath.length - 1] || sourceId

  if (!selectedPacket || !sourceId || !destId || !currentId) {
    return {
      active: false,
      relevantIds: new Set(),
      validNextIds: new Set(),
      validNextEdges: new Set(),
      suggestedPath: [],
      suggestedEdges: new Set(),
      routeStats: null,
    }
  }

  const validNextIds = new Set()
  const validNextEdges = new Set()
  links.forEach((link) => {
    if (!isUsableLink(link)) return
    let next = null
    if (link.sourceNodeId === currentId) next = link.targetNodeId
    if (link.targetNodeId === currentId) next = link.sourceNodeId
    if (next) {
      validNextIds.add(next)
      validNextEdges.add(edgeKey(currentId, next))
    }
  })

  const suggestedPath = findSuggestedPath({ nodes, links }, currentId, destId)
  const suggestedEdges = new Set()
  for (let i = 0; i < suggestedPath.length - 1; i += 1) {
    suggestedEdges.add(edgeKey(suggestedPath[i], suggestedPath[i + 1]))
  }

  const relevantIds = new Set([sourceId, destId, currentId, ...routePath, ...validNextIds, ...suggestedPath])
  const routeStats = estimatePath(state, routePath, selectedPacket)

  return {
    active: true,
    sourceId,
    destId,
    currentId,
    suggestedNextId: suggestedPath[1] || null,
    suggestedPath,
    suggestedEdges,
    validNextIds,
    validNextEdges,
    relevantIds,
    routeStats,
  }
}

export function findSuggestedPath(state, sourceId, destId) {
  if (!sourceId || !destId) return []
  if (sourceId === destId) return [sourceId]

  const nodes = state.nodes || []
  const links = state.links || []
  const nodeIds = new Set(nodes.map((n) => n.id))
  if (!nodeIds.has(sourceId) || !nodeIds.has(destId)) return []

  const dist = new Map()
  const prev = new Map()
  const remaining = new Set(nodeIds)
  nodeIds.forEach((id) => dist.set(id, Number.POSITIVE_INFINITY))
  dist.set(sourceId, 0)

  while (remaining.size) {
    let current = null
    let best = Number.POSITIVE_INFINITY
    remaining.forEach((id) => {
      const d = dist.get(id)
      if (d < best) {
        best = d
        current = id
      }
    })
    if (!current || best === Number.POSITIVE_INFINITY) break
    remaining.delete(current)
    if (current === destId) break

    links.forEach((link) => {
      if (!isUsableLink(link)) return
      let next = null
      if (link.sourceNodeId === current) next = link.targetNodeId
      if (link.targetNodeId === current) next = link.sourceNodeId
      if (!next || !remaining.has(next)) return

      const candidate = best + linkWeight(link)
      if (candidate < dist.get(next)) {
        dist.set(next, candidate)
        prev.set(next, current)
      }
    })
  }

  if (!prev.has(destId)) return []
  const path = [destId]
  let cursor = destId
  while (cursor !== sourceId) {
    cursor = prev.get(cursor)
    if (!cursor) return []
    path.unshift(cursor)
  }
  return path
}

export function estimatePath(state, path, packet) {
  if (!Array.isArray(path) || path.length < 2) {
    return {
      hops: 0,
      latencyMs: 0,
      lossPct: 0,
      worstUtilisation: 0,
      blocked: false,
      quality: 'building',
      qualityLabel: 'Pick the next node',
      timeLeftSeconds: timeLeftSeconds(packet),
    }
  }

  let latencyMs = 0
  let successProbability = 1
  let worstUtilisation = 0
  let blocked = false

  for (let i = 0; i < path.length - 1; i += 1) {
    const link = linkBetween(state.links || [], path[i], path[i + 1])
    if (!link || !isUsableLink(link)) {
      blocked = true
      break
    }
    const utilisation = Number(link.utilisation ?? ((link.currentLoad || 0) / Math.max(link.capacity || 1, 1)))
    worstUtilisation = Math.max(worstUtilisation, utilisation)
    latencyMs += effectiveLatency(link) * (1 + Math.max(0, utilisation - 0.7) * 1.8)
    successProbability *= Math.max(0, 1 - (link.packetLossRate || 0))
  }

  const lossPct = Math.max(0, Math.min(100, (1 - successProbability) * 100))
  const complete = packet && path[0] === packet.sourceNodeId && path[path.length - 1] === packet.destinationNodeId
  const quality = blocked
    ? 'blocked'
    : !complete
      ? 'building'
      : worstUtilisation >= 0.9 || lossPct >= 8
        ? 'risky'
        : worstUtilisation >= 0.65 || lossPct >= 4
          ? 'caution'
          : 'good'

  return {
    hops: path.length - 1,
    latencyMs,
    lossPct,
    worstUtilisation,
    blocked,
    complete,
    quality,
    qualityLabel: qualityLabel(quality),
    timeLeftSeconds: timeLeftSeconds(packet),
  }
}

function linkWeight(link) {
  const utilisation = Number(link.utilisation ?? ((link.currentLoad || 0) / Math.max(link.capacity || 1, 1)))
  const typePenalty = {
    FIBRE: 0,
    MMWAVE: 3,
    MICROWAVE: 6,
    RADIO: 8,
    LEGACY: 30,
    SATELLITE: 90,
  }[link.linkType] || 12
  const statusPenalty = {
    BUSY: 18,
    CONGESTED: 45,
    OVERLOADED: 95,
  }[link.status] || 0
  return effectiveLatency(link) + typePenalty + statusPenalty + utilisation * 35 + (link.packetLossRate || 0) * 900
}

function effectiveLatency(link) {
  return Number(link.currentLatencyMs || link.baseLatencyMs || 10)
}

function qualityLabel(quality) {
  return {
    good: 'Good route',
    caution: 'Usable, watch congestion',
    risky: 'Risky route',
    blocked: 'Broken path',
    building: 'Route in progress',
  }[quality] || 'Route in progress'
}

function timeLeftSeconds(packet) {
  if (!packet?.expiresAt) return null
  return Math.max(0, Math.ceil((new Date(packet.expiresAt).getTime() - Date.now()) / 1000))
}
