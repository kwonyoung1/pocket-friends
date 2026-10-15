import { humanLine } from './humans/config.ts'
import { isSpecialCharacter, needLine } from './careNeeds.ts'
import { busyLife } from './expansion/model.ts'
import { rewardAction } from './progression/model.ts'
import type { Friend, Point } from './game.ts'
import { interactionBalance as balance } from './balance.ts'
import { validPosition } from './navigation.ts'

export type Phase = 'idle' | 'pressing' | 'petting' | 'bonding' | 'dragging' | 'delighted' | 'landing' | 'settling'
export type Zone = 'head' | 'body'
export type Affinity = 'shy' | 'friendly' | 'close'
export type Gesture = { pointerId: number; start: Point; origin: Point; target: Point; threshold: number; lastX: number }
export type Interaction = {
  phase: Phase; startedAt: number; effectUntil: number; resumeAt: number; zone: Zone
  tilt: number; rewardAttempted: boolean; gesture?: Gesture
}
export function affinity(f: Friend): Affinity { return f.stats.affection <= 30 ? 'shy' : f.stats.affection <= 70 ? 'friendly' : 'close' }
export function controlled(f: Friend) { return !!f.interaction && f.interaction.phase !== 'idle' }
export function bodyZone(f: Friend, relativeY: number): Zone {
  const cutoff = balance.headByFriend[f.id]?.[f.photo ? 'photo' : 'normal'] ?? balance.headCutoff[f.photo ? 'photo' : f.kind]
  return relativeY <= cutoff ? 'head' : 'body'
}
export const normalLines = ['고마워~!', '헤헤, 기분 좋다~', '히히~ 간지러워!', '쓰다듬어 주니까 좋아!', '한 번만 더~!', '앗, 깜짝이야!', '오늘도 고마워~', '너랑 있으면 행복해!']
export const specialLines = ['아아~ 너무 좋아~!', '헤헤, 계속 쓰다듬어 줘~', '너랑 있는 시간이 제일 좋아!', '이렇게 행복해도 되는 거야?', '으응~ 기분 좋아...', '조금만 더 해줘~', '나 지금 정말 행복해!', '손길이 너무 따뜻해~', '헤헤, 잠이 솔솔 와~', '오늘 최고의 순간이야!']
export const reactionLinesByAffinity: Record<Affinity, string[]> = {
  shy: ['앗, 깜짝이야!', '헤헤... 안녕?', '조금 간지러워~'],
  friendly: ['고마워~!', '나 쓰다듬는 거 좋아해!', '오늘도 같이 놀자~', ...normalLines],
  close: ['계속 이렇게 있어줘~', '너랑 있으면 너무 좋아!', '나한테는 네가 최고야~', '우리 정말 친해진 것 같아!'],
}
const voices = { boy:'',girl:'', cat: '냐아, ', bunny: '헤헤, ', bear: '으음~ ', dog: '멍~! ', fox: '헤헷! ' }
export function reactionLine(f: Friend, special: boolean) {
  const human=humanLine(f.kind,special?'special':'pet',f.lastPetLine)
  if(human){f.lastPetLine=human;return human}
  const pool = special ? specialLines : reactionLinesByAffinity[affinity(f)]
  const suffix = special ? { shy: ' 조금 쑥스럽지만… ♡', friendly: '', close: ' 내 단짝은 역시 너야 ♡' }[affinity(f)] : ''
  const options = [...new Set(pool)].map(line => voices[f.kind] + line + suffix).filter(line => line !== f.lastPetLine)
  const text = options[Math.floor(Math.random() * options.length)]
  f.lastPetLine = text
  return text
}
/** Priority: direct player (4) > urgent state (3) > friends (2) > ambient (1). */
export function speak(f: Friend, text: string, now: number, priority: number, duration = 6500) {
  if (priority <= 2 && !isSpecialCharacter(f)) return false
  if (priority < 4 && (controlled(f) || (f.bubbleUntil > now && (f.bubblePriority ?? 0) > priority))) return false
  f.bubble = text; f.bubbleUntil = now + duration; f.bubblePriority = priority
  return true
}
function interaction(phase: Phase, now: number, zone: Zone): Interaction {
  return { phase, startedAt: now, effectUntil: now + balance.tapEffectMs, resumeAt: now + balance.resumeMs, zone, tilt: 0, rewardAttempted: false }
}
function stop(f: Friend) { f.moving = false; f.route = []; f.meeting = undefined; if (f.growth) f.growth.specialUntil = 0 }
export function petRewardRemaining(f: Friend, now: number) {
  return Math.max(0, Math.max(f.petRewardAfter ?? 0, f.lastPetRewardAt === undefined ? 0 : f.lastPetRewardAt + balance.rewardCooldownMs, f.growth?.rewardAfter.pet ?? 0, f.growth?.rewardAfter.special ?? 0) - now)
}
export function petRewardLabel(f: Friend, now: number) {
  const left = petRewardRemaining(f, now), minutes = Math.ceil(left / 60000)
  return left ? `다음 쓰다듬기 보상: ${Math.floor(minutes / 60)}시간 ${minutes % 60}분 후` : '쓰다듬기 보상 가능!'
}
export function grantPetReward(f: Friend, special: boolean, now: number) {
  if (busyLife(f,now)) return false
  if (f.remoteAuthoritative || f.growth?.awayJobId || petRewardRemaining(f, now) > 0) return false
  const reward = special ? balance.special : balance.normal
  f.stats.happiness = Math.min(100, Math.max(0, f.stats.happiness + reward.happiness))
  f.stats.affection = Math.min(100, Math.max(0, f.stats.affection + reward.affection))
  f.petRewardAfter = now + balance.rewardCooldownMs
  f.lastPetRewardAt = now
  rewardAction(f, special ? 'special' : 'pet', now)
  return true
}
export function normalPet(f: Friend, now: number, zone: Zone = 'body') {
  if(busyLife(f,now)){speak(f,humanLine(f.kind,'sleep',f.bubble)??'으응… 포근해… 💤',now,4);return null}
  if (f.growth?.awayJobId || f.interaction?.gesture) return null
  stop(f)
  f.interaction = interaction('delighted', now, zone)
  f.interaction.resumeAt = now + balance.tapEffectMs
  const text = needLine(f) ?? reactionLine(f, false)
  speak(f, text, now, 4)
  return { text, rewarded: grantPetReward(f, false, now) }
}
export function beginGesture(f: Friend, pointerId: number, client: Point, zone: Zone, now: number, pointerType: string) {
  if(busyLife(f,now)){speak(f,humanLine(f.kind,'sleep',f.bubble)??'잠깐만~ 쉬고 있어… 💤',now,4);return false}
  if (f.growth?.awayJobId || f.interaction?.gesture) return false
  stop(f)
  f.interaction = interaction('pressing', now, zone)
  f.interaction.gesture = {
    pointerId, start: client, origin: { x: f.x, y: f.y }, target: { x: f.x, y: f.y }, lastX: client.x,
    threshold: balance.dragThreshold[pointerType as keyof typeof balance.dragThreshold] ?? balance.dragThreshold.mouse,
  }
  // Clear ambient conversation while the friend focuses on the player's hand.
  f.bubbleUntil = 0
  return true
}
export function moveGesture(f: Friend, pointerId: number, client: Point, delta: Point, now: number) {
  const state = f.interaction, gesture = state?.gesture
  if (!state || !gesture || gesture.pointerId !== pointerId) return false
  if (Math.hypot(client.x - gesture.start.x, client.y - gesture.start.y) >= gesture.threshold) {
    if (state.phase !== 'dragging') {
      state.phase = 'dragging'; state.effectUntil = 0
      speak(f, '사뿐사뿐~ 어디로 갈까?', now, 4)
    }
  }
  if (state.phase === 'dragging') {
    gesture.target = validPosition({ x: gesture.origin.x + delta.x, y: gesture.origin.y + delta.y }, f.navObstacles)
    state.tilt = Math.max(-12, Math.min(12, (client.x - gesture.lastX) * .6))
    if (Math.abs(client.x - gesture.lastX) > .2) f.facing = client.x > gesture.lastX ? 1 : -1
    gesture.lastX = client.x
  }
  return true
}
export function advanceInteraction(f: Friend, now: number, dt: number, onReward: () => void = () => {}) {
  const s = f.interaction
  if (!s || s.phase === 'idle') return
  if (s.gesture) {
    if (s.phase === 'dragging') {
      const follow = 1 - Math.exp(-balance.followSpeed * dt)
      const position = validPosition({ x: f.x + (s.gesture.target.x - f.x) * follow, y: f.y + (s.gesture.target.y - f.y) * follow }, f.navObstacles)
      f.x = position.x; f.y = position.y; s.tilt *= Math.exp(-dt * 5)
    } else if (now - s.startedAt >= balance.bondMs) {
      if (s.phase !== 'bonding') {
        s.phase = 'bonding'
        speak(f, reactionLine(f, true), now, 4, 8000)
      }
      if (!s.rewardAttempted) {
        s.rewardAttempted = true
        if (grantPetReward(f, true, now) || f.remoteAuthoritative) onReward()
      }
    } else if (now - s.startedAt >= balance.holdStartMs && s.phase === 'pressing') {
      s.phase = 'petting'
      // A short anticipation line; the full special line appears only at two seconds.
      speak(f, s.zone === 'head' ? `${voices[f.kind]}머리 쓰담쓰담… 좋아~` : `${voices[f.kind]}손길이 참 다정해~`, now, 4)
    }
  } else if (s.phase === 'landing' && now >= s.effectUntil) {
    s.phase = 'settling'
  }
  if (!s.gesture && now >= s.resumeAt) {
    s.phase = 'idle'; s.tilt = 0; f.restingUntil = now
  }
}
/** Release is the sole tap commit point. Cancellation never becomes a tap. */
export function endGesture(f: Friend, pointerId: number, now: number, cancel = false, onReward: () => void = () => {}) {
  const s = f.interaction
  if (!s?.gesture || s.gesture.pointerId !== pointerId) return null
  if (!cancel) advanceInteraction(f, now, 0, onReward)
  const was = s.phase, zone = s.zone
  if (was === 'dragging') {
    const p = cancel ? validPosition(f, f.navObstacles) : s.gesture.target
    f.x = p.x; f.y = p.y
  }
  delete s.gesture
  if (!cancel && was === 'pressing') return normalPet(f, now, zone)
  s.phase = !cancel && was === 'dragging' ? 'landing' : 'settling'
  s.effectUntil = now + balance.landingMs; s.resumeAt = now + balance.resumeMs; s.tilt = 0
  stop(f)
  if (cancel) f.bubbleUntil = 0
  else if (was === 'dragging') speak(f, '사뿐! 여기도 포근하네~', now, 4)
  else if (was !== 'bonding') speak(f, `${voices[f.kind]}조금만 더 같이 있자~`, now, 4)
  return { text: f.bubble, rewarded: false }
}
