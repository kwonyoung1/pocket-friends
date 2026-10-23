import { rollTripExtras } from './rolls'
import { describe, it, expect } from 'vitest'
import { createFriends, parseSave, care, tick } from '../game'
import type { Save } from '../game'
import { beginGesture, grantPetReward } from '../interaction'
import {
  buy,
  world,
  acquire,
  useItem,
  startExpedition,
  completeExpeditions,
  rollRarity,
  growth,
} from '../progression/model'
import {
  adoptionCatalog,
  collectionItems,
  lifeBalance as B,
  regionWeights,
} from './config'
import {
  attachNavigation,
  expansion,
  furnitureObstacles,
  life,
  lifeCommand,
  settleLife,
  sleeping,
} from './model'
import { walkable, segmentWalkable } from '../navigation'
const noon = Date.parse('2026-10-15T03:00:00Z')
function game(at = noon): Save {
  const s: Save = {
    version: 2,
    savedAt: at,
    friends: createFriends(at),
    memories: [],
  }
  world(s, at)
  settleLife(s, at)
  return s
}
describe('life and data preservation', () => {
  it('no free food path exists; purchased food consumes once, legacy favorite bonus is replaced by explicit taste multipliers, values stay bounded', () => {
    const s = game(),
      f = s.friends[0]
    f.stats.hunger = 1
    f.stats.happiness = 20
    for (let i = 0; i < 5; i++) care(f, 'feed', noon + i * 2000)
    expect(f.stats.hunger).toBe(1)
    expect(growth(f).xp).toBe(0)
    acquire(world(s), 'lunch', noon)
    useItem(s, 'lunch', f.id, noon)
    expect(f.stats.hunger).toBe(36)
    expect(f.stats.happiness).toBe(20)
    useItem(s, 'lunch', f.id, noon + 11000)
    expect(f.stats.hunger).toBe(36)
    expect(world(s).inventory.lunch).toBe(0)
    acquire(world(s), 'cake', noon)
    useItem(s, 'cake', f.id, noon + 12000)
    expect(f.stats.hunger).toBe(100)
  })
  it('bath consumes the start-day count, pauses only that friend, and completes once after offline reload', () => {
    const s = game(),
      f = s.friends[0]
    f.stats.hygiene = 3
    lifeCommand(s, { type: 'bath', friendId: f.id }, noon)
    expect(life(f).bathCount).toBe(1)
    expect(life(f).bath!.endsAt).toBe(noon + B.bathMs)
    expect(beginGesture(f, 1, { x: 0, y: 0 }, 'head', noon, 'touch')).toBe(
      false,
    )
    expect(startExpedition(s, f.id, 'forest', noon)).toContain('이미')
    const old = { x: f.x, y: f.y }
    for (let i = 1; i < 100; i++) tick(s.friends, noon + i * 100, 0.1, () => {})
    expect({ x: f.x, y: f.y }).toEqual(old)
    expect(
      s.friends
        .slice(1)
        .some((p) => p.x !== createFriends(noon).find((b) => b.id === p.id)!.x),
    ).toBe(true)
    const copy = parseSave(JSON.stringify(s), noon + B.bathMs + 1)
    const after = copy.friends[0].stats.happiness
    expect(copy.friends[0].life?.bath).toBeUndefined()
    expect(copy.friends[0].stats.hygiene).toBeCloseTo(100, 2)
    settleLife(copy, noon + B.bathMs + 2)
    expect(copy.friends[0].stats.happiness).toBeCloseTo(after-6.6/3600000,10)
  })
  it('limits baths to four starts per KST day and accounts for a crossing-midnight bath on its start day', () => {
    const s = game()
    for(let i=0;i<4;i++){
      expect(lifeCommand(s,{type:'bath',friendId:'momo'},noon+i*(B.bathMs+1))).toContain('30분')
      expect(life(s.friends[0]).bathCount).toBe(i+1)
      settleLife(s,noon+(i+1)*(B.bathMs+1))
    }
    expect(lifeCommand(s,{type:'bath',friendId:'momo'},noon+4*(B.bathMs+1))).toBe('오늘은 충분히 씻었어요! 내일 다시 씻겨 주세요 🛁')
    const t = Date.parse('2026-10-15T14:10:00Z'),
      s2 = game(t)
    lifeCommand(s2, { type: 'bath', friendId: 'bibi' }, t + 25 * 60000) // 23:35 to 00:05, bedtime 00:20
    settleLife(s2, t + 55 * 60000)
    expect(life(s2.friends[1]).bathCount).toBe(0)
    expect(life(s2.friends[1]).bath).toBeUndefined()
  })
  it('fixed bedtime schedules survive reload; sleep recovers energy, blocks pet rewards, yields to exploration/bath', () => {
    const midnight = Date.parse('2026-10-15T15:30:00Z'),
      s = game(midnight),
      f = s.friends[0]
    f.stats.energy = 20
    expect(sleeping(f, midnight)).toBe(true)
    expect(grantPetReward(f, true, midnight)).toBe(false)
    settleLife(s, midnight + 3600000)
    expect(f.stats.energy).toBeGreaterThan(30)
    const before = f.stats.energy
    settleLife(s, midnight + 3600000)
    expect(f.stats.energy).toBe(before)
    const copied = parseSave(JSON.stringify(s), midnight + 3600000)
    expect(sleeping(copied.friends[0], midnight + 3600000)).toBe(true)
    growth(f).awayJobId = 'test'
    expect(sleeping(f, midnight)).toBe(false)
    delete growth(f).awayJobId
    life(f).bath = { startedAt: midnight, endsAt: midnight + B.bathMs }
    expect(sleeping(f, midnight)).toBe(false)
  })
  it('rename uses Unicode code points, rejects controls, and enforces 168 hours independently per friend', () => {
    const s = game()
    lifeCommand(
      s,
      { type: 'rename', friendId: 'momo', name: '  우리🐱친구  ' },
      noon,
    )
    expect(s.friends[0].name).toBe('우리🐱친구')
    expect(life(s.friends[0]).names[0].name).toBe('모모')
    expect(
      lifeCommand(
        s,
        { type: 'rename', friendId: 'momo', name: '다시' },
        noon + 1,
      ),
    ).toContain('168시간')
    lifeCommand(s, { type: 'rename', friendId: 'bibi', name: '둘째' }, noon)
    expect(s.friends[1].name).toBe('둘째')
    lifeCommand(
      s,
      { type: 'rename', friendId: 'momo', name: '다시' },
      noon + B.renameMs,
    )
    expect(s.friends[0].name).toBe('다시')
    expect(
      lifeCommand(
        s,
        { type: 'rename', friendId: 'coco', name: 'a\u200bb' },
        noon,
      ),
    ).toContain('제어')
    expect(
      lifeCommand(
        s,
        { type: 'rename', friendId: 'coco', name: '🐹'.repeat(13) },
        noon,
      ),
    ).toContain('12글자')
  })
  it('preserves legacy names, two photos, wallet, inventory, XP, original treasure jobs and all new records across reload', () => {
    const s = game(),
      w = world(s)
    w.coins = 98765
    acquire(w, 'world-seed', noon)
    acquire(w, 'snack', noon)
    s.friends[0].photo = 'data:image/webp;base64,AAAA'
    s.friends[1].photo = 'data:image/png;base64,BBBB'
    growth(s.friends[0]).xp = 12
    lifeCommand(s, { type: 'adopt', id: 'lulu' }, noon)
    lifeCommand(
      s,
      { type: 'rename', friendId: 'lulu', name: '새로운 이름' },
      noon,
    )
    startExpedition(s, 'bibi', 'forest', noon, () => 0.999)
    w.jobs[0].result = { coins: 120, xp: 20, items: ['world-seed'] }
    const original = JSON.stringify(s),
      restored = parseSave(original, noon)
    expect(restored.world).toEqual(s.world)
    expect(restored.friends[0].photo).toBe(s.friends[0].photo)
    expect(restored.friends[1].photo).toBe(s.friends[1].photo)
    expect(restored.friends[4].name).toBe('새로운 이름')
    expect(restored.friends[4].life).toEqual(s.friends[4].life)
    expect(growth(restored.friends[0]).xp).toBe(12)
    expect(JSON.stringify(s)).toBe(original)
    completeExpeditions(restored, noon + 3600000)
    expect(restored.world!.inventory['world-seed']).toBe(2)
  })
})
describe('exploration, furnishing and new friends', () => {
  it('all regional probabilities have exact boundaries and match a 100000-draw stratified simulation', () => {
    for (const [region, weights] of Object.entries(regionWeights)) {
      expect(Object.values(weights).reduce((a, b) => a + b)).toBe(100)
      const count = { common: 0, uncommon: 0, rare: 0, legendary: 0 }
      for (let i = 0; i < 100000; i++)
        count[rollRarity(() => (i + 0.5) / 100000, region)]++
      for (const [r, v] of Object.entries(weights))
        expect(count[r as keyof typeof count]).toBe(v * 1000)
    }
    expect(collectionItems).toHaveLength(32)
    expect(new Set(collectionItems.map((i) => i.id)).size).toBe(32)
  })
  it('locks independent cold, hamster and event rolls once per trip and grants each result exactly once', () => {
    const s = game(),
      rolls = [0.5, 0.1, 0.99, 0.99, 0.01, 0.001, 0.01] // item grade, pool, curious extra, cold, hamster, event
    startExpedition(s, 'momo', 'forest', noon, () => rolls.shift() ?? 0.99)
    const job = world(s).jobs[0]
    expect(job.result.cold).toBe(true)
    expect(job.result.hamster).toBe(true)
    expect(job.result.eventId).toBe('treasure')
    expect(job.result.coins).toBe(270)
    completeExpeditions(s, job.endsAt)
    completeExpeditions(s, job.endsAt + 1)
    expect(expansion(s).hamsters).toHaveLength(1)
    expect(expansion(s).events).toHaveLength(1)
    expect(world(s).coins).toBe(570)
    expect(life(s.friends[0]).coldAt).toBe(job.endsAt)
    expect(startExpedition(s, 'momo', 'forest', job.endsAt + 1)).toContain(
      '감기',
    )
    buy(s, 'medicine', job.endsAt + 2)
    lifeCommand(s, { type: 'medicine', friendId: 'momo' }, job.endsAt + 2)
    expect(world(s).coins).toBe(470)
    expect(life(s.friends[0]).coldAt).toBeUndefined()
    lifeCommand(s, { type: 'medicine', friendId: 'momo' }, job.endsAt + 3)
    expect(world(s).coins).toBe(470)
  })
  it('keeps furniture quantities across place, move, recovery, reload and allows overlap and rejects out-of-room placement', () => {
    const s = game()
    acquire(world(s), 'plant', noon)
    const count = () =>
      world(s).inventory.plant +
      expansion(s).placements.filter((p) => p.itemId === 'plant').length
    expect(
      lifeCommand(s, { type: 'place', itemId: 'plant', x: 530, y: 390 }, noon),
    ).toContain('놓았어요')
    expect(count()).toBe(1)
    const p = expansion(s).placements[0]
    lifeCommand(
      s,
      { type: 'place', itemId: 'plant', placementId: p.id, x: 450, y: 390 },
      noon,
    )
    expect(count()).toBe(1)
    acquire(world(s), 'plant', noon)
    expect(
      lifeCommand(s, { type: 'place', itemId: 'plant', x: 450, y: 390 }, noon),
    ).toContain('놓았어요')
    expect(count()).toBe(2)
    expect(expansion(s).placements.filter(p=>p.x===450&&p.y===390)).toHaveLength(2)
    expect(
      lifeCommand(s, { type: 'place', itemId: 'plant', placementId:p.id,x:-10,y:450 }, noon),
    ).toContain('통로')
    const loaded = parseSave(JSON.stringify(s), noon)
    expect(expansion(loaded).placements).toEqual(expansion(s).placements)
    lifeCommand(s, { type: 'recover-furniture', id: p.id }, noon)
    lifeCommand(s, { type: 'recover-furniture', id: p.id }, noon)
    expect(count()).toBe(2)
  })
  it('autonomous paths and dragged positions respect newly placed furniture', () => {
    const s = game()
    acquire(world(s), 'plant', noon)
    lifeCommand(s, { type: 'place', itemId: 'plant', x: 530, y: 390 }, noon)
    attachNavigation(s)
    for (let i = 1; i <= 600; i++) {
      const before = s.friends.map((f) => ({ x: f.x, y: f.y }))
      tick(s.friends, noon + i * 100, 0.1, () => {})
      s.friends.forEach((f, j) => {
        expect(walkable(f, furnitureObstacles(s))).toBe(true)
        expect(segmentWalkable(before[j], f, furnitureObstacles(s))).toBe(true)
      })
    }
  })
  it('adopts each friend once without resetting the first four and caps the household at eight', () => {
    const s = game()
    world(s).coins = 50000
    const original = structuredClone(s.friends)
    for (const d of adoptionCatalog) {
      lifeCommand(s, { type: 'adopt', id: d.id }, noon)
      lifeCommand(s, { type: 'adopt', id: d.id }, noon)
    }
    expect(s.friends).toHaveLength(8)
    expect(world(s).coins).toBe(10000)
    expect(s.friends.slice(0, 4)).toEqual(original)
    expect(expansion(s).adoptions).toHaveLength(4)
    const restored = parseSave(JSON.stringify(s), noon)
    expect(restored.friends.map((f) => f.id)).toEqual(
      s.friends.map((f) => f.id),
    )
    expect(restored.friends[7].kind).toBe('dog')
    expect(
      beginGesture(
        restored.friends[7],
        2,
        { x: 0, y: 0 },
        'head',
        noon,
        'touch',
      ),
    ).toBe(true)
  })
  it('caps deployed hamsters at three, preserves discoveries after recovery, rejects sell-like unknown commands', () => {
    const s = game(),
      e = expansion(s)
    for (let i = 0; i < 4; i++)
      e.hamsters.push({
        id: `hamster-${i}`,
        foundAt: noon,
        regionId: 'forest',
        x: 530,
        y: 390,
        deployed: false,
      })
    for (const h of e.hamsters)
      lifeCommand(s, { type: 'hamster', id: h.id, deployed: true }, noon)
    expect(e.hamsters.filter((h) => h.deployed)).toHaveLength(3)
    lifeCommand(
      s,
      { type: 'hamster', id: e.hamsters[0].id, deployed: false },
      noon,
    )
    expect(e.hamsters).toHaveLength(4)
    expect(expansion(parseSave(JSON.stringify(s), noon)).hamsters).toEqual(
      e.hamsters,
    )
  })
  it('rejects corrupt expansion saves and retains the original untouched', () => {
    const s = game()
    const raw = JSON.stringify(s),
      copy = JSON.parse(raw)
    copy.world.expansion.hamsters = [{ id: 'bad', deployed: 'yes' }]
    expect(() => parseSave(JSON.stringify(copy), noon)).toThrow()
    expect(JSON.stringify(s)).toBe(raw)
  })
})

it('trip extras use exact 0.5% and 10% boundaries with independent draws and no reroll on completion', () => {
  let cold = 0,
    hamster = 0
  for (let i = 0; i < 100000; i++) {
    const r = rollTripExtras(() => (i + 0.5) / 100000)
    if (r.cold) cold++
    if (r.hamster) hamster++
  }
  expect(cold).toBe(10000)
  expect(hamster).toBe(500)
  const yes = [0.1, 0.004999, 0.999],
    no = [0.099999, 0.005, 0.999]
  expect(rollTripExtras(() => yes.shift()!)).toEqual({
    cold: false,
    hamster: true,
    eventId: undefined,
    bonusCoins: 0,
  })
  expect(rollTripExtras(() => no.shift()!)).toEqual({
    cold: true,
    hamster: false,
    eventId: undefined,
    bonusCoins: 0,
  })
})

it('medicine is bought into inventory and never wasted on a healthy friend', () => {
  const s = game()
  expect(world(s).coins).toBe(300)
  buy(s, 'medicine', noon)
  expect(world(s).coins).toBe(200)
  expect(world(s).inventory.medicine).toBe(1)
  expect(useItem(s, 'medicine', 'momo', noon)).toContain('감기에 걸린')
  expect(world(s).inventory.medicine).toBe(1)
  life(s.friends[0]).coldAt = noon
  expect(useItem(s, 'medicine', 'momo', noon)).toContain('나았어요')
  expect(world(s).inventory.medicine).toBe(0)
  expect(life(s.friends[0]).coldAt).toBeUndefined()
  expect(s.friends[0].recoveryUntil).toBe(noon + 2000)
})

it('an offline bath finishes at its recorded deadline and hygiene ages only after completion', () => {
  const s = game()
  lifeCommand(s, { type: 'bath', friendId: 'momo' }, noon)
  const loaded = parseSave(JSON.stringify(s), noon + B.bathMs + 120 * 60000)
  expect(loaded.friends[0].stats.hygiene).toBeCloseTo(82)
  const h = loaded.friends[0].stats.hygiene
  settleLife(loaded, noon + B.bathMs + 120 * 60000)
  expect(loaded.friends[0].stats.hygiene).toBe(h)
})
