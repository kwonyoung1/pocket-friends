import type { Friend } from './game.ts'
import { humanLines } from './humans/config.ts'

export type Need = 'hunger' | 'hygiene' | 'energy' | 'cold'
export const careAlertMs = 15 * 60000
export const isSpecialCharacter = (f: Pick<Friend, 'id'>) => f.id === 'special-boy' || f.id === 'special-girl'
export const needLabels: Record<Need, string> = { hunger: '음식이 필요해요', hygiene: '목욕이 필요해요', energy: '휴식이 필요해요', cold: '감기약이 필요해요' }
export function careNeeds(f: Friend): Need[] {
  const needs = (['hunger', 'hygiene', 'energy'] as const).filter(k => f.stats[k] <= 30)
  return [...needs.sort((a, b) => f.stats[a] - f.stats[b]), ...(f.life?.coldAt ? ['cold' as const] : [])]
}
const lines: Record<Need, string[]> = {
  hunger: ['배고파~', '꼬르륵...', '맛있는 거 없을까?', '밥 먹고 싶어!'],
  hygiene: ['씻고 싶어~', '몸이 찝찝해...', '목욕할 시간이야!', '깨끗해지고 싶다~'],
  energy: ['졸려...', '조금 쉬고 싶어~', '오늘은 피곤하네.', '잠깐 누워 있을까?'],
  cold: ['에취… 따뜻하게 쉬고 싶어~', '훌쩍… 감기약이 필요해~'],
}
export function needLine(f: Friend, need = careNeeds(f)[0], random = Math.random) {
  if (!need) return undefined
  const choices = (need === 'hunger' && f.stats.hunger <= 10 ? ['배가 너무 고파… 밥 부탁해!', '꼬르륵… 밥 먹고 힘내고 싶어!'] : lines[need])
  const preferred = choices.filter(t => t !== f.lastCareLine && t !== f.bubble)
  const pool = preferred.length ? preferred : choices.filter(t => t !== f.bubble)
  return pool[Math.floor(random() * pool.length)]
}
export function careSpeed(f: Friend) {
  return (f.stats.hunger <= 30 ? .85 : 1) * (f.stats.energy <= 10 ? .55 : f.stats.energy <= 30 ? .75 : 1)
}
export function specialAmbient(f: Friend, now: number, peers: Friend[]) {
  const hour = (now / 3600000 + 9) % 24
  const other = peers.find(p => isSpecialCharacter(p) && p.id !== f.id)
  const time = hour < 6 || hour >= 21 ? ['슬슬 졸린 것 같은데?', '포근한 밤이야~ 좋은 꿈 꾸자!'] : hour < 11 ? ['좋은 아침! 오늘도 좋은 하루 보내~!', '아침 햇살이 따뜻해~'] : hour < 17 ? ['점심 먹고 뭐 하고 놀까?', '날씨 한번 확인해야겠다~'] : ['저녁에도 함께여서 행복해~', '오늘 하루는 어땠어?']
  const pool = [...time, ...((f.kind === 'boy' || f.kind === 'girl') ? humanLines[f.kind].daily : []), ...(other ? [`${other.name}는 뭐 하고 있으려나?`, `${other.name}, 우리 같이 놀까?`] : [])].filter(t => t !== f.bubble)
  return pool[Math.floor(Math.random() * pool.length)]
}

// Server snapshots persist alert limits across reloads and authenticated devices.
export function settleCareAlerts(friends: Friend[], now: number) {
  let last = Math.max(0, ...friends.map(f => (f.careNotice?.until ?? 0) - 6500))
  for (const f of friends) {
    const need = careNeeds(f)[0]
    if (f.careNotice?.need && !careNeeds(f).includes(f.careNotice.need)) delete f.careNotice
    if (!need) { delete f.careNotice; continue }
    if (f.growth?.awayJobId || f.life?.bath || now < (f.careAlertAfter?.[need] ?? 0) || now - last < 8000) continue
    const text = needLine(f, need)!
    f.careAlertAfter ??= {}; f.careAlertAfter[need] = now + careAlertMs
    f.lastCareLine = text; f.careNotice = {text, until: now + 6500, need}; last = now
  }
}
