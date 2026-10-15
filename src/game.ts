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
import { cells, findRoute, walkable } from './navigation.ts'
import { advanceInteraction, controlled, normalPet, speak } from './interaction.ts'
import type { Interaction } from './interaction.ts'
import { interactionBalance } from './balance.ts'
export { obstacles, walkable, findRoute } from './navigation.ts'

export type Kind = 'cat' | 'bunny' | 'bear' | 'fox' | 'dog' | 'boy' | 'girl'
export type Stats = { hunger: number; happiness: number; energy: number; hygiene: number; affection: number }
export type Point = { x: number; y: number }
export type Friend = {
  eatingUntil?: number; recoveryUntil?: number; life?: Life; navObstacles?: Obstacle[]; furnitureUntil?: number; furnitureActivity?: string; remoteAuthoritative?: boolean; remoteHoldId?: string;
  growth?: Growth; id: string; name: string; kind: Kind; color: string; description: string; photo?: string; stats: Stats
  x: number; y: number; facing: number; route: Point[]; restingUntil: number; nextSpeech: number
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
    id, name, kind, color, description, x, y, stats: { hunger: 78, happiness: 85, energy: 90, hygiene: 82, affection: 20 },
    facing: 1, route: [], restingUntil: now + between(500, 2500), nextSpeech: now + between(20000, 50000),
    bubble: '', bubbleUntil: 0, socialAfter: now + 12000, careAfter: 0, moving: false,
  }))
}
export function say(f: Friend, text: string, now: number) { return speak(f, text, now, 4) }
export function decay(stats: Stats, milliseconds: number): Stats {
  const minutes = Math.max(0, Math.min(milliseconds, 8 * 3600000)) / 60000
  return { hunger: clamp(stats.hunger - minutes * .45), happiness: clamp(stats.happiness - minutes * .22), energy: clamp(stats.energy - minutes * .16), hygiene: clamp(stats.hygiene - minutes * .3), affection: stats.affection }
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
    if (g?.events.length && (!(f.bubbleUntil > now) || (f.bubblePriority ?? 0) < 3.5)) speak(f, g.events.shift()!, now, 3.5)
    if (g && now >= g.specialAfter) {
      g.specialAfter = now + between(25000, 50000) * (1 - g.traits.active / 300)
      if (now >= f.bubbleUntil && Math.random() < .1 + g.traits[dominant(f)] / 160) {
        g.specialUntil = now + 2000
        speak(f, humanLine(f.kind,'daily',f.bubble)??personalityPhrases[dominant(f)][0], now, 1)
        f.restingUntil = Math.max(f.restingUntil, now + 1600)
      }
    }
    if (now >= f.nextSpeech) {
      const pool = f.growth && Math.random() < .35 ? personalityPhrases[dominant(f)] : phrases
      speak(f, f.life?.coldAt ? '에취… 훌쩍! 따뜻하게 쉬어야겠어~' : f.stats.hunger < 30 ? humanLine(f.kind,'hungry',f.bubble)??'배에서 꼬르륵… 간식 먹고 싶어~' : humanLine(f.kind,'daily',f.bubble)??pool[Math.floor(Math.random() * pool.length)], now, f.stats.hunger < 30 || f.life?.coldAt ? 3 : 1)
      f.nextSpeech = now + between(20000, 50000)
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
      speak(f, greeting?`${peer.name}, ${greeting}`:`${peer.name}야, 안녕! 같이 놀자 ♡`, now, 2)
      speak(peer, reply?`${f.name}, ${reply}`:`${f.name}야~ 만나서 반가워!`, now, 2)
      for (const p of [f, peer]) {
        if (!visualOnly) { p.stats.happiness = clamp(p.stats.happiness + 4); p.stats.affection = clamp(p.stats.affection + (p.growth && dominant(p) === 'affectionate' ? 1 + growthBalance.bonuses.affectionateSocial : 1)) }
        p.restingUntil = now + 7000; p.socialAfter = now + 30000; p.route = []; p.meeting = undefined; p.moving = false
      }
      onMeeting(`${f.name}와 ${peer.name}, 반갑게 인사했어요`)
      continue
    }
    const target = f.route[0]
    if (!target) { f.restingUntil = now + between(2000, 6000) * (f.growth ? 1 + (growth(f).traits.calm - growth(f).traits.active) / 100 : 1); continue }
    const d = distance(f, target), step = (f.kind === 'bear' ? 29 : f.kind === 'fox' ? 42 : 35) * dt * (f.life?.coldAt ? .6 : 1)
    if (d <= step) {
      f.x = target.x; f.y = target.y; f.route.shift()
      if (!f.route.length) { f.restingUntil = now + between(2000, 6000) * (f.growth ? 1 + (growth(f).traits.calm - growth(f).traits.active) / 100 : 1); f.meeting = undefined }
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
  f.careAfter = now + 1500
  const lines: Record<Care, string> = { feed: '냠냠! 정말 맛있어~ 고마워 ♡', pet: '헤헤, 손길이 따뜻해~ ♡', wash: '보송보송! 기분까지 상쾌해~', rest: '잠깐 쉬었다가 다시 놀자~ 💤' }
  if (action === 'rest') { f.stats.energy = clamp(f.stats.energy + 20); f.restingUntil = now + 12000; f.route = []; f.moving = false }
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
    if (Number.isFinite(old.nextSpeech)) f.nextSpeech = old.nextSpeech
    if (Number.isFinite(old.petRewardAfter)) f.petRewardAfter = Math.min(now + interactionBalance.rewardCooldownMs, Math.max(0, old.petRewardAfter!))
    if (typeof old.lastPetLine === 'string') f.lastPetLine = old.lastPetLine.slice(0, 200)
    f.stats = decay(Object.fromEntries(Object.entries(old.stats).filter(([k]) => k in f.stats).map(([k, v]) => [k, clamp(v)])) as Stats, now - saved.savedAt)
    if (typeof old.photo === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(old.photo) && old.photo.length < 400000 && ['momo', 'bibi'].includes(f.id)) f.photo = old.photo
    if (Number.isFinite(old.x) && Number.isFinite(old.y) && walkable(old)) { f.x = old.x; f.y = old.y }
  }
  const memories = Array.isArray(saved.memories) ? saved.memories.filter(m => m && typeof m.text === 'string' && typeof m.id === 'string' && Number.isFinite(m.at)).slice(0, 20) : []
  const result = migrateProgress({ version: 2, savedAt: now, friends: base, memories }, saved.friends, saved.world, now)
  settleLife(result,now)
  return result
}

const personalityPhrases = { active: ['통통! 오늘도 신나게 움직여 볼까?', '같이 공놀이 하자~!'], calm: ['여기서 잠깐 쉬면 참 좋겠다~', '천천히 가도 괜찮아~'], curious: ['저 가구 뒤에는 뭐가 있을까?', '오늘도 새로운 걸 발견하고 싶어!'], adventurous: ['다음에는 어디로 모험을 떠나 볼까?', '보물을 찾아 떠나고 싶어~!'], affectionate: ['친구야~ 같이 놀자 ♡', '너랑 있으면 매일 행복해!'] }
