import { expect, test } from 'vitest'
import {
  isWeather, incidentMeta, affectedSummary, remainingSeconds, zoneCenter,
} from '../components/map/incidents'

test('weather types are separated from non-weather incidents', () => {
  expect(isWeather('WEATHER_ELECTRICAL_STORM')).toBe(true)
  expect(isWeather('WEATHER_CLEAR')).toBe(true)
  expect(isWeather('FIBRE_CUT')).toBe(false)
  expect(isWeather('CONSTRUCTION')).toBe(false)
})

test('every known event type has presentation metadata; unknown falls back', () => {
  expect(incidentMeta('WEATHER_HIGH_WINDS').label).toBe('High winds')
  const fallback = incidentMeta('SOMETHING_NEW')
  expect(fallback.icon).toBeTruthy()
  expect(fallback.label).toBe('Incident')
})

test('affected summary lists link types, link ids and node ids', () => {
  expect(affectedSummary({ affectedLinkTypes: ['RADIO', 'MMWAVE'] })).toBe('RADIO, MMWAVE')
  expect(affectedSummary({ affectedLinkIds: ['l1', 'l2'] })).toBe('2 links')
  expect(affectedSummary({ affectedNodeIds: ['n1'] })).toBe('1 node')
  expect(affectedSummary({})).toBe('—')
})

test('remaining seconds uses the server clock and never goes negative', () => {
  const serverTime = '2026-05-31T10:00:00Z'
  expect(remainingSeconds({ expiresAt: '2026-05-31T10:00:30Z' }, serverTime)).toBe(30)
  expect(remainingSeconds({ expiresAt: '2026-05-31T09:59:50Z' }, serverTime)).toBe(0)
  expect(remainingSeconds({}, serverTime)).toBeNull()
})

test('zone centre prefers visualZone, then falls back to affected-node centroid', () => {
  expect(zoneCenter({ visualZone: { x: 20, z: -10, radius: 18 } }, {})).toEqual({ x: 20, z: -10, radius: 18 })

  const nodeIndex = { a: { x: 0, z: 0 }, b: { x: 10, z: 20 } }
  expect(zoneCenter({ affectedNodeIds: ['a', 'b'] }, nodeIndex)).toEqual({ x: 5, z: 10, radius: 8 })

  expect(zoneCenter({ targetType: 'NODE', targetId: 'b' }, nodeIndex)).toEqual({ x: 10, z: 20, radius: 8 })
  expect(zoneCenter({ affectedNodeIds: ['missing'] }, nodeIndex)).toBeNull()
})
