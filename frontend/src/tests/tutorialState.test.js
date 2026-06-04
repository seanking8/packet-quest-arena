import { describe, expect, test } from 'vitest'
import { createTutorialState } from '../tutorial/tutorialState'

describe('createTutorialState', () => {
  test('defaults to an ACTIVE easy tutorial session for the tutorial player', () => {
    const s = createTutorialState()
    expect(s.sessionId).toBe('tutorial-session')
    expect(s.status).toBe('ACTIVE')
    expect(s.difficulty).toBe('EASY')
    expect(s.players).toHaveLength(1)
    expect(s.players[0].id).toBe('tutorial-player')
    expect(s.nodes.length).toBeGreaterThan(0)
    expect(s.links.length).toBeGreaterThan(0)
  })

  test('pausing freezes the clock by reporting INTERMISSION', () => {
    expect(createTutorialState({ paused: true }).status).toBe('INTERMISSION')
  })

  test('an explicit status overrides the paused default', () => {
    expect(createTutorialState({ paused: true, status: 'ACTIVE' }).status).toBe('ACTIVE')
  })

  test('the tutorial always has a broken link to teach routing around failures', () => {
    const broken = createTutorialState().links.find((l) => l.id === 'l-oru-odu1')
    expect(broken.status).toBe('FAILED')
    expect(broken.packetLossRate).toBe(1)
  })

  test('it ships a storm and a construction incident', () => {
    const types = createTutorialState().incidents.map((i) => i.eventType)
    expect(types).toContain('WEATHER_ELECTRICAL_STORM')
    expect(types).toContain('CONSTRUCTION')
  })

  describe('lesson 1', () => {
    test('has a single CONTROL job from the south tower', () => {
      const s = createTutorialState({ lesson: 1 })
      expect(s.packetFlows).toHaveLength(1)
      const job = s.packetFlows[0]
      expect(job.id).toBe('tutorial-flow-1')
      expect(job.sourceNodeId).toBe('ru-south')
      expect(job.destinationNodeId).toBe('upf-1')
      expect(job.trafficType).toBe('CONTROL')
      expect(s.players[0].score).toBe(0)
    })

    test('delivering banks 120 points and counts a delivery', () => {
      const s = createTutorialState({ lesson: 1, packetStatus: 'DELIVERED' })
      expect(s.players[0].score).toBe(120)
      expect(s.players[0].deliveredPackets).toBe(1)
      expect(s.packetFlows[0].status).toBe('DELIVERED')
      expect(s.packetFlows[0].selectedPath.length).toBeGreaterThanOrEqual(2)
    })

    test('a delivered packet animates along the path the player built', () => {
      const path = ['ru-south', 'oru-central', 'odu-2', 'ocu-1', 'upf-1']
      const s = createTutorialState({ lesson: 1, packetStatus: 'DELIVERED', routePath: path })
      expect(s.packetFlows[0].selectedPath).toEqual(path)
    })
  })

  describe('lesson 2', () => {
    test('keeps lesson 1 as a completed job above the new VIDEO job', () => {
      const s = createTutorialState({ lesson: 2 })
      expect(s.packetFlows).toHaveLength(2)
      expect(s.packetFlows[0].status).toBe('DELIVERED') // lesson 1, shown first
      const current = s.packetFlows[1]
      expect(current.id).toBe('tutorial-flow-2')
      expect(current.trafficType).toBe('VIDEO')
      expect(current.sourceNodeId).toBe('ru-north')
      // Lesson 1's 120 is already banked at the start of lesson 2.
      expect(s.players[0].score).toBe(120)
      expect(s.players[0].deliveredPackets).toBe(1)
    })

    test('delivering lesson 2 adds 90 on top of lesson 1', () => {
      const s = createTutorialState({ lesson: 2, packetStatus: 'DELIVERED' })
      expect(s.players[0].score).toBe(210)
      expect(s.players[0].deliveredPackets).toBe(2)
    })
  })
})
