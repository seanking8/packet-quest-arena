// Pure visual mappings for the 3D scene. No game logic — colours only.

export const NODE_TYPE_COLOR = {
  RADIO_TOWER: '#7aa2ff',
  O_RU: '#7aa2ff',
  SMALL_CELL: '#8bd3ff',
  O_DU: '#9b8cff',
  O_CU: '#b08cff',
  EDGE: '#8bffd3',
  UPF: '#a0ffd6',
  CORE: '#ff7ab6',
  DATA_CENTRE: '#ff9ec7',
  SATELLITE: '#ffd479',
}

export const LINK_TYPE_COLOR = {
  RADIO: '#4f8cff',
  MMWAVE: '#9b8cff',
  MICROWAVE: '#5fd0ff',
  FIBRE: '#7affc4',
  LEGACY: '#8a93b5',
  SATELLITE: '#ffd479',
}

export const NODE_STATUS_COLOR = {
  DEGRADED: '#ffb454',
  FAILED: '#ff5d6c',
}

export const LINK_STATUS_COLOR = {
  BUSY: '#7ad0ff',
  CONGESTED: '#ffb454',
  OVERLOADED: '#ff5d6c',
  FAILED: '#7a2330',
  EXPIRED: '#555a70',
}

/** Node colour: status overrides type when not healthy. */
export function nodeColor(node) {
  if (node?.status && NODE_STATUS_COLOR[node.status]) return NODE_STATUS_COLOR[node.status]
  return NODE_TYPE_COLOR[node?.type] || '#7aa2ff'
}

/** Link colour: status overrides type when not healthy. */
export function linkColor(link) {
  if (link?.status && LINK_STATUS_COLOR[link.status]) return LINK_STATUS_COLOR[link.status]
  return LINK_TYPE_COLOR[link?.linkType] || '#4f8cff'
}

/** Relative node size by type. */
export function nodeSize(type) {
  switch (type) {
    case 'CORE':
    case 'DATA_CENTRE':
      return 2.4
    case 'UPF':
    case 'EDGE':
      return 1.8
    case 'SATELLITE':
      return 1.6
    case 'RADIO_TOWER':
    case 'O_RU':
      return 1.2
    default:
      return 1.0
  }
}

/** Links that arc upward (line-of-sight / orbital), vs straight ground links. */
export function isArcLink(linkType) {
  return linkType === 'MICROWAVE' || linkType === 'SATELLITE' || linkType === 'MMWAVE'
}

/** Dashed style for broken links. */
export function isBrokenLink(status) {
  return status === 'FAILED' || status === 'EXPIRED'
}
