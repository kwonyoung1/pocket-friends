import { afterEach, expect, it, vi } from 'vitest'
import type { Save } from './game'
import { care, createFriends, decay, parseSave, tick } from './game'
import { careAlertMs, careNeeds, careSpeed, needLine, isSpecialCharacter, settleCareAlerts, specialAmbient } from './careNeeds'
import { grantSpecialFriends } from './humans/model'
import { expansion, life, makeAdoptee } from './expansion/model'
import { grantPetReward, normalPet, petRewardLabel, petRewardRemaining } from './interaction'
import { interactionBalance as B } from './balance'
import { growth, startExpedition, world } from './progression/model'
const noon = Date.parse('2026-10-15T03:00:00Z')
function save(): Save { const s = {version: 2 as const, savedAt: noon, friends: createFriends(noon), memories: []}; world(s, noon); return s }
afterEach(() => vi.restoreAllMocks())
it('special IDs survive renaming; healthy ordinary and adopted friends stay silent, meet and nod', () => {
  const s = save(); grantSpecialFriends(s, noon); s.friends.push(makeAdoptee('lulu', noon))
  s.friends.find(f => f.id === 'special-boy')!.name = '새 이름'
  for (const f of s.friends) { f.nextSpeech = noon; f.socialAfter = noon + 999999; f.restingUntil = noon + 999999 }
  tick(s.friends, noon, .1, () => {})
  expect(s.friends.filter(f => !isSpecialCharacter(f)).every(f => !f.bubble)).toBe(true)
  expect(s.friends.find(f => f.id === 'special-boy')!.bubble).toMatch(/[가-힣]/)
  const [a,b] = s.friends; a.meeting = b.id; a.route=[{x:b.x,y:b.y}]; a.restingUntil = 0; b.socialAfter = 0; a.x = b.x; a.y = b.y
  tick([a,b], noon + 100, .1, () => {})
  expect(a.socialUntil).toBeGreaterThan(noon); expect(b.socialUntil).toBeGreaterThan(noon)
  expect(a.bubble).toBe(''); expect(b.bubble).toBe('')
})
it('special ambient dialogue uses KST and the actual other name, without consecutive repeats', () => {
  const s=save(); grantSpecialFriends(s,noon)
  const boy=s.friends[4],girl=s.friends[5]; girl.name='찬미'
  vi.spyOn(Math,'random').mockReturnValue(.999)
  expect(specialAmbient(boy,noon,s.friends)).toContain('찬미')
  vi.mocked(Math.random).mockReturnValue(0)
  expect(specialAmbient(boy,Date.parse('2026-10-15T00:00:00Z'),s.friends)).toContain('아침')
  expect(specialAmbient(boy,noon,s.friends)).toContain('점심')
  expect(specialAmbient(boy,Date.parse('2026-10-15T10:00:00Z'),s.friends)).toContain('저녁')
  expect(specialAmbient(boy,Date.parse('2026-10-15T13:00:00Z'),s.friends)).toContain('졸린')
  boy.bubble=specialAmbient(boy,noon,s.friends)
  expect(specialAmbient(boy,noon,s.friends)).not.toBe(boy.bubble)
})
it('a needy quiet friend alerts once per state per 15 minutes, respects direct petting and recovers', () => {
  const f=createFriends(noon)[0]; f.stats.hunger=10; f.stats.hygiene=20; f.restingUntil=noon+999999
  tick([f],noon,.1,()=>{})
  expect(f.bubblePriority).toBe(3); expect(careNeeds(f)[0]).toBe('hunger')
  const first=f.bubble; expect(f.careAlertAfter?.hunger).toBe(noon+careAlertMs)
  tick([f],noon+careAlertMs-1,0,()=>{}); expect(f.bubble).toBe(first)
  tick([f],noon+careAlertMs,0,()=>{}); expect(f.bubble).not.toBe(first)
  normalPet(f,noon+careAlertMs+10); const direct=f.bubble
  tick([f],noon+careAlertMs+20,0,()=>{}); expect(f.bubble).toBe(direct)
  f.stats.hunger=80; f.stats.hygiene=80
  expect(careNeeds(f)).toEqual([])
})
it('server alert timestamps survive restore; stagger multiple needy friends and stop recovered notices', () => {
  const s=save(); s.friends.forEach(f=>{f.stats.hunger=5})
  settleCareAlerts(s.friends,noon)
  expect(s.friends.filter(f=>f.careNotice)).toHaveLength(1)
  const restored=parseSave(JSON.stringify(s),noon+1)
  expect(restored.friends[0].careAlertAfter).toEqual(s.friends[0].careAlertAfter)
  settleCareAlerts(restored.friends,noon+8000)
  expect(restored.friends.filter(f=>f.careNotice)).toHaveLength(2)
  restored.friends[0].stats.hunger=80; settleCareAlerts(restored.friends,noon+9000)
  expect(restored.friends[0].careNotice).toBeUndefined()
})
it('hungry/tired friends slow down and severe needs increase happiness loss without stopping forever', () => {
  const healthy=createFriends(noon)[0], needy=structuredClone(healthy)
  needy.stats.hunger=10; needy.stats.energy=10; needy.stats.hygiene=10
  expect(careSpeed(needy)).toBeGreaterThan(0); expect(careSpeed(needy)).toBeLessThan(careSpeed(healthy))
  expect(decay(needy.stats,60000).happiness).toBeLessThan(decay(healthy.stats,60000).happiness)
  needy.route=[{x:370,y:350}]; needy.restingUntil=0
  tick([needy],noon,.1,()=>{}); expect(needy.x).toBeGreaterThan(330)
  expect(care(needy,'rest',noon+8000)).toContain('힘이')
})
it('six-hour shared rewards block happiness, affection, XP and mission farming at the exact boundary', () => {
  const s=save(), f=s.friends[0]; f.stats.happiness=40
  expect(grantPetReward(f,false,noon)).toBe(true)
  const stats={...f.stats}, g=structuredClone(growth(f))
  for(const t of [1,10000,B.rewardCooldownMs-1]) expect(grantPetReward(f,true,noon+t)).toBe(false)
  expect(f.stats).toEqual(stats); expect(growth(f)).toEqual(g)
  expect(petRewardRemaining(f,noon)).toBe(360*60000)
  expect(petRewardLabel(f,noon)).toContain('6시간 0분')
  const restored=parseSave(JSON.stringify(s),noon+1000).friends[0]
  expect(restored.lastPetRewardAt).toBe(noon)
  expect(grantPetReward(restored,true,noon+B.rewardCooldownMs-1)).toBe(false)
  expect(grantPetReward(restored,true,noon+B.rewardCooldownMs)).toBe(true)
  expect(restored.stats.affection).toBe(24)
  expect(grantPetReward(s.friends[1],true,noon+2000)).toBe(true)
})
it('old saves get their first reward without clearing any existing restrictions or economy', () => {
  const s=save(); const f=s.friends[0]; growth(f).rewardAfter.feed=noon+9999; f.careAfter=noon+10000
  const restored=parseSave(JSON.stringify(s),noon)
  expect(grantPetReward(restored.friends[0],false,noon)).toBe(true)
  expect(restored.friends[0].growth!.rewardAfter.feed).toBe(noon+9999)
  const restricted=save(); restricted.friends[0].petRewardAfter=noon+9000
  expect(grantPetReward(parseSave(JSON.stringify(restricted),noon).friends[0],false,noon)).toBe(false)
  expect(restored.world!.coins).toBe(s.world!.coins)
})
it('migration preserves photos, names, growth, wallet, inventory, locked trip results, furniture, hamsters and life restrictions', () => {
  const s=save(); grantSpecialFriends(s,noon)
  s.friends[0].photo='data:image/png;base64,AAAA';s.friends[0].name='사진 친구'
  s.friends[4].name='영이';s.friends[5].name='찬미'
  Object.assign(growth(s.friends[4]),{level:3,xp:12,explorations:7})
  Object.assign(life(s.friends[0],noon),{coldAt:noon-1000,lastRenameAt:noon,bathCount:1,bath:{startedAt:noon,endsAt:noon+1800000}})
  world(s).coins=4321;world(s).inventory={bread:3,medicine:2}
  expansion(s).placements.push({id:'p',itemId:'plant',x:530,y:390})
  expansion(s).hamsters.push({id:'h',foundAt:noon-100,regionId:'forest',deployed:true,x:400,y:500})
  startExpedition(s,'bibi','forest',noon,()=>.05)
  const original=JSON.stringify(s),restored=parseSave(original,noon)
  expect(restored.world).toEqual(s.world)
  expect(restored.friends.map(f=>[f.id,f.name,f.photo,f.stats])).toEqual(s.friends.map(f=>[f.id,f.name,f.photo,f.stats]))
  expect(restored.friends[0].life).toEqual(s.friends[0].life)
  expect(restored.friends[4].growth!.level).toBe(3);expect(restored.friends[4].growth!.xp).toBe(12)
  expect(restored.friends[4].growth!.explorations).toBe(7)
  expect(restored.friends[1].growth!.awayJobId).toBe(s.world!.jobs[0].id)
  expect(JSON.stringify(s)).toBe(original)
})

it('severe hunger always has a line even when a tap used the other urgent phrase', () => {
 const f=createFriends(noon)[0]; f.stats.hunger=5
 f.lastCareLine='배가 너무 고파… 밥 부탁해!'; f.bubble='꼬르륵… 밥 먹고 힘내고 싶어!'
 expect(needLine(f,'hunger',()=>0)).toBe('배가 너무 고파… 밥 부탁해!')
})
