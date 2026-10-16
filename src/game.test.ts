import {roomScale,scaledPoint} from './room/config'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cells } from './navigation'
import { care, createFriends, decay, findRoute, parseSave, tick, walkable } from './game'
const start = 1760000000000
function seeded() {
  let seed = 42
  vi.spyOn(Math, 'random').mockImplementation(() => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 })
}
afterEach(() => vi.restoreAllMocks())
describe('room navigation and autonomous behaviour', () => {
  it('routes around the table and sofa using only walkable points', () => {
    const route = findRoute(scaledPoint({ x: 610, y: 470 }), scaledPoint({ x: 850, y: 470 }))
    expect(route.length).toBeGreaterThan(6)
    expect(route.every(p=>walkable(p))).toBe(true)
    expect(route.some(p => p.y < 420*roomScale || p.y > 515*roomScale)).toBe(true)
    for (const p of route) expect(walkable(p)).toBe(true)
  })
  it('all four friends independently move, pause and meet over five simulated minutes', () => {
    seeded()
    const friends = createFriends(start)
    const origins = friends.map(f => ({ x: f.x, y: f.y }))
    const distances = friends.map(() => 0), moving = new Set<string>(), resting = new Set<string>()
    const meetings: string[] = []
    for (let i = 1; i <= 3000; i++) {
      const previous = friends.map(f => ({ x: f.x, y: f.y }))
      tick(friends, start + i * 100, .1, text => meetings.push(text))
      friends.forEach((f, j) => {
        distances[j] += Math.hypot(f.x - previous[j].x, f.y - previous[j].y)
        if (f.moving) moving.add(f.id)
        if (start + i * 100 < f.restingUntil) resting.add(f.id)
        expect(walkable(f)).toBe(true)
        expect(Math.hypot(f.x - previous[j].x, f.y - previous[j].y)).toBeLessThanOrEqual(4.21)
      })
    }
    expect(moving.size).toBe(4); expect(resting.size).toBe(4)
    distances.forEach(d => expect(d).toBeGreaterThan(1000))
    friends.forEach((f, i) => expect(Math.hypot(f.x - origins[i].x, f.y - origins[i].y)).toBeGreaterThan(10))
    expect(meetings.length).toBeGreaterThan(0)
    expect(friends.some(f => f.stats.affection > 20)).toBe(true)
  })
  it('may rest at its randomly chosen current tile, then resumes walking to a new destination', () => {
    const f = createFriends(start)[0]
    Object.assign(f,cells.find(p=>Math.hypot(p.x-f.x,p.y-f.y)<30)!)
    const origin={x:f.x,y:f.y}
    f.restingUntil = start
    const currentIndex = cells.findIndex(p => p.x === f.x && p.y === f.y)
    expect(currentIndex).toBeGreaterThanOrEqual(0)
    // Peer choice, random-floor choice, current tile, six-second rest.
    const choices = [0, .99, (currentIndex + .5) / cells.length, .99]
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => choices[call++ % choices.length])
    for (let i = 1; i <= 100; i++) tick([f], start + i * 100, .1, () => {})
    expect([f.x, f.y]).toEqual([origin.x, origin.y])
    vi.mocked(Math.random).mockReturnValue(.99)
    for (let i = 101; i <= 160; i++) tick([f], start + i * 100, .1, () => {})
    expect(Math.hypot(f.x - origin.x, f.y - origin.y)).toBeGreaterThan(10)
  })
  it('keeps ordinary friends silent while scheduling their autonomous movement', () => {
    seeded()
    const friends = createFriends(start)
    friends.forEach(f => expect(f.nextSpeech - start).toBeGreaterThanOrEqual(20000))
    const now = start + 50000
    tick(friends, now, .1, () => {})
    friends.forEach(f => {
      expect(f.bubble).toBe('')
      expect(f.bubbleUntil).toBe(0)
      expect(f.nextSpeech - now).toBeGreaterThanOrEqual(20000)
      expect(f.nextSpeech - now).toBeLessThanOrEqual(50000)
    })
  })
})
describe('care and persistence', () => {
  it('care cannot create free food or instant baths; pet/rest still clamp at 100', () => {
    const f = createFriends(start)[0]
    f.stats.hunger = 40
    expect(care(f, 'feed', start)).toContain('인벤토리')
    expect(f.stats.hunger).toBe(40)
    expect(care(f, 'feed', start + 100)).toContain('인벤토리')
    expect(f.stats.hunger).toBe(40)
    care(f, 'pet', start + 2000)
    expect(f.stats.affection).toBe(21)
    expect(f.stats.happiness).toBe(87)
    care(f, 'wash', start + 4000)
    expect(f.stats.hygiene).toBe(82)
    care(f, 'rest', start + 6000)
    expect(f.stats.energy).toBe(100)
    expect(f.restingUntil).toBe(start + 18000)
  })
  it('restores care, photos and memories with bounded offline decay', () => {
    const friends = createFriends(start)
    friends[0].photo = 'data:image/webp;base64,AAAA'; friends[0].stats.affection = 77
    const saved = { version: 1, savedAt: start, friends, memories: [{ id: '1', at: start, text: '함께한 추억' }] }
    const restored = parseSave(JSON.stringify(saved), start + 600000)
    expect(restored.friends[0].photo).toBe(friends[0].photo)
    expect(restored.friends[0].stats.affection).toBe(77)
    expect(restored.friends[0].stats.hunger).toBeCloseTo(73.5)
    expect(restored.memories[0].text).toBe('함께한 추억')
    expect(restored.friends.every(f => !f.moving && f.route.length === 0)).toBe(true)
    expect(decay(friends[0].stats, 999999999)).toEqual(decay(friends[0].stats, 8 * 3600000))
  })
  it('rejects invalid saves and ignores foreign photo protocols', () => {
    expect(() => parseSave('{')).toThrow()
    expect(() => parseSave('{"version":2}')).toThrow()
    const friends = createFriends(start)
    friends[0].stats.hunger = NaN
    expect(() => parseSave(JSON.stringify({ version: 1, savedAt: start, friends }))).toThrow()
    friends[0].stats.hunger = 50; friends[0].photo = 'https://example.com/image.jpg'
    const restored = parseSave(JSON.stringify({ version: 1, savedAt: start, friends }))
    expect(restored.friends[0].photo).toBeUndefined()
  })
})
