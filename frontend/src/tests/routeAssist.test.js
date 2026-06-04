import { describe, expect, test } from 'vitest'
import {
  edgeKey,
  linkBetween,
  isUsableLink,
  buildRouteAssist,
  findSuggestedPath,
  estimatePath,
} from '../utils/routeAssist'

// Small topology: A-B-C is the cheap fibre path; A-D-C is a slow satellite
// detour. A-E exists but E is a dead end. b-x is a FAILED link.
function fibre(id, a, b, extra = {}) {
  return {
    id, sourceNodeId: a, targetNodeId: b, linkType: 'FIBRE', status: 'HEALTHY',
    capacity: 100, currentLoad: 0, baseLatencyMs: 4, currentLatencyMs: 4,
    packetLossRate: 0, utilisation: 0, ...extra,
  }
}

const STATE = {
  nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'E' }],
  links: [
    fibre('ab', 'A', 'B'),
    fibre('bc', 'B', 'C'),
    fibre('dc', 'D', 'C'),
    { ...fibre('ad', 'A', 'D'), linkType: 'SATELLITE', baseLatencyMs: 130, currentLatencyMs: 130 },
    fibre('ae', 'A', 'E'),
    { ...fibre('be', 'B', 'E'), status: 'FAILED' },
  ],
}

const PACKET = { sourceNodeId: 'A', destinationNodeId: 'C', expiresAt: null }

describe('edgeKey', () => {
  test('is order-independent', () => {
    expect(edgeKey('A', 'B')).toBe(edgeKey('B', 'A'))
  })
})

describe('linkBetween', () => {
  test('finds a link in either direction', () => {
    expect(linkBetween(STATE.links, 'A', 'B')?.id).toBe('ab')
    expect(linkBetween(STATE.links, 'B', 'A')?.id).toBe('ab')
  })
  test('returns undefined when there is no link', () => {
    expect(linkBetween(STATE.links, 'A', 'C')).toBeUndefined()
    expect(linkBetween(undefined, 'A', 'B')).toBeUndefined()
  })
})

describe('isUsableLink', () => {
  test('healthy is usable, FAILED/EXPIRED are not', () => {
    expect(isUsableLink({ status: 'HEALTHY' })).toBe(true)
    expect(isUsableLink({ status: 'BUSY' })).toBe(true)
    expect(isUsableLink({ status: 'FAILED' })).toBe(false)
    expect(isUsableLink({ status: 'EXPIRED' })).toBe(false)
    expect(isUsableLink(null)).toBeFalsy()
  })
})

describe('findSuggestedPath', () => {
  test('prefers the cheap fibre path over the satellite detour', () => {
    expect(findSuggestedPath(STATE, 'A', 'C')).toEqual(['A', 'B', 'C'])
  })
  test('same source and destination returns the single node', () => {
    expect(findSuggestedPath(STATE, 'A', 'A')).toEqual(['A'])
  })
  test('missing endpoints or unknown nodes return empty', () => {
    expect(findSuggestedPath(STATE, '', 'C')).toEqual([])
    expect(findSuggestedPath(STATE, 'A', 'ZZ')).toEqual([])
  })
  test('returns empty when no route exists', () => {
    const island = { nodes: [{ id: 'A' }, { id: 'X' }], links: [] }
    expect(findSuggestedPath(island, 'A', 'X')).toEqual([])
  })
})

describe('buildRouteAssist', () => {
  test('is inactive when no packet is selected', () => {
    const r = buildRouteAssist(STATE, null, [])
    expect(r.active).toBe(false)
    expect(r.suggestedPath).toEqual([])
  })

  test('valid next hops from the current node exclude broken links', () => {
    const r = buildRouteAssist(STATE, PACKET, ['A', 'B'])
    expect(r.active).toBe(true)
    // From B: C is reachable, E is not (b-e is FAILED).
    expect(r.validNextIds.has('C')).toBe(true)
    expect(r.validNextIds.has('E')).toBe(false)
    expect(r.validNextIds.has('A')).toBe(true)
  })

  test('suggests the next hop toward the destination', () => {
    const r = buildRouteAssist(STATE, PACKET, ['A'])
    expect(r.suggestedPath).toEqual(['A', 'B', 'C'])
    expect(r.suggestedNextId).toBe('B')
  })
})

describe('estimatePath', () => {
  test('a path shorter than 2 nodes is still "building"', () => {
    const r = estimatePath(STATE, ['A'], PACKET)
    expect(r.hops).toBe(0)
    expect(r.quality).toBe('building')
  })

  test('a complete healthy route scores "good"', () => {
    const r = estimatePath(STATE, ['A', 'B', 'C'], PACKET)
    expect(r.hops).toBe(2)
    expect(r.blocked).toBe(false)
    expect(r.complete).toBe(true)
    expect(r.quality).toBe('good')
  })

  test('a route through a FAILED link is blocked', () => {
    const r = estimatePath(STATE, ['A', 'B', 'E'], PACKET)
    expect(r.blocked).toBe(true)
    expect(r.quality).toBe('blocked')
  })

  test('time left counts down from the packet deadline', () => {
    const soon = { ...PACKET, expiresAt: new Date(Date.now() + 30_000).toISOString() }
    const r = estimatePath(STATE, ['A'], soon)
    expect(r.timeLeftSeconds).toBeGreaterThan(0)
    expect(r.timeLeftSeconds).toBeLessThanOrEqual(30)
  })
})
