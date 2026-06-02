const PLAYER_ID = 'tutorial-player'

const NODES = [
  node('ru-north', 'North Suburb Cell Tower', 'RADIO_TOWER', -70, 3, 85),
  node('ru-south', 'South Hospital Macro Tower', 'RADIO_TOWER', -65, 3, -90),
  node('ru-east', 'Airport District Cell Tower', 'RADIO_TOWER', 95, 3, 70),
  node('ru-west', 'Remote Hill Radio Tower', 'RADIO_TOWER', -135, 3, 5),
  node('oru-central', 'Downtown Rooftop O-RU', 'O_RU', -20, 2, 10),
  node('sc-plaza', 'City Plaza Small Cell', 'SMALL_CELL', -35, 2, 48),
  node('sc-market', 'Market Quarter Small Cell', 'SMALL_CELL', 5, 2, 58),
  node('sc-harbor', 'Harbor Small Cell', 'SMALL_CELL', 35, 2, -82),
  node('odu-1', 'North Aggregation Hub', 'O_DU', -4, 1, 35),
  node('odu-2', 'South Aggregation Hub', 'O_DU', -5, 1, -38),
  node('ocu-1', 'Metro O-CU Control Centre', 'O_CU', 42, 1, 8),
  node('edge-1', 'East Edge Data Centre', 'EDGE', 76, 1, 45),
  node('upf-1', 'Carrier UPF Gateway', 'UPF', 86, 1, 0),
  node('core-1', 'Core Network Campus', 'CORE', 118, 1, -5),
  node('dc-1', 'Regional Cloud Data Centre', 'DATA_CENTRE', 150, 1, 38),
  node('sat-1', 'Emergency Satellite Alpha', 'SATELLITE', -25, 95, -25),
  node('sat-2', 'Emergency Satellite Beta', 'SATELLITE', 115, 105, 35),
]

const LINKS = [
  link('l-runorth-oru', 'ru-north', 'oru-central', 'RADIO'),
  link('l-rusouth-oru', 'ru-south', 'oru-central', 'RADIO'),
  link('l-ruwest-oru', 'ru-west', 'oru-central', 'RADIO'),
  link('l-rueast-ocu', 'ru-east', 'ocu-1', 'RADIO'),
  link('l-scplaza-oru', 'sc-plaza', 'oru-central', 'MMWAVE'),
  link('l-scplaza-runorth', 'sc-plaza', 'ru-north', 'MMWAVE'),
  link('l-scmarket-ocu', 'sc-market', 'ocu-1', 'MMWAVE'),
  link('l-scharbor-ocu', 'sc-harbor', 'ocu-1', 'MMWAVE'),
  link('l-runorth-rueast', 'ru-north', 'ru-east', 'MICROWAVE'),
  link('l-ruwest-rusouth', 'ru-west', 'ru-south', 'MICROWAVE'),
  link('l-oru-odu1', 'oru-central', 'odu-1', 'FIBRE'),
  link('l-oru-odu2', 'oru-central', 'odu-2', 'FIBRE'),
  link('l-odu1-ocu', 'odu-1', 'ocu-1', 'FIBRE'),
  link('l-odu2-ocu', 'odu-2', 'ocu-1', 'FIBRE'),
  link('l-ocu-edge', 'ocu-1', 'edge-1', 'FIBRE'),
  link('l-ocu-upf', 'ocu-1', 'upf-1', 'FIBRE'),
  link('l-edge-upf', 'edge-1', 'upf-1', 'FIBRE'),
  link('l-upf-core', 'upf-1', 'core-1', 'FIBRE'),
  link('l-core-dc', 'core-1', 'dc-1', 'FIBRE'),
  link('l-runorth-odu1', 'ru-north', 'odu-1', 'LEGACY'),
  link('l-odu1-odu2', 'odu-1', 'odu-2', 'LEGACY'),
  link('l-sat1-rusouth', 'sat-1', 'ru-south', 'SATELLITE'),
  link('l-sat1-core', 'sat-1', 'core-1', 'SATELLITE'),
  link('l-sat2-rueast', 'sat-2', 'ru-east', 'SATELLITE'),
  link('l-sat2-dc', 'sat-2', 'dc-1', 'SATELLITE'),
]

const MAP_OBJECTS = [
  mapObject('bld-1', 'DECORATIVE_BUILDING', 'Downtown Office Block', -18, 28, 12, 18, 10),
  mapObject('bld-2', 'DECORATIVE_BUILDING', 'North Apartments', -48, 70, 14, 12, 12),
  mapObject('bld-3', 'DECORATIVE_BUILDING', 'Market Hall', 8, 48, 18, 7, 14),
  mapObject('bld-4', 'DECORATIVE_BUILDING', 'Airport Terminal', 82, 88, 28, 9, 16),
  mapObject('bld-5', 'DECORATIVE_BUILDING', 'Harbor Warehouse', 30, -65, 28, 8, 18),
  mapObject('bld-6', 'DECORATIVE_BUILDING', 'Core Operations Hall', 120, -22, 28, 12, 18),
  mapObject('obs-1', 'TALL_OBSTRUCTION', 'Central Skyscraper', 18, 15, 12, 48, 12),
  mapObject('obs-2', 'TALL_OBSTRUCTION', 'Hospital Tower', -75, -72, 14, 34, 14),
  mapObject('cz-1', 'CONSTRUCTION_ZONE', 'Roadworks (West Ave)', -95, 15, 24, 1, 16),
  mapObject('cz-2', 'CONSTRUCTION_ZONE', 'Harbor Fibre Works', 12, -52, 22, 1, 12),
]

// Per-lesson packet jobs. Lesson 1 teaches basic routing; lesson 2 forces the
// player to route around a broken link and through a storm zone.
const LESSON_JOBS = {
  1: {
    id: 'tutorial-flow-1',
    sourceNodeId: 'ru-south',
    destinationNodeId: 'upf-1',
    trafficType: 'CONTROL',
    packetSize: 6,
    fallbackPath: ['ru-south', 'oru-central', 'odu-2', 'ocu-1', 'upf-1'],
  },
  2: {
    // The tempting path ru-north -> oru-central -> odu-1 -> ocu-1 is blocked
    // because oru-central -> odu-1 (l-oru-odu1) is FAILED, forcing the detour
    // via odu-2, which skirts the downtown storm zone.
    id: 'tutorial-flow-2',
    sourceNodeId: 'ru-north',
    destinationNodeId: 'ocu-1',
    trafficType: 'VIDEO',
    packetSize: 8,
    fallbackPath: ['ru-north', 'oru-central', 'odu-2', 'ocu-1'],
  },
}

export function createTutorialState({ remainingSeconds = 75, status, packetStatus = 'PENDING', paused = false, routePath = [], lesson = 1 } = {}) {
  const now = Date.now()
  const links = createTutorialLinks()
  // Freeze the main HUD clock while paused (it only ticks while ACTIVE).
  const effectiveStatus = status || (paused ? 'INTERMISSION' : 'ACTIVE')
  const job = LESSON_JOBS[lesson] || LESSON_JOBS[1]
  // Animate the packet along the route the player actually built (fall back to
  // the lesson's default path only if somehow empty).
  const deliveredPath = routePath && routePath.length >= 2 ? routePath : job.fallbackPath
  // Lesson 1 banks 120 once delivered; lesson 2 adds another 90.
  const deliveryBonus = lesson >= 2 ? 90 : 120
  const priorLessonScore = lesson >= 2 ? 120 : 0
  const delivered = packetStatus === 'DELIVERED'
  const bankedScore = priorLessonScore + (delivered ? deliveryBonus : 0)

  // The current lesson's active job.
  const currentFlow = {
    id: job.id,
    ownerPlayerId: PLAYER_ID,
    sourceNodeId: job.sourceNodeId,
    destinationNodeId: job.destinationNodeId,
    trafficType: job.trafficType,
    packetSize: job.packetSize,
    deadlineSeconds: 75,
    createdAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + remainingSeconds * 1000).toISOString(),
    status: packetStatus,
    selectedPath: delivered ? deliveredPath : null,
    latencyMs: delivered ? 28 : 0,
    scoreDelta: delivered ? deliveryBonus : 0,
  }

  // On lesson 2, keep lesson 1's job listed above (shown as delivered) so the
  // player sees their progress — the second job appears UNDER the first.
  const lessonOne = LESSON_JOBS[1]
  const completedFlows = lesson >= 2
    ? [{
        id: lessonOne.id,
        ownerPlayerId: PLAYER_ID,
        sourceNodeId: lessonOne.sourceNodeId,
        destinationNodeId: lessonOne.destinationNodeId,
        trafficType: lessonOne.trafficType,
        packetSize: lessonOne.packetSize,
        deadlineSeconds: 75,
        createdAt: new Date(now - 2000).toISOString(),
        expiresAt: new Date(now + remainingSeconds * 1000).toISOString(),
        status: 'DELIVERED',
        selectedPath: null,
        latencyMs: 28,
        scoreDelta: 120,
      }]
    : []

  return {
    sessionId: 'tutorial-session',
    status: effectiveStatus,
    difficulty: 'EASY',
    remainingSeconds,
    players: [
      {
        id: PLAYER_ID,
        displayName: 'You',
        color: 'blue',
        score: bankedScore,
        deliveredPackets: (lesson >= 2 ? 1 : 0) + (delivered ? 1 : 0),
        droppedPackets: 0,
      },
    ],
    nodes: NODES,
    links,
    packetFlows: [...completedFlows, currentFlow],
    incidents: createTutorialIncidents(now),
    mapObjects: MAP_OBJECTS,
    serverTime: new Date(now).toISOString(),
  }
}

function createTutorialLinks() {
  return LINKS.map((base) => {
    const link = { ...base }
    // A fully broken link so the tutorial can teach routing AROUND failures.
    if (link.id === 'l-oru-odu1') {
      link.status = 'FAILED'
      link.packetLossRate = 1
    }
    if (['l-oru-odu2', 'l-odu2-ocu'].includes(link.id)) {
      link.status = 'BUSY'
      link.currentLoad = Math.round(link.capacity * 0.72)
      link.utilisation = 0.72
      link.currentLatencyMs = link.baseLatencyMs + 12
      link.packetLossRate = Math.max(link.packetLossRate, 0.035)
    }
    if (['RADIO', 'MMWAVE', 'MICROWAVE', 'SATELLITE'].includes(link.linkType)) {
      link.currentLatencyMs = Math.round(link.currentLatencyMs * 1.25)
      link.packetLossRate = Math.max(link.packetLossRate, link.linkType === 'SATELLITE' ? 0.04 : 0.035)
    }
    return link
  })
}

function createTutorialIncidents(now) {
  return [
    {
      id: 'tutorial-weather-storm',
      eventType: 'WEATHER_ELECTRICAL_STORM',
      targetType: 'ZONE',
      targetId: 'zone-downtown',
      severity: 0.55,
      message: 'Electrical storm is making wireless hops around downtown riskier.',
      startedAt: new Date(now - 10_000).toISOString(),
      durationSeconds: 120,
      expiresAt: new Date(now + 110_000).toISOString(),
      affectedLinkTypes: ['RADIO', 'MMWAVE', 'MICROWAVE', 'SATELLITE'],
      affectedLinkIds: [],
      affectedNodeIds: [],
      visualZone: { id: 'zone-downtown-storm', x: -12, z: 24, radius: 46 },
    },
    {
      id: 'tutorial-construction',
      eventType: 'CONSTRUCTION',
      targetType: 'ZONE',
      targetId: 'zone-south-fibre',
      severity: 0.45,
      message: 'Roadworks are slowing the south fibre backhaul.',
      startedAt: new Date(now - 8_000).toISOString(),
      durationSeconds: 100,
      expiresAt: new Date(now + 92_000).toISOString(),
      affectedLinkTypes: ['FIBRE'],
      affectedLinkIds: ['l-oru-odu2', 'l-odu2-ocu'],
      affectedNodeIds: [],
      visualZone: { id: 'zone-south-fibre', x: -8, z: -34, radius: 24 },
    },
  ]
}

function node(id, name, type, x, y, z) {
  return { id, name, type, status: 'HEALTHY', x, y, z, packetLossRate: 0, latencyMultiplier: 1 }
}

function link(id, sourceNodeId, targetNodeId, linkType) {
  const capacity = capacityFor(linkType)
  const baseLatencyMs = baseLatencyFor(linkType)
  return {
    id,
    sourceNodeId,
    targetNodeId,
    linkType,
    status: 'HEALTHY',
    capacity,
    currentLoad: 0,
    baseLatencyMs,
    currentLatencyMs: baseLatencyMs,
    packetLossRate: packetLossFor(linkType),
    temporary: false,
    createdByPlayerId: null,
    expiresAt: null,
    utilisation: 0,
  }
}

function mapObject(id, type, label, x, z, sizeX, sizeY, sizeZ) {
  return { id, type, label, x, y: 0, z, sizeX, sizeY, sizeZ }
}

function capacityFor(type) {
  return {
    FIBRE: 120,
    MMWAVE: 90,
    MICROWAVE: 70,
    RADIO: 60,
    SATELLITE: 50,
    LEGACY: 40,
  }[type] || 60
}

function baseLatencyFor(type) {
  return {
    FIBRE: 4,
    MMWAVE: 6,
    MICROWAVE: 9,
    RADIO: 10,
    LEGACY: 30,
    SATELLITE: 130,
  }[type] || 10
}

function packetLossFor(type) {
  return {
    FIBRE: 0.001,
    MICROWAVE: 0.01,
    RADIO: 0.01,
    MMWAVE: 0.02,
    LEGACY: 0.02,
    SATELLITE: 0.03,
  }[type] || 0.01
}
