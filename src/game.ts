import {roomScale} from './room/config.ts'
import {upgradeRoom} from './room/migrate.ts'
import { defaultTaste, restCooldownMs } from './adventure/catalog.ts'
import { careAlertMs, careNeeds, careSpeed, isSpecialCharacter, needLine, specialAmbient } from './careNeeds.ts'
import { specialIds, humanLine } from './humans/config.ts'
import { makeSpecialFriend } from './humans/model.ts'
import { busyLife, sleeping, settleLife, makeAdoptee } from './expansion/model.ts'
import type { Life } from './expansion/model.ts'
import type { Obstacle } from './navigation.ts'
import { adoptionCatalog } from './expansion/config.ts'
import { growth, dominant } from './progression/model.ts'
import type { Growth, World } from './progression/model.ts'
import { growthBalance } from './progression/config.ts'
import { migrateProgress } from './progression/migrate.ts'
import { cells, findRoute } from './navigation.ts'
import { advanceInteraction, controlled, normalPet, speak } from './interaction.ts'
import type { Interaction } from './interaction.ts'
import { interactionBalance } from './balance.ts'
export { obstacles, walkable, findRoute } from './navigation.ts'

export type Kind = 'cat' | 'bunny' | 'bear' | 'fox' | 'dog' | 'boy' | 'girl'
export type Stats = { hunger: number; happiness: number; energy: number; hygiene: number; affection: number }
export type Point = { x: number; y: number }
export type Friend = {
  foodTaste?: {like:string;dislike:string}; foodReaction?: {kind:'liked'|'disliked'|'normal';until:number}; lastRestRewardAt?: number;
  eatingUntil?: number; recoveryUntil?: number; life?: Life; navObstacles?: Obstacle[]; furnitureUntil?: number; furnitureActivity?: string; remoteAuthoritative?: boolean; remoteHoldId?: string;
  growth?: Growth; id: string; name: string; kind: Kind; color: string; description: string; photo?: string; stats: Stats
  x: number; y: number; facing: number; route: Point[]; restingUntil: number; nextSpeech: number
  careNotice?: {text: string; until: number; need?: import('./careNeeds.ts').Need}; lastPetRewardAt?: number; careAlertAfter?: Partial<Record<import('./careNeeds.ts').Need, number>>; lastCareLine?: string; socialUntil?: number; pendingGreeting?: { text: string; at: number };
  interaction?: Interaction; petRewardAfter?: number; lastPetLine?: string; bubblePriority?: number;
  bubble: string; bubbleUntil: number; meeting?: string; socialAfter: number; careAfter: number; moving: boolean
}
export type Care = 'feed' | 'pet' | 'wash' | 'rest'
export type Memory = { id: string; text: string; at: number }
export type Save = { version: 1 | 2; world?: World; savedAt: number; friends: Friend[]; memories: Memory[] }
export const STORAGE_KEY = 'pocket-friends-v1'
export const clamp = (n: number) => Math.max(0, Math.min(100, n))
export const between = (a: number, b: number) => a + Math.random() * (b - a)
export const phrases = ['좋은 하루 보내~~', '맛있는 걸 먹고 싶은 하루야~', '오늘 날씨 한번 확인해야겠다~', '여기 햇살이 참 따뜻해 ☀', '너랑 함께라서 행복해!', '오늘은 어떤 재미있는 일이 생길까?', '조금 쉬어 가도 괜찮아~', '우리 집이 제일 좋아 ♡']
const definitions: [string, string, Kind, string, string, number, number][] = [
  ['momo', '모모', 'cat', '#f4c19b', '호기심 많은 작은 탐험가', 330, 350],
  ['bibi', '비비', 'bunny', '#e8c0cb', '다정한 햇살 수집가', 570, 310],
  ['coco', '코코', 'bear', '#c8b49c', '느긋한 간식 애호가', 470, 490],
  ['dudu', '두두', 'fox', '#e4ab75', '장난기 가득한 분위기 메이커', 810, 350],
]
export function createFriends(now = Date.now()): Friend[] {
  return definitions.map(([id, name, kind, color, description, x, y]) => ({
    id, name, kind, color, description, x:x*roomScale, y:y*roomScale, stats: { hunger: 78, happiness: 85, energy: 90, hygiene: 82, affection: 20 },
    facing: 1, route: [], restingUntil: now + between(500, 2500), nextSpeech: now + between(20000, 50000),
    bubble: '', bubbleUntil: 0, socialAfter: now + 12000, careAfter: 0, moving: false,
  }))
}
export function say(f: Friend, text: string, now: number) { return speak(f, text, now, 4) }
export function decay(stats: Stats, milliseconds: number): Stats {
  const minutes = Math.max(0, Math.min(milliseconds, 8 * 3600000)) / 60000
  return { hunger: clamp(stats.hunger - minutes * .45), happiness: clamp(stats.happiness - minutes * (.22 + (stats.hunger <= 10 ? .12 : 0) + (stats.hygiene <= 10 ? .08 : 0))), energy: clamp(stats.energy - minutes * .16), hygiene: clamp(stats.hygiene - minutes * .3), affection: stats.affection }
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export function tick(friends: Friend[], now: number, dt: number, onMeeting: (text: string) => void, onBond: (friend: Friend) => void = () => {}, visualOnly = false) {
  for (const f of friends) {
    if (!visualOnly) f.stats = decay(f.stats, dt * 1000)
    if (f.growth?.awayJobId || busyLife(f,now)) { f.moving = false; continue }
    advanceInteraction(f, now, dt, () => onBond(f))
    f.moving = false
    if (controlled(f)) continue
    const g = f.growth
    const freeSpeech = () => !friends.some(p => p !== f && p.bubbleUntil > now)
    const need = careNeeds(f)[0]
    if (f.bubblePriority === 3 && !need) f.bubbleUntil = 0
    if (visualOnly && f.careNotice && (!f.careNotice.need || careNeeds(f).includes(f.careNotice.need)) && f.careNotice.until > now && freeSpeech()) speak(f, f.careNotice.text, now, 3, Math.max(0, f.careNotice.until - now))
    if (!visualOnly && need && now >= (f.careAlertAfter?.[need] ?? 0) && freeSpeech()) {
      const text = needLine(f, need)!
      if (speak(f, text, now, 3)) {
        f.careAlertAfter ??= {}; f.careAlertAfter[need] = now + careAlertMs; f.lastCareLine = text
      }
    }
    if (g?.events.length && (!(f.bubbleUntil > now) || (f.bubblePriority ?? 0) < 2.5) && freeSpeech()) speak(f, g.events.shift()!, now, 2.5)
    if (g && now >= g.specialAfter) {
      g.specialAfter = now + between(25000, 50000) * (1 - g.traits.active / 300)
      if (Math.random() < .1 + g.traits[dominant(f)] / 160) { g.specialUntil = now + 2000; f.restingUntil = Math.max(f.restingUntil, now + 1600) }
    }
    if (f.pendingGreeting && now >= f.pendingGreeting.at && freeSpeech() && speak(f, f.pendingGreeting.text, now, 2)) delete f.pendingGreeting
    if (now >= f.nextSpeech) {
      if (isSpecialCharacter(f) && freeSpeech()) {
        speak(f, specialAmbient(f, now, friends), now, 1)
        f.nextSpeech = now + between(20000, 50000)
      } else f.nextSpeech = now + (isSpecialCharacter(f) ? 2000 : between(20000, 50000))
    }
    f.moving = false
    if (now < f.restingUntil) continue
    if (!f.route.length) {
      const peers = friends.filter(p => p.id !== f.id && !controlled(p) && !p.growth?.awayJobId && !busyLife(p,now))
      const other = peers[Math.floor(Math.random() * peers.length)]
      const social = !!other && now > f.socialAfter && Math.random() < (f.growth ? .25 + growth(f).traits.affectionate / 250 : .4)
      const furnitureSpots = [{ x: 330, y: 270 }, { x: 770, y: 310 }, { x: 630, y: 470 }, { x: 170, y: 510 }]
      const target = social ? other : Math.random() < (f.growth ? .6 - growth(f).traits.curious / 250 : .45) ? furnitureSpots[Math.floor(Math.random() * furnitureSpots.length)] : cells[Math.floor(Math.random() * cells.length)]
      f.route = findRoute(f, target, f.navObstacles)
      f.meeting = social ? other.id : undefined
    }
    const peer = f.meeting ? friends.find(p => p.id === f.meeting) : undefined
    if (peer && !peer.growth?.awayJobId && !busyLife(peer,now) && !controlled(peer) && distance(f, peer) < 95 && now >= peer.socialAfter && !(f.bubbleUntil > now && (f.bubblePriority ?? 0) > 2) && !(peer.bubbleUntil > now && (peer.bubblePriority ?? 0) > 2)) {
      const greeting=humanLine(f.kind,'social',f.bubble),reply=humanLine(peer.kind,'social',peer.bubble)
      if (isSpecialCharacter(f) && freeSpeech()) speak(f, greeting?`${peer.name}, ${greeting}`:`${peer.name}야, 안녕! 같이 놀자 ♡`, now, 2)
      if (isSpecialCharacter(peer) && !isSpecialCharacter(f) && freeSpeech()) speak(peer, reply?`${f.name}, ${reply}`:`${f.name}야~ 만나서 반가워!`, now, 2)
      if (isSpecialCharacter(f) && isSpecialCharacter(peer)) peer.pendingGreeting = { text: `${f.name}, ${reply}`, at: now + 6500 }
      for (const p of [f, peer]) {
        if (!visualOnly) { p.stats.happiness = clamp(p.stats.happiness + 4); p.stats.affection = clamp(p.stats.affection + (p.growth && dominant(p) === 'affectionate' ? 1 + growthBalance.bonuses.affectionateSocial : 1)) }
        p.socialUntil = now + 7000; p.restingUntil = now + 7000; p.socialAfter = now + 30000; p.route = []; p.meeting = undefined; p.moving = false
      }
      onMeeting(`${f.name}와 ${peer.name}, 반갑게 인사했어요`)
      continue
    }
    const target = f.route[0]
    if (!target) { f.restingUntil = now + between(2000, 6000) * (f.stats.energy <= 10 ? 2 : 1) * (f.growth ? 1 + (growth(f).traits.calm - growth(f).traits.active) / 100 : 1); continue }
    const d = distance(f, target), step = (f.kind === 'bear' ? 29 : f.kind === 'fox' ? 42 : 35) * dt * careSpeed(f) * (f.life?.coldAt ? .6 : 1)
    if (d <= step) {
      f.x = target.x; f.y = target.y; f.route.shift()
      if (!f.route.length) { f.restingUntil = now + between(2000, 6000) * (f.stats.energy <= 10 ? 2 : 1) * (f.growth ? 1 + (growth(f).traits.calm - growth(f).traits.active) / 100 : 1); f.meeting = undefined }
    } else {
      const dx = target.x - f.x
      if (Math.abs(dx) > .1) f.facing = dx > 0 ? 1 : -1
      f.x += dx / d * step; f.y += (target.y - f.y) / d * step; f.moving = true
    }
  }
}
export function care(f: Friend, action: Care, now = Date.now()): string | null {
  if (f.growth?.awayJobId || f.life?.bath) return null
  if (sleeping(f,now)) { say(f,humanLine(f.kind,'sleep',f.bubble)??'으응… 조금 더 잘래… 💤',now); return '새근새근 잠들어 있어요.' }
  if (action === 'feed') return '먹이는 인벤토리에서 골라 주세요.'
  if (action === 'wash') return '목욕은 생활 메뉴에서 시작해 주세요.'
  if (!f.interaction?.gesture) advanceInteraction(f, now, 0)
  if (action === 'pet') return normalPet(f, now)?.text ?? null
  if (now < f.careAfter || controlled(f)) return null
  if (action === 'rest' && restRemaining(f,now)>0) { say(f,'포근하게 쉬고 있어~ 다음 회복을 기다려 줘!',now); return '다음 쉬게 하기 보상까지 기다려 주세요.' }
  f.careAfter = now + 1500
  const lines: Record<Care, string> = { feed: '냠냠! 정말 맛있어~ 고마워 ♡', pet: '헤헤, 손길이 따뜻해~ ♡', wash: '보송보송! 기분까지 상쾌해~', rest: '푹 쉬었어! 다시 힘이 난다~' }
  if (action === 'rest') { f.lastRestRewardAt=now; f.stats.energy = clamp(f.stats.energy + 20); f.restingUntil = now + 12000; f.furnitureUntil = now + 12000; f.furnitureActivity = '포근한 수동 휴식'; f.route = []; f.moving = false }
  say(f, lines[action], now)
  return lines[action]
}
export function parseSave(raw: string, now = Date.now()): Save {
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || !('version' in data) || ![1, 2].includes(Number(data.version))) throw Error('지원하지 않는 저장 형식')
  const saved = data as Save
  if (!Number.isFinite(saved.savedAt) || !Array.isArray(saved.friends) || saved.friends.length < 4 || saved.friends.length > 10) throw Error('손상된 저장 데이터')
  const base = createFriends(now)
  if(new Set(saved.friends.map(f=>f.id)).size!==saved.friends.length)throw Error('중복된 친구 데이터')
  for(const old of saved.friends.filter(f=>!base.some(b=>b.id===f.id))){if(specialIds.includes(old.id))base.push(makeSpecialFriend(old.id,now));else{if(!adoptionCatalog.some(d=>d.id===old.id))throw Error('알 수 없는 친구');base.push(makeAdoptee(old.id,now))}}
  for (const f of base) {
    const old = saved.friends.find(v => v && v.id === f.id)
    if (!old?.stats || !Object.keys(f.stats).every(k => typeof old.stats[k as keyof Stats] === 'number' && Number.isFinite(old.stats[k as keyof Stats]))) throw Error('손상된 상태 데이터')
    if (typeof old.name === 'string' && old.name.trim()) f.name = old.name.slice(0, 30)
    if (old.facing === -1) f.facing = -1
    f.foodTaste = old.foodTaste && typeof old.foodTaste.like==='string' && typeof old.foodTaste.dislike==='string' && old.foodTaste.like!=='snack' && old.foodTaste.dislike!=='snack' && old.foodTaste.like!==old.foodTaste.dislike ? {...old.foodTaste} : defaultTaste(f.id)
    if(Number.isFinite(old.lastRestRewardAt)) f.lastRestRewardAt=old.lastRestRewardAt
    if (Number.isFinite(old.careAfter)) f.careAfter = old.careAfter
    if (Number.isFinite(old.nextSpeech)) f.nextSpeech = old.nextSpeech
    if (Number.isFinite(old.petRewardAfter)) f.petRewardAfter = Math.min(now + interactionBalance.rewardCooldownMs, Math.max(0, old.petRewardAfter!))
    if (Number.isFinite(old.lastPetRewardAt) && old.lastPetRewardAt! >= 0) f.lastPetRewardAt = old.lastPetRewardAt
    if (old.careAlertAfter && typeof old.careAlertAfter === 'object') { f.careAlertAfter = {}; for (const k of ['hunger', 'hygiene', 'energy', 'cold'] as const) if (Number.isFinite(old.careAlertAfter[k])) f.careAlertAfter[k] = old.careAlertAfter[k] }
    if (old.careNotice && typeof old.careNotice.text === 'string' && Number.isFinite(old.careNotice.until)) f.careNotice = {text: old.careNotice.text.slice(0, 200), until: old.careNotice.until, ...(['hunger','hygiene','energy','cold'].includes(old.careNotice.need ?? '') ? {need: old.careNotice.need} : {})}
    if (typeof old.lastCareLine === 'string') f.lastCareLine = old.lastCareLine.slice(0, 200)
    if (typeof old.lastPetLine === 'string') f.lastPetLine = old.lastPetLine.slice(0, 200)
    f.stats = decay(Object.fromEntries(Object.entries(old.stats).filter(([k]) => k in f.stats).map(([k, v]) => [k, clamp(v)])) as Stats, now - saved.savedAt)
    if (typeof old.photo === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(old.photo) && old.photo.length < 400000 && ['momo', 'bibi'].includes(f.id)) f.photo = old.photo
    if (Number.isFinite(old.x) && Number.isFinite(old.y)) { f.x = old.x; f.y = old.y }
  }
  const memories = Array.isArray(saved.memories) ? saved.memories.filter(m => m && typeof m.text === 'string' && typeof m.id === 'string' && Number.isFinite(m.at)).slice(0, 20) : []
  const result = migrateProgress({ version: 2, savedAt: now, friends: base, memories }, saved.friends, saved.world, now)
  if(!saved.world?.roomVersion)delete result.world!.roomVersion
  upgradeRoom(result)
  settleLife(result,now)
  return result
}

export function restRemaining(f:Friend,now:number) { return Math.max(0,(f.lastRestRewardAt===undefined?0:f.lastRestRewardAt+restCooldownMs)-now) }
export function restLabel(f:Friend,now:number) { const m=Math.ceil(restRemaining(f,now)/60000);return m?`다음 쉬게 하기: ${Math.floor(m/60)}시간 ${m%60}분 후`:'쉬게 하기 가능!' }
