import { describe, expect, test } from 'vitest'
import { friendlyNodeName, friendlyNodeType, districtForNode } from '../utils/mapDisplay'

describe('friendlyNodeName', () => {
  test('maps a known node id to its friendly name', () => {
    expect(friendlyNodeName('ru-north')).toBe('North Tower')
  })
  test('accepts a node object and uses its id', () => {
    expect(friendlyNodeName({ id: 'core-1' })).toBe('Core Campus')
  })
  test('falls back to the node name, then the id, then a default', () => {
    expect(friendlyNodeName({ id: 'mystery', name: 'Mystery Node' })).toBe('Mystery Node')
    expect(friendlyNodeName('unknown-id')).toBe('unknown-id')
    expect(friendlyNodeName(null)).toBe('Unknown node')
  })
})

describe('friendlyNodeType', () => {
  test('maps known types to readable labels', () => {
    expect(friendlyNodeType('O_RU')).toBe('rooftop radio')
    expect(friendlyNodeType('SATELLITE')).toBe('orbital relay')
  })
  test('falls back gracefully for unknown types', () => {
    expect(friendlyNodeType('WORMHOLE')).toBe('WORMHOLE')
    expect(friendlyNodeType(undefined)).toBe('network node')
  })
})

describe('districtForNode', () => {
  test('maps known nodes to their district', () => {
    expect(districtForNode('sc-plaza')).toBe('Downtown')
    expect(districtForNode({ id: 'sat-1' })).toBe('Orbit')
  })
  test('defaults to Metro Region for unknown nodes', () => {
    expect(districtForNode('nowhere')).toBe('Metro Region')
  })
})
