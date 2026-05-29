import { expect, test } from 'vitest'
import {
  nodeColor, linkColor, nodeSize, isArcLink, isBrokenLink,
  NODE_TYPE_COLOR, LINK_STATUS_COLOR,
} from '../components/map/colors'

test('node colour uses type when healthy, status when not', () => {
  expect(nodeColor({ type: 'CORE', status: 'HEALTHY' })).toBe(NODE_TYPE_COLOR.CORE)
  expect(nodeColor({ type: 'CORE', status: 'FAILED' })).toBe('#ff5d6c')
})

test('link colour uses status override for congestion', () => {
  expect(linkColor({ linkType: 'FIBRE', status: 'HEALTHY' })).toBe('#7affc4')
  expect(linkColor({ linkType: 'FIBRE', status: 'OVERLOADED' })).toBe(LINK_STATUS_COLOR.OVERLOADED)
})

test('node size scales by importance', () => {
  expect(nodeSize('CORE')).toBeGreaterThan(nodeSize('SMALL_CELL'))
})

test('arc and broken helpers', () => {
  expect(isArcLink('SATELLITE')).toBe(true)
  expect(isArcLink('FIBRE')).toBe(false)
  expect(isBrokenLink('FAILED')).toBe(true)
  expect(isBrokenLink('HEALTHY')).toBe(false)
})
