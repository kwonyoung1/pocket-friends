import type { Save } from '../game'
import { growthBalance as B, itemById, regions } from './config'
import type { Trait } from './config'
import { newGrowth, newWorld, dailyKey, xpNeeded } from './model'
import type { Growth, World, Action, Expedition } from './model'
const record = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('저장 데이터 형식이 올바르지 않아요.'); return v as Record<string, unknown> }
const number = (v: unknown, min = 0, max = 8e15, integer = true) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isSafeInteger(v))) throw Error('저장 데이터 수치가 올바르지 않아요.'); return v }
const text = (v: unknown, max = 200) => { if (typeof v !== 'string' || v.length > max) throw Error('저장 데이터 문장이 올바르지 않아요.'); return v }
const list = (v: unknown, max = 10000): unknown[] => { if (!Array.isArray(v) || v.length > max) throw Error('저장 데이터 목록이 올바르지 않아요.'); return v }
function stringList(v: unknown, max = 10000) { return list(v, max).map(x => text(x)) }
export function migrateGrowth(raw: unknown, id: string, now: number): Growth {
  const g = newGrowth(id, now)
  if (raw === undefined) return g
  const r = record(raw)
  g.level = number(r.level, 1, B.maxLevel); g.xp = number(r.xp, 0, 100000)
  if (g.level === B.maxLevel) g.xp = 0
  else if (g.xp >= xpNeeded(g.level)) throw Error('레벨과 경험치가 일치하지 않아요.')
  if (r.traits !== undefined) for (const key of Object.keys(g.traits) as Trait[]) g.traits[key] = number(record(r.traits)[key], 0, 100, false)
  if (r.rewardAfter) for (const [key, value] of Object.entries(record(r.rewardAfter))) if (['feed', 'play', 'pet', 'special'].includes(key)) g.rewardAfter[key as Action] = number(value)
  g.traitAfter = r.traitAfter === undefined ? 0 : number(r.traitAfter)
  if (r.actions) { const a = record(r.actions); g.actions = { day: text(a.day, 10), feed: number(a.feed), pet: number(a.pet), play: number(a.play), explore: number(a.explore) } }
  g.explorations = r.explorations === undefined ? 0 : number(r.explorations)
  g.rareFinds = r.rareFinds === undefined ? 0 : number(r.rareFinds)
  g.events = r.events === undefined ? [] : stringList(r.events, 3)
  return g
}
export function migrateWorld(raw: unknown, now: number): World {
  if (raw === undefined) return newWorld(now)
  const r = record(raw), w = newWorld(now)
  // The presence of a valid economy means the initial grant has already been accounted for.
  w.coins = number(r.coins, 0, 1e12); w.starterGranted = true
  w.inventory = {}; for (const [id, value] of Object.entries(record(r.inventory ?? {}))) { if (!Object.hasOwn(itemById, id)) throw Error('알 수 없는 아이템이 있어요.'); w.inventory[id] = number(value, 0, 1e7) }
  w.book = {}; for (const [id, value] of Object.entries(record(r.book ?? {}))) { if (!Object.hasOwn(itemById, id)) throw Error('알 수 없는 도감 항목이에요.'); const b = record(value); w.book[id] = { firstAt: number(b.firstAt), lastAt: number(b.lastAt), count: number(b.count, 1) } }
  w.ledger = list(r.ledger ?? [], 100).map(value => { const e = record(value); return { id: text(e.id), delta: number(e.delta, -1e12, 1e12), balance: number(e.balance, 0, 1e12), reason: text(e.reason), at: number(e.at) } })
  w.jobs = list(r.jobs ?? [], 100).map(value => {
    const j = record(value), result = record(j.result)
    const regionId = text(j.regionId), friendId = text(j.friendId)
    if (!regions.some(r => r.id === regionId) || !['momo', 'bibi', 'coco', 'dudu'].includes(friendId)) throw Error('탐험 기록이 올바르지 않아요.')
    const itemIds = stringList(result.items, 2)
    if (!itemIds.length || itemIds.some(id => !Object.hasOwn(itemById, id))) throw Error('탐험 보상 기록이 올바르지 않아요.')
    const job: Expedition = { id: text(j.id), friendId, regionId, startedAt: number(j.startedAt), endsAt: number(j.endsAt), energyCost: number(j.energyCost, 0, 100), result: { coins: number(result.coins, 0, 1e6), xp: number(result.xp, 0, 1000), items: itemIds } }
    if (job.endsAt < job.startedAt) throw Error('탐험 시간이 올바르지 않아요.')
    if (j.claimedAt !== undefined) job.claimedAt = number(j.claimedAt)
    return job
  })
  if (new Set(w.jobs.map(j => j.id)).size !== w.jobs.length) throw Error('탐험 기록이 중복돼요.')
  const found = (value: unknown) => { const e = record(value); const itemId = text(e.itemId); if (itemById[itemId]?.rarity !== 'legendary') throw Error('전설 기록이 올바르지 않아요.'); return { id: text(e.id), itemId, friendId: text(e.friendId), at: number(e.at) } }
  w.legendaries = list(r.legendaries ?? []).map(found); w.notices = list(r.notices ?? [], 1000).map(found)
  w.day = text(r.day ?? dailyKey(now), 10); w.attendanceDays = stringList(r.attendanceDays ?? []); w.claimedMissions = stringList(r.claimedMissions ?? [], 4); w.achievements = stringList(r.achievements ?? [], 10)
  w.buyAfter = r.buyAfter === undefined ? 0 : number(r.buyAfter); w.useAfter = r.useAfter === undefined ? 0 : number(r.useAfter)
  w.decorationSlots = {}; if (r.decorationSlots) for (const [slot, value] of Object.entries(record(r.decorationSlots))) w.decorationSlots[slot] = text(value)
  if (w.day !== dailyKey(now)) { w.day = dailyKey(now); w.claimedMissions = [] }
  return w
}
export function migrateProgress(save: Save, rawFriends: unknown[], rawWorld: unknown, now: number): Save {
  save.version = 2; save.world = migrateWorld(rawWorld, now)
  for (const f of save.friends) {
    const old = rawFriends.find(v => v && typeof v === 'object' && 'id' in v && v.id === f.id)
    f.growth = migrateGrowth(old && typeof old === 'object' && 'growth' in old ? old.growth : undefined, f.id, now)
    const active = save.world.jobs.filter(j => j.friendId === f.id && j.claimedAt === undefined)
    if (active.length > 1) throw Error('같은 친구의 탐험이 중복돼요.')
    if (active[0]) f.growth.awayJobId = active[0].id
  }
  return save
}
