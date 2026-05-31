import { expect, test } from 'vitest'
import { formatTimer, timerUrgency, secondsLeft, networkPressure, rankedPlayers, leaderOf } from '../lib/format'

test('formatTimer renders m:ss and floors negatives to 0:00', () => {
  expect(formatTimer(125)).toBe('2:05')
  expect(formatTimer(-5)).toBe('0:00')
})

test('timerUrgency bands the clock without ending the match', () => {
  expect(timerUrgency(120)).toBe('')
  expect(timerUrgency(45)).toBe('urgent')
  expect(timerUrgency(10)).toBe('critical')
})

test('secondsLeft counts down to a deadline and never goes negative', () => {
  const now = 1_000_000
  expect(secondsLeft(new Date(now + 30_000).toISOString(), now)).toBe(30)
  expect(secondsLeft(new Date(now - 5_000).toISOString(), now)).toBe(0)
  expect(secondsLeft(null, now)).toBeNull()
})

test('networkPressure summarises link load vs capacity into a band', () => {
  const low = networkPressure([{ currentLoad: 1, capacity: 10 }])
  expect(low.band).toBe('LOW')
  const high = networkPressure([{ currentLoad: 9, capacity: 10 }])
  expect(high.band).toBe('HIGH')
  // No links / no capacity → zero pressure, never NaN.
  expect(networkPressure([]).ratio).toBe(0)
})

test('rankedPlayers and leaderOf sort by backend score descending', () => {
  const players = [{ id: 'a', score: 10 }, { id: 'b', score: 40 }, { id: 'c', score: 25 }]
  expect(rankedPlayers(players).map((p) => p.id)).toEqual(['b', 'c', 'a'])
  expect(leaderOf(players).id).toBe('b')
})
