import { cells, findRoute, walkable } from './navigation'
import { advanceInteraction, controlled, normalPet, speak } from './interaction'
import type { Interaction } from './interaction'
import { interactionBalance } from './balance'
export { obstacles, walkable, findRoute } from './navigation'

export type Kind = 'cat' | 'bunny' | 'bear' | 'fox'
export type Stats = { hunger: number; happiness: number; energy: number; hygiene: number; affection: number }
export type Point = { x: number; y: number }
export type Friend = {
  id: string; name: string; kind: Kind; color: string; description: string; photo?: string; stats: Stats
  x: number; y: number; facing: number; route: Point[]; restingUntil: number; nextSpeech: number
  interaction?: Interaction; petRewardAfter?: number; lastPetLine?: string; bubblePriority?: number;
  bubble: string; bubbleUntil: number; meeting?: string; socialAfter: number; careAfter: number; moving: boolean
}
export type Care = 'feed' | 'pet' | 'wash' | 'rest'
export type Memory = { id: string; text: string; at: number }
export type Save = { version: 1; savedAt: number; friends: Friend[]; memories: Memory[] }
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
export function tick(friends: Friend[], now: number, dt: number, onMeeting: (text: string) => void, onBond: (friend: Friend) => void = () => {}) {
  for (const f of friends) {
    f.stats = decay(f.stats, dt * 1000)
    advanceInteraction(f, now, dt, () => onBond(f))
    f.moving = false
    if (controlled(f)) continue
    if (now >= f.nextSpeech) {
      speak(f, f.stats.hunger < 30 ? '배에서 꼬르륵… 간식 먹고 싶어~' : phrases[Math.floor(Math.random() * phrases.length)], now, f.stats.hunger < 30 ? 3 : 1)
      f.nextSpeech = now + between(20000, 50000)
    }
    f.moving = false
    if (now < f.restingUntil) continue
    if (!f.route.length) {
      const peers = friends.filter(p => p.id !== f.id && !controlled(p))
      const other = peers[Math.floor(Math.random() * peers.length)]
      const social = !!other && now > f.socialAfter && Math.random() < .4
      const furnitureSpots = [{ x: 330, y: 270 }, { x: 770, y: 310 }, { x: 630, y: 470 }, { x: 170, y: 510 }]
      const target = social ? other : Math.random() < .45 ? furnitureSpots[Math.floor(Math.random() * furnitureSpots.length)] : cells[Math.floor(Math.random() * cells.length)]
      f.route = findRoute(f, target)
      f.meeting = social ? other.id : undefined
    }
    const peer = f.meeting ? friends.find(p => p.id === f.meeting) : undefined
    if (peer && !controlled(peer) && distance(f, peer) < 95 && now >= peer.socialAfter && !(f.bubbleUntil > now && (f.bubblePriority ?? 0) > 2) && !(peer.bubbleUntil > now && (peer.bubblePriority ?? 0) > 2)) {
      speak(f, `${peer.name}야, 안녕! 같이 놀자 ♡`, now, 2)
      speak(peer, `${f.name}야~ 만나서 반가워!`, now, 2)
      for (const p of [f, peer]) {
        p.stats.happiness = clamp(p.stats.happiness + 4); p.stats.affection = clamp(p.stats.affection + 1)
        p.restingUntil = now + 7000; p.socialAfter = now + 30000; p.route = []; p.meeting = undefined; p.moving = false
      }
      onMeeting(`${f.name}와 ${peer.name}, 반갑게 인사했어요`)
      continue
    }
    const target = f.route[0]
    if (!target) { f.restingUntil = now + between(2000, 6000); continue }
    const d = distance(f, target), step = (f.kind === 'bear' ? 29 : f.kind === 'fox' ? 42 : 35) * dt
    if (d <= step) {
      f.x = target.x; f.y = target.y; f.route.shift()
      if (!f.route.length) { f.restingUntil = now + between(2000, 6000); f.meeting = undefined }
    } else {
      const dx = target.x - f.x
      if (Math.abs(dx) > .1) f.facing = dx > 0 ? 1 : -1
      f.x += dx / d * step; f.y += (target.y - f.y) / d * step; f.moving = true
    }
  }
}
export function care(f: Friend, action: Care, now = Date.now()): string | null {
  if (!f.interaction?.gesture) advanceInteraction(f, now, 0)
  if (action === 'pet') return normalPet(f, now)?.text ?? null
  if (now < f.careAfter || controlled(f)) return null
  f.careAfter = now + 1500
  const lines: Record<Care, string> = { feed: '냠냠! 정말 맛있어~ 고마워 ♡', pet: '헤헤, 손길이 따뜻해~ ♡', wash: '보송보송! 기분까지 상쾌해~', rest: '잠깐 쉬었다가 다시 놀자~ 💤' }
  if (action === 'feed') { f.stats.hunger = clamp(f.stats.hunger + 22); f.stats.energy = clamp(f.stats.energy + 5) }
  if (action === 'wash') { f.stats.hygiene = clamp(f.stats.hygiene + 28); f.stats.happiness = clamp(f.stats.happiness + 4) }
  if (action === 'rest') { f.stats.energy = clamp(f.stats.energy + 20); f.restingUntil = now + 12000; f.route = []; f.moving = false }
  say(f, lines[action], now)
  return lines[action]
}
export function parseSave(raw: string, now = Date.now()): Save {
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1) throw Error('지원하지 않는 저장 형식')
  const saved = data as Save
  if (!Number.isFinite(saved.savedAt) || !Array.isArray(saved.friends) || saved.friends.length !== 4) throw Error('손상된 저장 데이터')
  const base = createFriends(now)
  for (const f of base) {
    const old = saved.friends.find(v => v && v.id === f.id)
    if (!old?.stats || !Object.keys(f.stats).every(k => typeof old.stats[k as keyof Stats] === 'number' && Number.isFinite(old.stats[k as keyof Stats]))) throw Error('손상된 상태 데이터')
    if (Number.isFinite(old.petRewardAfter)) f.petRewardAfter = Math.min(now + interactionBalance.rewardCooldownMs, Math.max(0, old.petRewardAfter!))
    if (typeof old.lastPetLine === 'string') f.lastPetLine = old.lastPetLine.slice(0, 200)
    f.stats = decay(Object.fromEntries(Object.entries(old.stats).filter(([k]) => k in f.stats).map(([k, v]) => [k, clamp(v)])) as Stats, now - saved.savedAt)
    if (typeof old.photo === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(old.photo) && old.photo.length < 400000 && ['momo', 'bibi'].includes(f.id)) f.photo = old.photo
    if (Number.isFinite(old.x) && Number.isFinite(old.y) && walkable(old)) { f.x = old.x; f.y = old.y }
  }
  const memories = Array.isArray(saved.memories) ? saved.memories.filter(m => m && typeof m.text === 'string' && typeof m.id === 'string' && Number.isFinite(m.at)).slice(0, 20) : []
  return { version: 1, savedAt: now, friends: base, memories }
}
