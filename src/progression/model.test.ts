import { describe, expect, it, vi } from 'vitest'
import { care, createFriends, parseSave, tick } from '../game'
import type { Save } from '../game'
import { beginGesture, grantPetReward, normalPet } from '../interaction'
import { growthBalance as B, itemById, regions } from './config'
import { acquire, addXp, attendance, buy, chooseLoot, claimAchievement, claimMission, completeExpeditions, dailyKey, dominant, expeditionTerms, growth, missionProgress, rewardAction, rollRarity, sell, startExpedition, transact, useItem, world, xpNeeded } from './model'
const now = Date.parse('2026-10-15T03:00:00Z')
function game(): Save { const s: Save = { version: 2, savedAt: now, friends: createFriends(now), memories: [] }; world(s, now); return s }
describe('growth, personality and v1 migration', () => {
  it('migrates old photos, names, stats, positions and grants 300 coins once', () => {
    const friends = createFriends(now)
    friends[0].name = '내 친구'; friends[0].photo = 'data:image/webp;base64,AAAA'; friends[0].stats.affection = 77
    const old = { version: 1, savedAt: now, friends, memories: [{ id: 'a', at: now, text: '소중한 추억' }] }
    const migrated = parseSave(JSON.stringify(old), now)
    expect(migrated.version).toBe(2); expect(world(migrated).coins).toBe(300)
    expect(migrated.friends[0].photo).toBe(friends[0].photo); expect(migrated.friends[0].name).toBe('내 친구')
    expect(migrated.friends[0].stats).toEqual(friends[0].stats)
    expect(migrated.friends[0].x).toBe(friends[0].x)
    expect(migrated.memories).toEqual(old.memories)
    transact(world(migrated), -300, '모두 사용', now)
    const again = parseSave(JSON.stringify(migrated), now)
    expect(world(again).coins).toBe(0); expect(world(again).ledger.filter(e => e.id === 'starter')).toHaveLength(1)
  })
  it('supports exact thresholds, multiple level ups and a maximum level of 50', () => {
    const f = game().friends[0], before = { ...f.stats }
    expect(xpNeeded(1)).toBe(30)
    addXp(f, 29, now); expect(growth(f).level).toBe(1)
    addXp(f, 1, now); expect(growth(f).level).toBe(2); expect(growth(f).xp).toBe(0)
    addXp(f, 40 + 50 + 3, now); expect(growth(f).level).toBe(4); expect(growth(f).xp).toBe(3)
    expect(growth(f).events.some(e => e.includes('레벨'))).toBe(true)
    addXp(f, 99999999, now); expect(growth(f).level).toBe(50); expect(growth(f).xp).toBe(0)
    expect(addXp(f, 20, now)).toBe(false); expect(f.stats).toEqual(before)
  })
  it('care and direct pets award XP only through their cooldowns', () => {
    const s = game(), f = s.friends[0]
    acquire(world(s), 'snack', now);acquire(world(s), 'snack', now);useItem(s, 'snack', f.id, now);useItem(s, 'snack', f.id, now + 1600)
    expect(growth(f).xp).toBe(3); expect(missionProgress(s, 'feed', now)).toBe(1)
    normalPet(f, now + 3000); expect(growth(f).xp).toBe(4)
    normalPet(f, now + 5000); expect(growth(f).xp).toBe(4)
    grantPetReward(f, true, now + 3000 + 6 * 3600000); expect(growth(f).xp).toBe(7)
    expect(missionProgress(s, 'pet', now)).toBe(2)
    const restored = parseSave(JSON.stringify(s), now + 3001 + 6 * 3600000)
    expect(grantPetReward(restored.friends[0], true, now + 6 * 3600000 + 4000)).toBe(false)
  })
  it('traits grow slowly, stay bounded and give explicit personality bonuses', () => {
    const s = game(), f = s.friends[0], g = growth(f)
    for (let i = 0; i < 6; i++) rewardAction(f, 'play', now + i * 1000)
    expect(g.traits.active).toBe(35.25)
    rewardAction(f, 'play', now + 61000); expect(g.traits.active).toBe(35.5)
    g.traits.active = 100; g.traitAfter = 0; rewardAction(f, 'play', now + 121000)
    expect(g.traits.active).toBe(100); expect(dominant(f)).toBe('active')
    expect(expeditionTerms(f, 'forest').duration).toBe(30 * 60000 * .95)
    g.traits.active = 0; g.traits.calm = 100; expect(expeditionTerms(f, 'forest').energy).toBe(12)
    g.traits.calm = 0; g.traits.adventurous = 100; expect(expeditionTerms(f, 'forest').xp).toBe(22)
  })
})
describe('economy, shop and inventory', () => {
  it('checks balance, level locks and double clicks; keeps an auditable nonnegative ledger', () => {
    const s = game(), w = world(s)
    expect(buy(s, 'toy', now)).toContain('레벨')
    buy(s, 'snack', now); expect(w.coins).toBe(285); expect(w.inventory.snack).toBe(1)
    buy(s, 'snack', now + 1); expect(w.coins).toBe(285); expect(w.inventory.snack).toBe(1)
    buy(s, 'ball', now + 1000); expect(w.coins).toBe(205)
    buy(s, 'plant', now + 2000); buy(s, 'plant', now + 3000)
    expect(w.coins).toBe(5)
    expect(buy(s, 'snack', now + 4000)).toContain('부족')
    expect(w.coins).toBe(5); expect(transact(w, -6, '실패', now)).toBe(false)
    expect(w.ledger.at(-1)?.balance).toBe(300)
    expect(w.ledger.every(e => e.balance >= 0)).toBe(true)
  })
  it('consumes food once, reuses toys with cooldown, and keeps collectibles unusable', () => {
    const s = game(), w = world(s), f = s.friends[0]
    buy(s, 'snack', now); useItem(s, 'snack', f.id, now + 1000)
    expect(w.inventory.snack).toBe(0); expect(f.stats.hunger).toBe(88); expect(growth(f).xp).toBe(3)
    useItem(s, 'snack', f.id, now + 2000); expect(w.inventory.snack).toBe(0)
    buy(s, 'ball', now + 2000); useItem(s, 'ball', f.id, now + 3000)
    expect(w.inventory.ball).toBe(1); expect(growth(f).xp).toBe(8)
    useItem(s, 'ball', f.id, now + 5000); expect(growth(f).xp).toBe(8)
    useItem(s, 'ball', f.id, now + 34000); expect(growth(f).xp).toBe(13)
    acquire(w, 'plant', now); expect(useItem(s, 'plant', f.id, now + 36000)).toContain('방에 배치하기')
    acquire(w, 'leaf', now); expect(useItem(s, 'leaf', f.id, now + 38000)).toContain('수집용')
  })
  it('sales decrement stock without deleting collection records', () => {
    const s = game(), w = world(s)
    acquire(w, 'forest-gem', now)
    sell(s, 'forest-gem', now + 1000)
    expect(w.coins).toBe(350); expect(w.inventory['forest-gem']).toBe(0)
    expect(w.book['forest-gem'].firstAt).toBe(now)
    sell(s, 'forest-gem', now + 2000); expect(w.coins).toBe(350)
    acquire(w, 'world-seed', now, s.friends[0]); expect(sell(s, 'world-seed', now + 3000)).toContain('판매할 수 없는')
  })
})
describe('real-time expeditions and exact drop odds', () => {
  it('separates rarity drawing from regional item selection with exact 65/25/9/1 weights', () => {
    const counts = { common: 0, uncommon: 0, rare: 0, legendary: 0 }
    for (let i = 0; i < 10000; i++) counts[rollRarity(() => (i + .5) / 10000)]++
    expect(counts).toEqual({ common: 6500, uncommon: 2500, rare: 900, legendary: 100 })
    for (const r of regions) for (const rarity of Object.keys(counts) as (keyof typeof counts)[]) expect(itemById[chooseLoot(r.id, rarity, () => .5)].rarity).toBe(rarity)
  })
  it('locks a deterministic reward at start, prevents duplicate trips and blocks care/input', () => {
    const s = game(), f = s.friends[0], w = world(s)
    startExpedition(s, f.id, 'forest', now, () => .999)
    expect(w.jobs[0].result.items).toEqual(['decor-3-4'])
    const energy = f.stats.energy
    startExpedition(s, f.id, 'forest', now + 1)
    expect(w.jobs).toHaveLength(1); expect(f.stats.energy).toBe(energy)
    expect(care(f, 'feed', now + 10)).toBeNull()
    expect(beginGesture(f, 1, { x: 0, y: 0 }, 'head', now, 'mouse')).toBe(false)
    const position = { x: f.x, y: f.y }; tick(s.friends, now + 1000, .1, () => {})
    expect({ x: f.x, y: f.y }).toEqual(position)
    expect(startExpedition(s, s.friends[1].id, 'beach', now)).toContain('레벨 5')
  })
  it('returns once after offline reload and permanently records legendary finds and dates', () => {
    const s = game(), f = s.friends[0]
    startExpedition(s, f.id, 'forest', now, () => .999)
    const result = structuredClone(world(s).jobs[0].result), end = world(s).jobs[0].endsAt
    const loaded = parseSave(JSON.stringify(s), end + 1000)
    expect(world(loaded).jobs[0].result).toEqual(result)
    expect(completeExpeditions(loaded, end - 1)).toHaveLength(0)
    expect(completeExpeditions(loaded, end + 1000)).toHaveLength(1)
    const w = world(loaded)
    expect(w.coins).toBe(420); expect(growth(loaded.friends[0]).xp).toBe(20)
    expect(w.inventory['decor-3-4']).toBe(1); expect(w.book['decor-3-4'].firstAt).toBe(end + 1000)
    expect(w.legendaries).toHaveLength(1); expect(w.notices).toHaveLength(1)
    expect(growth(loaded.friends[0]).awayJobId).toBeUndefined()
    expect(growth(loaded.friends[0]).rareFinds).toBe(1)
    completeExpeditions(loaded, end + 2000)
    const again = parseSave(JSON.stringify(loaded), end + 3000)
    completeExpeditions(again, end + 3000)
    expect(world(again).coins).toBe(420); expect(world(again).inventory['decor-3-4']).toBe(1)
  })
  it('curiosity adds an independent roll without altering any rarity weight', () => {
    const s = game(), rolls = [.1, .2, .01, .999, .5]
    startExpedition(s, 'momo', 'forest', now, () => rolls.shift() ?? .5)
    expect(world(s).jobs[0].result.items).toEqual(['decor-0-0', 'decor-3-4'])
    expect(B.rarityWeights.legendary).toBe(1)
  })
})
describe('Korean daily reset, claims and backup validation', () => {
  it('grants attendance once per KST date with no backdated awards', () => {
    const before = Date.parse('2026-10-14T14:59:59Z'), after = before + 1000
    expect(dailyKey(before)).toBe('2026-10-14'); expect(dailyKey(after)).toBe('2026-10-15')
    const s = game(); attendance(s, before); attendance(s, before + 100)
    expect(world(s).coins).toBe(330)
    attendance(s, after); expect(world(s).coins).toBe(360)
    attendance(s, after + 10 * 86400000); expect(world(s).coins).toBe(390)
    expect(world(s).attendanceDays).toHaveLength(3)
  })
  it('mission and achievement rewards can only be claimed once and reset on the correct day', () => {
    const s = game(), f = s.friends[0]
    expect(claimMission(s, 'feed', f.id, now)).toContain('진행')
    for (let i = 0; i < 3; i++) rewardAction(f, 'feed', now + i * 10000)
    expect(missionProgress(s, 'feed', now)).toBe(3)
    claimMission(s, 'feed', f.id, now + 21000)
    expect(world(s).coins).toBe(340); expect(growth(f).xp).toBe(19)
    claimMission(s, 'feed', f.id, now + 22000); expect(world(s).coins).toBe(340)
    acquire(world(s), 'snack', now); acquire(world(s), 'ball', now); acquire(world(s), 'plant', now)
    claimAchievement(s, 'collector', now); claimAchievement(s, 'collector', now)
    expect(world(s).coins).toBe(390)
    expect(missionProgress(s, 'feed', now + 86400000)).toBe(0)
    expect(claimMission(s, 'feed', f.id, now + 86400000)).toContain('진행')
  })
  it('rejects invalid new formats and duplicate active jobs without mutating the original', () => {
    const s = game(); startExpedition(s, 'momo', 'forest', now, () => .5)
    const raw = JSON.stringify(s), copy = JSON.parse(raw)
    copy.world.coins = -1; expect(() => parseSave(JSON.stringify(copy), now)).toThrow()
    const duplicate = JSON.parse(raw); duplicate.world.jobs.push({ ...duplicate.world.jobs[0], id: 'duplicate' })
    expect(() => parseSave(JSON.stringify(duplicate), now)).toThrow()
    expect(JSON.stringify(s)).toBe(raw)
    const restored = parseSave(raw, now)
    expect(world(restored).jobs).toHaveLength(1)
    expect(restored.friends[0].interaction).toBeUndefined()
  })
})

it('personality changes approach probabilities, ambient dialogue and special-action frequency', () => {
  const random = vi.spyOn(Math, 'random').mockReturnValue(.45)
  try {
    const outgoing = game(), quiet = game()
    for (const s of [outgoing, quiet]) { const f = s.friends[0]; f.restingUntil = 0; f.socialAfter = 0 }
    growth(outgoing.friends[0]).traits.affectionate = 100
    growth(quiet.friends[0]).traits.affectionate = 0
    tick(outgoing.friends, now + 100, .1, () => {})
    tick(quiet.friends, now + 100, .1, () => {})
    expect(outgoing.friends[0].meeting).toBeTruthy(); expect(quiet.friends[0].meeting).toBeUndefined()
    const chat = game(); chat.friends[0].nextSpeech = now; random.mockReturnValue(.1)
    tick(chat.friends, now + 100, .1, () => {})
    expect(chat.friends[0].bubble).toBe('')
    const active = game(); growth(active.friends[0]).traits.active = 100
    growth(active.friends[0]).specialAfter = now
    tick(active.friends, now + 100, .1, () => {})
    expect(growth(active.friends[0]).specialUntil).toBeGreaterThan(now)
    expect(growth(active.friends[0]).specialAfter - now).toBeLessThan(30000)
  } finally { random.mockRestore() }
})
it('the live heartbeat rolls daily missions over at KST midnight without another attendance click', () => {
  const s = game(), w = world(s), nextDay = now + 12 * 3600000
  w.claimedMissions = ['feed']; growth(s.friends[0]).actions.feed = 3
  expect(missionProgress(s, 'feed', now)).toBe(3)
  completeExpeditions(s, nextDay)
  expect(w.day).toBe('2026-10-16'); expect(w.claimedMissions).toEqual([])
  expect(missionProgress(s, 'feed', nextDay)).toBe(0)
  const copy = JSON.parse(JSON.stringify(s))
  Object.defineProperty(copy.world.inventory, '__proto__', { value: 1, enumerable: true })
  expect(() => parseSave(JSON.stringify(copy), nextDay)).toThrow()
})
it('direct petting and dragging immediately cancel ambient personality animation', () => {
  const s = game(), f = s.friends[0], g = growth(f)
  g.specialUntil = now + 2000
  normalPet(f, now)
  expect(g.specialUntil).toBe(0)
  g.specialUntil = now + 2000
  beginGesture(f, 1, { x: 0, y: 0 }, 'head', now + 100, 'mouse')
  expect(g.specialUntil).toBe(0)
})
