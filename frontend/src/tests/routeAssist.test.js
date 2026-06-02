import { describe, test, expect } from 'vitest'
import {
  edgeKey,
  linkBetween,
  isUsableLink,
  buildRouteAssist,
  findSuggestedPath,
  estimatePath,
} from '../utils/routeAssist'

// A tiny linear topology: A - B - C - D (all FIBRE), plus a broken A-D shortcut.
const NODES = ['A', 'B', 'C', 'D'].map((id) => ({ id, type: 'O_DU' }))
const LINKS = [
  { id: 'ab', sourceNodeId: 'A', targetNodeId: 'B', linkType: 'FIBRE', status: 'HEALTHY', capacity: 100, currentLoad: 0, baseLatencyMs: 4, packetLossRate: 0.01 },
  { id: 'bc', sourceNodeId: 'B', targetNodeId: 'C', linkType: 'FIBRE', status: 'HEALTHY', capacity: 100, currentLoad: 0, baseLatencyMs: 4, packetLossRate: 0.01 },
  { id: 'cd', sourceNodeId: 'C', targetNodeId: 'D', linkType: 'FIBRE', status: 'HEALTHY', capacity: 100, currentLoad: 0, baseLatencyMs: 4, packetLossRate: 0.01 },
  { id: 'ad', sourceNodeId: 'A', targetNodeId: 'D', linkType: 'FIBRE', status: 'FAILED', capacity: 100, currentLoad: 0, baseLatencyMs: 4, packetLossRate: 1 },
]
const state = { nodes: NODES, links: LINKS }
const packet = { sourceNodeId: 'A', destinationNodeId: 'D' }

describe('edgeKey', () => {
  test('is order-independent', () => {
    expect(edgeKey('A', 'B')).toBe(edgeKey('B', 'A'))
  })
})

describe('linkBetween', () => {
  test('finds a link in either direction', () => {
    expect(linkBetween(LINKS, 'A', 'B')?.id).toBe('ab')
    expect(linkBetween(LINKS, 'B', 'A')?.id).toBe('ab')
  })
  test('returns undefined when none', () => {
    expect(linkBetween(LINKS, 'A', 'C')).toBeUndefined()
  })
})

describe('isUsableLink', () => {
  test('healthy is usable, failed/expired are not', () => {
    expect(isUsableLink({ status: 'HEALTHY' })).toBe(true)
    expect(isUsableLink({ status: 'FAILED' })).toBe(false)
    expect(isUsableLink({ status: 'EXPIRED' })).toBe(false)
    expect(isUsableLink(null)).toBeFalsy()
  })
})

describe('findSuggestedPath', () => {
  test('routes around the broken A-D shortcut via B,C', () => {
    const path = findSuggestedPath(state, 'A', 'D')
    expect(path[0]).toBe('A')
    expect(path.at(-1)).toBe('D')
    expect(path).not.toContain(undefined)
    // must go the long way since A-D is FAILED
    expect(path).toEqual(['A', 'B', 'C', 'D'])
  })
  test('same source and dest returns the single node', () => {
    expect(findSuggestedPath(state, 'A', 'A')).toEqual(['A'])
  })
  test('missing endpoints return empty', () => {
    expect(findSuggestedPath(state, null, 'D')).toEqual([])
    expect(findSuggestedPath(state, 'A', 'Z')).toEqual([])
  })
})

describe('buildRouteAssist', () => {
  test('inactive when no packet selected', () => {
    const r = buildRouteAssist(state, null, [])
    expect(r.active).toBe(false)
    expect(r.validNextIds.size).toBe(0)
  })
  test('valid next hops from the current node exclude broken links', () => {
    const r = buildRouteAssist(state, packet, ['A'])
    expect(r.active).toBe(true)
    expect(r.validNextIds.has('B')).toBe(true)   // A-B healthy
    expect(r.validNextIds.has('D')).toBe(false)  // A-D failed
  })
  test('suggests the next hop toward the destination', () => {
    const r = buildRouteAssist(state, packet, ['A'])
    expect(r.suggestedNextId).toBe('B')
  })
})

describe('estimatePath', () => {
  test('returns stats for a built path', () => {
    const stats = estimatePath(state, ['A', 'B', 'C', 'D'], packet)
    expect(stats).toBeTruthy()
    expect(stats.hops).toBe(3)
    expect(stats.latencyMs).toBeGreaterThan(0)
  })
})
