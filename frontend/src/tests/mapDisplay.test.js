import { describe, test, expect } from 'vitest'
import { friendlyNodeName, friendlyNodeType, districtForNode } from '../utils/mapDisplay'

describe('friendlyNodeName', () => {
  test('maps a known node id to its friendly name', () => {
    expect(friendlyNodeName('ru-north')).toBe('North Tower')
    expect(friendlyNodeName('dc-1')).toBe('Cloud DC')
  })
  test('accepts a node object and uses its id', () => {
    expect(friendlyNodeName({ id: 'oru-central' })).toBe('O-RU Rooftop')
  })
  test('falls back to the node name then the id', () => {
    expect(friendlyNodeName({ id: 'x', name: 'Custom' })).toBe('Custom')
    expect(friendlyNodeName('unknown-id')).toBe('unknown-id')
  })
})

describe('friendlyNodeType', () => {
  test('maps known types to readable labels', () => {
    expect(friendlyNodeType('RADIO_TOWER')).toBe('radio tower')
    expect(friendlyNodeType('DATA_CENTRE')).toBe('data centre')
    expect(friendlyNodeType('SATELLITE')).toBe('orbital relay')
  })
  test('falls back gracefully for unknown types', () => {
    expect(friendlyNodeType('WORMHOLE')).toBe('WORMHOLE')
    expect(friendlyNodeType(undefined)).toBe('network node')
  })
})

describe('districtForNode', () => {
  test('maps known nodes to districts', () => {
    expect(districtForNode('sc-plaza')).toBe('Downtown')
    expect(districtForNode('sat-1')).toBe('Orbit')
  })
  test('defaults to Metro Region for unknown nodes', () => {
    expect(districtForNode('mystery')).toBe('Metro Region')
  })
})
