import { describe, expect, it } from 'vitest'
import { createFriends, parseSave, tick } from './game'
import { interactionBalance as balance } from './balance'
import { advanceInteraction, affinity, beginGesture, bodyZone, controlled, endGesture, grantPetReward, moveGesture, normalPet, reactionLine, speak } from './interaction'
import { findRoute, segmentWalkable, validPosition, walkable } from './navigation'
const now = 1800000000000
function setup() {
  const f = createFriends(now)[0]
  f.stats.happiness = 40; f.stats.affection = 20
  return f
}
function press(f = setup(), id = 1) {
  beginGesture(f, id, { x: 100, y: 100 }, 'head', now, 'mouse')
  return f
}
describe('gesture state machine', () => {
  it('a short tap commits exactly one normal reward on release and resumes walking', () => {
    const f = press()
    expect(f.moving).toBe(false); expect(f.route).toEqual([])
    expect(f.stats.affection).toBe(20)
    const result = endGesture(f, 1, now + 200)
    expect(result?.rewarded).toBe(true)
    expect(f.stats.happiness).toBe(42); expect(f.stats.affection).toBe(21)
    expect(f.interaction?.phase).toBe('delighted')
    expect(endGesture(f, 1, now + 210)).toBeNull()
    advanceInteraction(f, now + 2000, .1)
    expect(controlled(f)).toBe(false)
    tick([f, ...createFriends(now).slice(1)], now + 2100, .1, () => {})
    expect(f.route.length).toBeGreaterThan(0)
  })
  it('allows small hand jitter, enters petting at .8s and bonds once at 2s', () => {
    const f = press()
    moveGesture(f, 1, { x: 103, y: 102 }, { x: 3, y: 2 }, now + 700)
    advanceInteraction(f, now + 799, .1); expect(f.interaction?.phase).toBe('pressing')
    advanceInteraction(f, now + 800, .1); expect(f.interaction?.phase).toBe('petting')
    expect(f.stats.happiness).toBe(40)
    advanceInteraction(f, now + 2000, .1); expect(f.interaction?.phase).toBe('bonding')
    expect(f.stats.happiness).toBe(45); expect(f.stats.affection).toBe(23)
    expect(f.bubble).toMatch(/[가-힣]/)
    for (const elapsed of [2100, 5000, 11000, 25000]) advanceInteraction(f, now + elapsed, .1)
    expect(f.stats.happiness).toBe(45); expect(f.stats.affection).toBe(23)
    endGesture(f, 1, now + 26000)
    expect(f.interaction?.phase).toBe('settling')
    expect(f.stats.affection).toBe(23)
  })
  it('does not turn an incomplete long pet or cancellation into a normal tap', () => {
    for (const cancel of [false, true]) {
      const f = press()
      advanceInteraction(f, now + 1000, .1)
      endGesture(f, 1, now + 1400, cancel)
      expect(f.stats.affection).toBe(20)
      expect(f.interaction?.gesture).toBeUndefined()
    }
    const f = press()
    endGesture(f, 1, now + 100, true)
    expect(f.stats.affection).toBe(20)
  })
  it('drag cancels a tap and a pending long pet without awarding anything', () => {
    for (const elapsed of [100, 1000, 1999]) {
      const f = press()
      advanceInteraction(f, now + elapsed, .1)
      moveGesture(f, 1, { x: 120, y: 100 }, { x: 200, y: 100 }, now + elapsed)
      advanceInteraction(f, now + 3000, .1)
      expect(f.interaction?.phase).toBe('dragging')
      endGesture(f, 1, now + 3200)
      expect(f.stats.happiness).toBe(40); expect(f.stats.affection).toBe(20)
      expect(f.interaction?.phase).toBe('landing')
      advanceInteraction(f, now + 3700, .1); expect(f.interaction?.phase).toBe('settling')
      advanceInteraction(f, now + 4800, .1); expect(controlled(f)).toBe(false)
    }
  })
  it('a drag after a completed bond never adds a second reward', () => {
    const f = press()
    advanceInteraction(f, now + 2000, .1)
    moveGesture(f, 1, { x: 130, y: 100 }, { x: 100, y: 0 }, now + 2200)
    endGesture(f, 1, now + 2400)
    expect(f.stats.affection).toBe(23)
  })
  it('guards pointer ownership and supports independent simultaneous friends', () => {
    const friends = createFriends(now)
    friends.forEach((f, i) => beginGesture(f, i, { x: 10, y: 10 }, 'body', now, 'touch'))
    expect(beginGesture(friends[0], 99, { x: 0, y: 0 }, 'head', now, 'touch')).toBe(false)
    expect(endGesture(friends[0], 99, now + 200)).toBeNull()
    friends.forEach((f, i) => endGesture(f, i, now + 200))
    friends.forEach(f => expect(f.stats.affection).toBe(21))
    expect(friends.every(f => f.interaction?.gesture === undefined)).toBe(true)
  })
})
describe('safe positioning and reward persistence', () => {
  it('projects all offscreen/furniture drops onto valid floor and routes safely afterwards', () => {
    for (const p of [{ x: -100, y: -100 }, { x: 3000, y: 3000 }, { x: 700, y: 470 }, { x: 820, y: 240 }, { x: 80, y: 490 }, { x: 200, y: 260 }]) {
      const f = press()
      moveGesture(f, 1, { x: 900, y: 900 }, { x: p.x - f.x, y: p.y - f.y }, now + 100)
      for (let i = 0; i < 30; i++) {
        advanceInteraction(f, now + 110 + i * 16, .016)
        expect(walkable(f)).toBe(true)
      }
      endGesture(f, 1, now + 700)
      expect(walkable(f)).toBe(true)
      const path = findRoute(f, { x: 570, y: 350 })
      let previous = { x: f.x, y: f.y }
      for (const point of path) { expect(segmentWalkable(previous, point)).toBe(true); previous = point }
    }
    expect(walkable(validPosition({ x: 700, y: 440 }))).toBe(true)
  })
  it('cooldown is shared by normal/special/panel pets, independent per friend, and survives reload', () => {
    const f = setup(), peer = setup()
    normalPet(f, now)
    expect(grantPetReward(f, true, now + 2000)).toBe(false)
    normalPet(f, now + 3000)
    expect(f.interaction?.phase).toBe('delighted'); expect(f.stats.affection).toBe(21)
    expect(normalPet(peer, now + 3000)?.rewarded).toBe(true)
    const friends = createFriends(now); friends[0] = f
    const restored = parseSave(JSON.stringify({ version: 1, savedAt: now, friends, memories: [] }), now + 4000).friends[0]
    expect(restored.interaction).toBeUndefined()
    expect(normalPet(restored, now + 4000)?.rewarded).toBe(false)
    expect(grantPetReward(restored, true, now + balance.rewardCooldownMs)).toBe(true)
    expect(restored.stats.affection).toBe(24)
  })
  it('all stats remain 0–100 even after repeated interactions', () => {
    const f = setup()
    for (let i = 0; i < 200; i++) grantPetReward(f, i % 2 === 0, now + i * balance.rewardCooldownMs)
    expect(f.stats.affection).toBe(100); expect(f.stats.happiness).toBe(100)
    expect(Object.values(f.stats).every(n => n >= 0 && n <= 100)).toBe(true)
  })
})
describe('reaction context and priorities', () => {
  it('uses relative image regions including independently configurable photo regions', () => {
    const f = setup()
    expect(bodyZone(f, .4)).toBe('head'); expect(bodyZone(f, .9)).toBe('body')
    f.photo = 'data:image/webp;base64,AAAA'
    expect(bodyZone(f, .55)).toBe('body')
  })
  it('varies normal/special lines without consecutive duplicates and has affinity tiers and distinct voices', () => {
    for (const f of createFriends(now)) {
      for (const affection of [0, 30, 31, 70, 71, 100]) {
        f.stats.affection = affection
        expect(affinity(f)).toBe(affection <= 30 ? 'shy' : affection <= 70 ? 'friendly' : 'close')
        for (const special of [false, true]) {
          let last = ''
          for (let i = 0; i < 30; i++) { const line = reactionLine(f, special); expect(line).not.toBe(last); last = line }
        }
      }
    }
    expect(new Set(createFriends(now).map(f => reactionLine(f, true).split(' ')[0])).size).toBe(4)
  })
  it('player reactions suppress automatic, emergency and social interruption until finished', () => {
    const f = press()
    expect(speak(f, '자동 대사', now, 1)).toBe(false)
    expect(speak(f, '배고파', now, 3)).toBe(false)
    advanceInteraction(f, now + 2000, .1)
    const line = f.bubble
    expect(speak(f, '안녕', now + 2100, 2)).toBe(false)
    expect(f.bubble).toBe(line)
    endGesture(f, 1, now + 2300)
    advanceInteraction(f, now + 4000, .1)
    expect(speak(f, '배고파', now + 11000, 3)).toBe(true)
    expect(speak(f, '자동 대사', now + 11001, 1)).toBe(false)
    expect(speak(f, '안녕', now + 18000, 2)).toBe(true)
    expect(speak(f, '자동 대사', now + 18001, 1)).toBe(false)
    expect(speak(f, '플레이어', now + 18002, 4)).toBe(true)
  })
})
