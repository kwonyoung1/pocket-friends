import { defaultTaste, furnitureChance } from '../adventure/catalog.ts'
import { humanLine } from '../humans/config.ts'
import { rollTripExtras } from '../expansion/rolls.ts'
import { busyLife, expansion, life, lifeCommand } from '../expansion/model.ts'
import type { Expansion } from '../expansion/model.ts'
import { collectionItems, regionWeights, tripEvents } from '../expansion/config.ts'
import type { Friend, Save } from '../game.ts'
import { growthBalance as B, itemById, missions, regions, traitLabels, salePrice, items } from './config.ts'
import type { Rarity, Trait } from './config.ts'
export type Action = 'feed' | 'play' | 'pet' | 'special' | 'explore'
export type Growth = {
  level: number; xp: number; traits: Record<Trait, number>; rewardAfter: Partial<Record<Action, number>>; traitAfter: number
  actions: { day: string; feed: number; play: number; pet: number; explore: number }; explorations: number; rareFinds: number
  awayJobId?: string; events: string[]; levelUpUntil: number; specialAfter: number; specialUntil: number
}
export type Expedition = { id: string; friendId: string; regionId: string; startedAt: number; endsAt: number; energyCost: number; result: { coins: number; xp: number; items: string[]; cold?: boolean; hamster?: boolean; eventId?: string }; claimedAt?: number }
export type World = {
  adventureVersion?: 1; words?: import('../words/state.ts').WordProgress; careRulesVersion?: 1; specialFriendsVersion?: 1; expansion?: Expansion; starterGranted: boolean; coins: number; inventory: Record<string, number>; ledger: { id: string; delta: number; balance: number; reason: string; at: number }[]
  jobs: Expedition[]; book: Record<string, { firstAt: number; lastAt: number; count: number }>; legendaries: { id: string; itemId: string; friendId: string; at: number; first?: boolean }[]
  notices: { id: string; itemId: string; friendId: string; at: number; first?: boolean }[]; day: string; attendanceDays: string[]; claimedMissions: string[]; achievements: string[]
  buyAfter: number; useAfter: number; decorationSlots: Record<string, string>
}
export function dailyKey(now = Date.now()) { return new Date(now + (9 - B.dailyResetHourKst) * 3600000).toISOString().slice(0, 10) }
export function newGrowth(id: string, now: number): Growth {
  const traits: Record<Trait, number> = { active: 35, calm: 35, curious: 35, adventurous: 35, affectionate: 35 }
  traits[({ momo: 'curious', bibi: 'affectionate', coco: 'calm', dudu: 'active' } as Record<string, Trait>)[id] ?? 'adventurous'] = 45
  return { level: 1, xp: 0, traits, rewardAfter: {}, traitAfter: 0, actions: { day: dailyKey(now), feed: 0, play: 0, pet: 0, explore: 0 }, explorations: 0, rareFinds: 0, events: [], levelUpUntil: 0, specialAfter: now + 45000, specialUntil: 0 }
}
export function growth(f: Friend, now = Date.now()) { return f.growth ??= newGrowth(f.id, now) }
export function dominant(f: Friend): Trait { const traits = growth(f).traits; return (Object.keys(traits) as Trait[]).reduce((a, b) => traits[b] > traits[a] ? b : a) }
export function personality(f: Friend) { return traitLabels[dominant(f)] }
export function xpNeeded(level: number) { return B.xpBase + B.xpPerLevel * level }
export function announce(f: Friend, text: string) { const g = growth(f); g.events = [...g.events, text].slice(-3) }
export function addXp(f: Friend, amount: number, now = Date.now()) {
  const g = growth(f, now), before = g.level
  if (!Number.isFinite(amount) || amount <= 0 || g.level >= B.maxLevel) return false
  g.xp += Math.floor(amount)
  while (g.level < B.maxLevel && g.xp >= xpNeeded(g.level)) { g.xp -= xpNeeded(g.level); g.level++ }
  if (g.level === B.maxLevel) g.xp = 0
  if (g.level > before) { g.levelUpUntil = now + 5000; announce(f, `우와! 레벨 ${g.level}! 나 조금 더 성장한 것 같아!`) }
  return g.level > before
}
function actionDay(f: Friend, now: number) {
  const g = growth(f, now), day = dailyKey(now)
  if (g.actions.day !== day) g.actions = { day, feed: 0, play: 0, pet: 0, explore: 0 }
  return g
}
export function evolve(f: Friend, trait: Trait, now: number) {
  const g = growth(f, now)
  if (now < g.traitAfter) return
  g.traits[trait] = Math.min(100, g.traits[trait] + B.traitStep); g.traitAfter = now + B.traitCooldownMs
}
export function rewardAction(f: Friend, action: Exclude<Action, 'explore'>, now = Date.now()) {
  const g = actionDay(f, now)
  if (g.awayJobId || now < (g.rewardAfter[action] ?? 0)) return false
  const key = action === 'special' ? 'pet' : action
  if ((action === 'pet' || action === 'special') && now < Math.max(g.rewardAfter.pet ?? 0, g.rewardAfter.special ?? 0)) return false
  g.rewardAfter[action] = now + B.cooldown[action]
  addXp(f, B.xp[action], now); g.actions[key]++
  evolve(f, ({ feed: 'calm', play: 'active', pet: 'affectionate', special: 'affectionate' } as const)[action], now)
  return true
}
export function newWorld(now: number): World {
  return { starterGranted: true, coins: B.startCoins, inventory: {}, ledger: [{ id: 'starter', delta: B.startCoins, balance: B.startCoins, reason: '처음 만난 선물', at: now }], jobs: [], book: {}, legendaries: [], notices: [], day: dailyKey(now), attendanceDays: [], claimedMissions: [], achievements: [], buyAfter: 0, useAfter: 0, decorationSlots: {} }
}
export function world(save: Save, now = Date.now()): World { save.version = 2; save.friends.forEach(f => growth(f, now)); return save.world ??= newWorld(now) }
export function rollover(save: Save, now: number) { const w = world(save, now), day = dailyKey(now); if (w.day !== day) { w.day = day; w.claimedMissions = [] } return w }
const uid = () => crypto.randomUUID()
export function transact(w: World, delta: number, reason: string, now: number) {
  if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(w.coins + delta) || w.coins + delta < 0) return false
  w.coins += delta; w.ledger.unshift({ id: uid(), delta, balance: w.coins, reason, at: now }); w.ledger = w.ledger.slice(0, 100)
  return true
}
export function acquire(w: World, itemId: string, now: number, f?: Friend) {
  const item = itemById[itemId]
  if (!item) throw Error('알 수 없는 아이템')
  w.inventory[itemId] = (w.inventory[itemId] ?? 0) + 1
  const old = w.book[itemId]
  w.book[itemId] = { firstAt: old?.firstAt ?? now, lastAt: now, count: (old?.count ?? 0) + 1 }
  if (f && (item.rarity === 'rare' || item.rarity === 'legendary')) growth(f, now).rareFinds++
  if (item.rarity === 'legendary') {
    const found = { id: uid(), itemId, friendId: f?.id ?? '', at: now, first: !old }
    w.legendaries.unshift(found); w.notices.push(found)
    if (f) announce(f, `대박! 전설의 보물, ${item.name}이야! 꼭 간직할래!`)
  }
}
export function buy(save: Save, itemId: string, now = Date.now()): string {
  const w = world(save, now), item = itemById[itemId]
  if (!item || item.category === 'treasure' || collectionItems.some(i=>i.id===itemId)) return '판매하지 않는 아이템이에요.'
  if (now < w.buyAfter) return '구매를 처리하고 있어요. 잠깐 기다려 주세요.'
  if (Math.max(...save.friends.map(f => growth(f).level)) < item.minLevel) return `친구 레벨 ${item.minLevel}부터 살 수 있어요.`
  if (!transact(w, -item.price, `${item.name} 구매`, now)) return '코인이 부족해요.'
  w.buyAfter = now + B.purchaseCooldownMs; acquire(w, itemId, now)
  return `${item.name}을 인벤토리에 담았어요!`
}
export function available(f: Friend, now = Date.now()) { return !growth(f).awayJobId && !f.interaction?.gesture && !busyLife(f,now) }
export function useItem(save: Save, itemId: string, friendId: string, now = Date.now()): string {
  const w = world(save, now), item = itemById[itemId], f = save.friends.find(p => p.id === friendId)
  if (!item || !f || !(w.inventory[itemId] > 0)) return '보유한 아이템을 선택해 주세요.'
  if (!available(f,now)) return '탐험 중이거나 교감 중인 친구는 잠시 기다려 주세요.'
  if (item.category === 'medicine') return lifeCommand(save,{type:'medicine',friendId},now)
  if (item.category === 'decor') return '인벤토리에서 방에 배치하기를 눌러 위치를 골라 주세요.'
  if (item.category === 'treasure') return '사용하지 않는 수집용 보물이에요.'
  if (now < w.useAfter || now < (growth(f).rewardAfter[item.category === 'food' ? 'feed' : 'play'] ?? 0)) return '친구가 즐기는 중이에요. 잠깐 기다려 주세요.'
  if (item.consumable) w.inventory[itemId]--
  for (const [key, amount] of Object.entries(item.effects)) { const stat = key as keyof Friend['stats']; const taste=f.foodTaste??=defaultTaste(f.id); const factor=item.category==='food'&&itemId!=='snack'&&(stat==='hunger'||stat==='happiness')&&amount>0?(taste.like===itemId?1.5:taste.dislike===itemId?.8:1):1; f.stats[stat] = Math.max(0, Math.min(100, f.stats[stat] + Math.round(amount*factor))) }
  w.useAfter = now + B.itemUseCooldownMs
  rewardAction(f, item.category === 'food' ? 'feed' : 'play', now)
  const favorite=item.category==='food'&&itemId!=='snack'&&f.foodTaste?.like===itemId
  const disliked=item.category==='food'&&itemId!=='snack'&&f.foodTaste?.dislike===itemId
  f.foodReaction = item.category==='food'?{kind:favorite?'liked':disliked?'disliked':'normal',until:now+2500}:undefined
  announce(f, disliked?'음... 다음에는 다른 거 먹고 싶어~ 그래도 잘 먹을게!':favorite?'내가 제일 좋아하는 음식이야! 냠냠~ ♡':item.category === 'food' ? '잘 먹었어! 고마워~' : '같이 노니까 정말 신나! 한 번 더~!')
  if(item.category==='food')f.eatingUntil=now+2000
  f.furnitureUntil=now+2000;f.furnitureActivity=item.category==='food'?'냠냠 먹는 중':'신나는 놀이'
  return `${f.name}와 ${item.name}을 ${item.category === 'food' ? '먹었어요' : '가지고 놀았어요'}!`
}
export function sell(save: Save, itemId: string, now = Date.now()) {
  const w = world(save, now), item = itemById[itemId]
  if (!item?.sellable || !(w.inventory[itemId] > 0)) return '판매할 수 없는 아이템이에요.'
  if (now < w.buyAfter) return '거래 중이에요. 잠깐 기다려 주세요.'
  if (!transact(w, salePrice(item), `${item.name} 판매`, now)) return '거래할 수 없어요.'
  w.inventory[itemId]--; w.buyAfter = now + B.purchaseCooldownMs
  return `${item.name} 1개를 판매했어요.`
}
export function rollRarity(random = Math.random, regionId?: string): Rarity {
  const weights = Object.entries(regionId ? regionWeights[regionId] ?? B.rarityWeights : B.rarityWeights) as [Rarity, number][]
  const value = random() * weights.reduce((s, [, w]) => s + w, 0)
  let sum = 0
  for (const [rarity, weight] of weights) { sum += weight; if (value < sum) return rarity }
  return 'legendary'
}
export function rarityPercent(rarity: Rarity) { return B.rarityWeights[rarity] / Object.values(B.rarityWeights).reduce((sum, n) => sum + n, 0) * 100 }
export function chooseLoot(regionId: string, rarity: Rarity, random = Math.random) {
  const region = regions.find(r => r.id === regionId)
  if (!region) throw Error('알 수 없는 지역')
  const allowed = regionId==='cave'||regionId==='garden'
  const pool = items.filter(i=>i.category==='treasure'&&i.rarity===rarity&&(rarity!=='legendary'||allowed)).map(i=>i.id)
  if(!pool.length) throw Error('이 지역에 없는 보물 등급이에요.')
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
}
export function expeditionTerms(f: Friend, regionId: string) {
  const r = regions.find(r => r.id === regionId)!, trait = dominant(f)
  return { duration: Math.round(r.minutes * 60000 * (trait === 'active' ? 1 - B.bonuses.activeTime : 1)), energy: Math.ceil(r.energy * (trait === 'calm' ? 1 - B.bonuses.calmEnergy : 1)), xp: Math.floor(r.xp * (trait === 'adventurous' ? 1 + B.bonuses.adventurousXp : 1)) }
}
export function startExpedition(save: Save, friendId: string, regionId: string, now = Date.now(), random = Math.random) {
  const w = world(save, now), f = save.friends.find(p => p.id === friendId), r = regions.find(p => p.id === regionId)
  if (!f || !r) return '친구와 지역을 선택해 주세요.'
  const g = growth(f, now)
  if (!available(f,now)) return '이미 탐험 중이거나 교감 중이에요.'
  if (g.level < r.minLevel) return `레벨 ${r.minLevel}부터 탐험할 수 있어요.`
  if(life(f,now).coldAt)return '감기가 나은 뒤 탐험할 수 있어요. 생활 메뉴에서 약을 줄 수 있어요.'
  const terms = expeditionTerms(f, regionId)
  if (f.stats.energy < terms.energy) return `체력이 ${terms.energy} 이상 필요해요.`
  const resultItems = [chooseLoot(regionId, rollRarity(random,regionId), random)]
  if (dominant(f) === 'curious' && random() < B.bonuses.curiousExtra) resultItems.push(chooseLoot(regionId, rollRarity(random,regionId), random))
  if(random()<furnitureChance) { const rarity=rollRarity(random,regionId); const pool=collectionItems.filter(i=>i.rarity===rarity&&Number(i.id.split('-')[2])%4===regions.findIndex(r=>r.id===regionId)); resultItems.push(pool[Math.min(pool.length-1,Math.floor(random()*pool.length))].id) }
  const job: Expedition = { id: uid(), friendId, regionId, startedAt: now, endsAt: now + terms.duration, energyCost: terms.energy, result: { coins: r.coins, xp: terms.xp, items: resultItems } }
  // Independent rolls, once per trip. Stored before departure; reloading cannot reroll.
  const extras=rollTripExtras(random)
  Object.assign(job.result,{cold:extras.cold,hamster:extras.hamster,...(extras.eventId?{eventId:extras.eventId}:{})})
  job.result.coins+=extras.bonusCoins
  w.jobs = [...w.jobs.filter(j => j.claimedAt === undefined).concat(w.jobs.filter(j => j.claimedAt !== undefined).slice(-39)), job]
  g.awayJobId = job.id; f.stats.energy -= terms.energy; f.route = []; f.meeting = undefined; f.moving = false
  f.bubble = humanLine(f.kind,'explore',f.bubble)??'다녀올게~! 오늘은 어떤 보물을 찾을까?'; f.bubbleUntil = now + 1800; f.bubblePriority = 4
  evolve(f, 'adventurous', now)
  return `${f.name}, ${r.name} 탐험 출발! 다녀올게~!`
}
export function completeExpeditions(save: Save, now = Date.now()): string[] {
  const w = rollover(save, now), results: string[] = []
  for (const job of w.jobs) {
    if (job.claimedAt !== undefined || now < job.endsAt) continue
    const f = save.friends.find(p => p.id === job.friendId)
    if (!f) continue
    job.claimedAt = now; const g = actionDay(f, now); delete g.awayJobId
    transact(w, job.result.coins, `${f.name} 탐험 귀환`, now); addXp(f, job.result.xp, now)
    g.explorations++; g.actions.explore++; evolve(f, 'curious', now)
    announce(f, humanLine(f.kind,'return',f.bubble)??'나 돌아왔어! 재미있는 걸 발견했어!')
    job.result.items.forEach(id => acquire(w, id, now, f))
    if(job.result.cold){life(f,now).coldAt=now;announce(f,'에취! 감기에 걸린 것 같아… 약이 필요해.')}
    if(job.result.hamster){expansion(save).hamsters.push({id:crypto.randomUUID(),foundAt:job.endsAt,regionId:job.regionId,deployed:false,x:530,y:390});announce(f,'작은 햄스터를 만났어! 인벤토리를 봐 줘!')}
    if(job.result.eventId){expansion(save).events.push({id:job.id,eventId:job.result.eventId,friendId:f.id,at:job.endsAt});announce(f,tripEvents.find(e=>e.id===job.result.eventId)!.name+'! 특별한 추억이 생겼어~')}
    f.restingUntil = now + 1500
    results.push(`${f.name} 귀환! ${job.result.coins}코인 · 경험치 ${job.result.xp} · ${job.result.items.map(id => itemById[id].name).join(', ')}`)
  }
  return results
}
export function attendance(save: Save, now = Date.now()) {
  const w = rollover(save, now)
  if (w.attendanceDays.includes(w.day)) return '오늘 출석 선물은 이미 받았어요.'
  w.attendanceDays.push(w.day); transact(w, B.attendanceCoins, '오늘의 출석 선물', now)
  return `${B.attendanceCoins}코인! 오늘도 만나서 반가워요 ♡`
}
export function missionProgress(save: Save, id: string, now = Date.now()) { const day = dailyKey(now); return save.friends.reduce((s, f) => { const a = growth(f, now).actions; return s + (a.day === day ? a[id as keyof Omit<typeof a, 'day'>] ?? 0 : 0) }, 0) }
export function claimMission(save: Save, id: string, friendId: string, now = Date.now()) {
  const w = rollover(save, now), mission = missions.find(m => m.id === id), f = save.friends.find(p => p.id === friendId)
  if (!mission || !f || w.claimedMissions.includes(id)) return '이미 받았거나 없는 미션이에요.'
  if (missionProgress(save, id, now) < mission.target) return '미션을 조금 더 진행해 주세요.'
  if (!available(f,now)) return '집에 있는 친구를 선택해 주세요.'
  w.claimedMissions.push(id); transact(w, mission.coins, `${mission.name} 미션`, now); addXp(f, mission.xp, now)
  return `${mission.name} 완료! ${mission.coins}코인 · ${f.name} 경험치 ${mission.xp}`
}
export const achievements = [
  { id: 'first-trip', name: '첫 모험의 발자국', coins: 50, done: (s: Save) => s.friends.some(f => growth(f).explorations > 0) },
  { id: 'level-five', name: '한 뼘 더 자랐어요', coins: 100, done: (s: Save) => s.friends.some(f => growth(f).level >= 5) },
  { id: 'collector', name: '세 가지 작은 보물', coins: 50, done: (s: Save) => Object.keys(world(s).book).length >= 3 },
]
export function claimAchievement(save: Save, id: string, now = Date.now()) {
  const w = world(save, now), a = achievements.find(a => a.id === id)
  if (!a || w.achievements.includes(id) || !a.done(save)) return '아직 받을 수 없는 업적이에요.'
  w.achievements.push(id); transact(w, a.coins, `${a.name} 업적`, now)
  return `${a.name}! ${a.coins}코인을 받았어요.`
}
