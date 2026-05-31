export const NODE_NAME = {
  'ru-north': 'North Tower',
  'ru-south': 'Hospital Tower',
  'ru-east': 'Airport Tower',
  'ru-west': 'Remote Tower',
  'oru-central': 'O-RU Rooftop',
  'sc-plaza': 'Plaza Cell',
  'sc-market': 'Market Cell',
  'sc-harbor': 'Harbor Cell',
  'odu-1': 'North Hub',
  'odu-2': 'South Hub',
  'ocu-1': 'O-CU Control',
  'edge-1': 'Edge DC',
  'upf-1': 'UPF Gateway',
  'core-1': 'Core Campus',
  'dc-1': 'Cloud DC',
  'sat-1': 'Satellite A',
  'sat-2': 'Satellite B',
}

export const NODE_DISTRICT = {
  'ru-west': 'Remote Hill',
  'ru-north': 'North Suburbs',
  'ru-south': 'Hospital District',
  'ru-east': 'Airport District',
  'sc-plaza': 'Downtown',
  'sc-market': 'Downtown',
  'oru-central': 'Downtown',
  'odu-1': 'Downtown',
  'odu-2': 'South Corridor',
  'ocu-1': 'Downtown',
  'sc-harbor': 'Harbor',
  'edge-1': 'Airport District',
  'upf-1': 'Core Campus',
  'core-1': 'Core Campus',
  'dc-1': 'Core Campus',
  'sat-1': 'Orbit',
  'sat-2': 'Orbit',
}

export function friendlyNodeName(nodeOrId) {
  const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId?.id
  return NODE_NAME[id] || nodeOrId?.name || id || 'Unknown node'
}

export function friendlyNodeType(type) {
  const names = {
    RADIO_TOWER: 'radio tower',
    O_RU: 'rooftop radio',
    SMALL_CELL: 'small cell',
    O_DU: 'aggregation hub',
    O_CU: 'control centre',
    EDGE: 'edge compute',
    UPF: 'packet gateway',
    CORE: 'core network',
    DATA_CENTRE: 'data centre',
    SATELLITE: 'orbital relay',
  }
  return names[type] || type || 'network node'
}

export function districtForNode(nodeOrId) {
  const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId?.id
  return NODE_DISTRICT[id] || 'Metro Region'
}
