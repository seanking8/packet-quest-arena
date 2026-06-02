import { describe, test, expect } from 'vitest'
import { nodeColor, linkColor } from '../components/map/colors'
import {
  districtNodeColor,
  nodeRouteRole,
  nodeTypeRadius,
  nodeEmissiveIntensity,
  nodeMaterialOpacity,
  haloOpacity,
  linkStrokeColor,
  linkStrokeWidth,
  linkStrokeOpacity,
  linkHandleOpacity,
  buildingColor,
  buildingOpacity,
} from '../components/map/districtStyle'

const node = { id: 'n1', type: 'O_DU', status: 'HEALTHY' }
const none = { isSource: false, isDest: false, isSuggestedNext: false, isValidNext: false, inPath: false }

describe('districtNodeColor', () => {
  test('route role colours take priority in order', () => {
    expect(districtNodeColor(node, { ...none, isSource: true })).toBe('#36c98d')
    expect(districtNodeColor(node, { ...none, isDest: true })).toBe('#ff4f9a')
    expect(districtNodeColor(node, { ...none, isSuggestedNext: true })).toBe('#b8f7ff')
    expect(districtNodeColor(node, { ...none, isValidNext: true })).toBe('#66e6ff')
    expect(districtNodeColor(node, { ...none, inPath: true })).toBe('#ffd479')
  })
  test('falls back to the type colour with no role', () => {
    expect(districtNodeColor(node, none)).toBe(nodeColor(node))
  })
})

describe('nodeRouteRole', () => {
  test('maps the highest-priority active flag to a role', () => {
    expect(nodeRouteRole({ isSource: true })).toBe('start')
    expect(nodeRouteRole({ isDest: true })).toBe('dest')
    expect(nodeRouteRole({ isCurrent: true })).toBe('current')
    expect(nodeRouteRole({ isSuggestedNext: true })).toBe('suggested')
    expect(nodeRouteRole({ isValidNext: true })).toBe('next')
    expect(nodeRouteRole({})).toBeNull()
  })
})

describe('nodeTypeRadius', () => {
  test('uses the caller value for satellites, fixed sizes otherwise', () => {
    expect(nodeTypeRadius('SATELLITE', 6)).toBe(6)
    expect(nodeTypeRadius('DATA_CENTRE', 6)).toBe(8)
    expect(nodeTypeRadius('CORE', 6)).toBe(8)
    expect(nodeTypeRadius('O_DU', 6)).toBe(5)
  })
})

describe('node material helpers', () => {
  test('emissive intensity prioritises active, then degraded, then failed', () => {
    expect(nodeEmissiveIntensity(true, false, false)).toBe(0.55)
    expect(nodeEmissiveIntensity(false, true, false)).toBe(0.35)
    expect(nodeEmissiveIntensity(false, false, true)).toBe(0.04)
    expect(nodeEmissiveIntensity(false, false, false)).toBe(0.18)
  })
  test('material opacity dims failed then dimmed', () => {
    expect(nodeMaterialOpacity(true, false)).toBe(0.55)
    expect(nodeMaterialOpacity(false, true)).toBe(0.38)
    expect(nodeMaterialOpacity(false, false)).toBe(1)
  })
  test('halo opacity dims when dimmed, brightens when active', () => {
    expect(haloOpacity(true, true)).toBe(0.12)
    expect(haloOpacity(false, true)).toBe(0.9)
    expect(haloOpacity(false, false)).toBe(0.38)
  })
})

describe('linkStrokeColor', () => {
  const link = { linkType: 'FIBRE', status: 'HEALTHY' }
  test('route/candidate colours win, else base link colour', () => {
    expect(linkStrokeColor({ inRoute: true, link })).toBe('#ffd479')
    expect(linkStrokeColor({ isValidNext: true, link })).toBe('#66e6ff')
    expect(linkStrokeColor({ isSuggested: true, link })).toBe('#b8f7ff')
    expect(linkStrokeColor({ link })).toBe(linkColor(link))
  })
  test('broken colour applies only when provided (tutorial)', () => {
    expect(linkStrokeColor({ broken: true, link })).toBe(linkColor(link))
    expect(linkStrokeColor({ broken: true, link, brokenColor: '#ff3b4e' })).toBe('#ff3b4e')
  })
})

describe('linkStrokeWidth', () => {
  test('priority: route > candidate > suggested > congested > ground > default', () => {
    expect(linkStrokeWidth({ inRoute: true })).toBe(5.2)
    expect(linkStrokeWidth({ isValidNext: true })).toBe(4.5)
    expect(linkStrokeWidth({ isSuggested: true })).toBe(3.4)
    expect(linkStrokeWidth({ status: 'OVERLOADED' })).toBe(3.8)
    expect(linkStrokeWidth({ status: 'CONGESTED' })).toBe(3.8)
    expect(linkStrokeWidth({ isGround: true })).toBe(2.4)
    expect(linkStrokeWidth({})).toBe(1.8)
  })
  test('broken width applies only when provided', () => {
    expect(linkStrokeWidth({ broken: true })).toBe(1.8)
    expect(linkStrokeWidth({ broken: true, brokenWidth: 4.2 })).toBe(4.2)
  })
})

describe('linkStrokeOpacity', () => {
  test('default ordering keeps broken low priority', () => {
    expect(linkStrokeOpacity({ dimmed: true })).toBe(0.2)
    expect(linkStrokeOpacity({ inRoute: true })).toBe(1)
    expect(linkStrokeOpacity({ isValidNext: true })).toBe(0.96)
    expect(linkStrokeOpacity({ isSuggested: true })).toBe(0.62)
    expect(linkStrokeOpacity({ broken: true })).toBe(0.48)
    expect(linkStrokeOpacity({ isGround: true })).toBe(0.92)
    expect(linkStrokeOpacity({})).toBe(0.78)
  })
  test('high-priority broken wins over route styling (tutorial)', () => {
    expect(linkStrokeOpacity({ broken: true, inRoute: true, brokenOpacity: 0.95, brokenHighPriority: true })).toBe(0.95)
  })
})

describe('building + handle helpers', () => {
  test('link handle opacity', () => {
    expect(linkHandleOpacity(true, false)).toBe(0.04)
    expect(linkHandleOpacity(false, true)).toBe(0.28)
    expect(linkHandleOpacity(false, false)).toBe(0.16)
  })
  test('building colour respects explicit override then type', () => {
    expect(buildingColor({ color: '#abcdef' }, true, true)).toBe('#abcdef')
    expect(buildingColor({}, true, false)).toBe('#b77e36')
    expect(buildingColor({}, false, true)).toBe('#636b78')
    expect(buildingColor({}, false, false)).toBe('#56616a')
  })
  test('building opacity', () => {
    expect(buildingOpacity(true, false)).toBe(0.9)
    expect(buildingOpacity(false, true)).toBe(0.82)
    expect(buildingOpacity(false, false)).toBe(0.88)
  })
})
