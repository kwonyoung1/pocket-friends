import {expect,it} from 'vitest'
import {naturalChange,legacyChange,statusBalance} from './balance'
import {freshWorld,applyCommand,importWorld} from '../cloud/engine'
import {parseSave,care} from '../game'
import type {Stats} from '../game'
import {life,settleLife,lifeCommand} from '../expansion/model'
import {startExpedition,useItem,world,growth} from '../progression/model'
import {careNeeds} from '../careNeeds'
import {visibleEmotion} from '../emotions/model'
const hour=3600000,at=Date.parse('2026-10-19T03:00:00Z')
const stats=(energy=40):Stats=>({hunger:100,hygiene:100,happiness:100,energy,affection:47})
it('uses exactly one-third hunger and half hygiene and every happiness rate, including need penalties',()=>{
 const before=stats(),old=legacyChange(before,hour),next=naturalChange(before,hour)
 expect((before.hunger-next.hunger)/(before.hunger-old.hunger)).toBeCloseTo(1/3,12)
 expect((before.hygiene-next.hygiene)/(before.hygiene-old.hygiene)).toBe(.5)
 expect((before.happiness-next.happiness)/(before.happiness-old.happiness)).toBeCloseTo(.5,12)
 for(const [hunger,hygiene,loss] of [[0,100,10.2],[100,0,9],[0,0,12.6]]){
  const s={...before,hunger,hygiene};expect(naturalChange(s,hour).happiness).toBeCloseTo(100-loss,12)
  expect(100-naturalChange(s,hour).happiness).toBeCloseTo((100-legacyChange(s,hour).happiness)/2,12)
 }
 expect(statusBalance.perHour).toEqual({hunger:-9,hygiene:-9,happiness:-6.6,energy:8})
})
it.each([[15*60000,42],[30*60000,44],[hour,48],[3*hour,64],[37.5,40+8*37.5/hour]])('recovers linearly for %i milliseconds without truncation or a second multiplier',(ms,energy)=>{
 expect(naturalChange(stats(),ms).energy).toBeCloseTo(energy,12)
})
it('clamps energy at 100, never decreases it naturally, and retains all other bounds and affection',()=>{
 for(const energy of [0,10,40,90,100])for(const duration of [0,1,60000,2*hour,1000*hour]){const n=naturalChange(stats(energy),duration);expect(n.energy).toBeGreaterThanOrEqual(energy);expect(Object.values(n).every(v=>v>=0&&v<=100)).toBe(true);expect(n.affection).toBe(47)}
 expect(naturalChange(stats(90),2*hour).energy).toBe(100);expect(naturalChange(stats(100),hour).energy).toBe(100)
 expect(naturalChange(stats(),-hour)).toEqual(stats())
})
it('integrates low-need threshold crossings identically online and offline with no rounding loss',()=>{
 const s={...stats(),hunger:12,hygiene:17},duration=2*hour+137.5
 const offline=naturalChange(s,duration);let online={...s}
 for(let i=0;i<10000;i++)online=naturalChange(online,duration/10000)
 for(const k of Object.keys(s) as (keyof Stats)[])expect(online[k]).toBeCloseTo(offline[k],8)
})
it('settles actual offline time beyond eight hours and repeated parse/reload never double applies',()=>{
 const s=freshWorld(at);s.friends[0].stats=stats(0)
 const first=parseSave(JSON.stringify(s),at+10*hour)
 // Night sleep starts later than this interval; all ten hours receive the new natural rule.
 expect(first.friends[0].stats.energy).toBe(80);expect(first.friends[0].stats.hunger).toBe(10)
 expect(parseSave(JSON.stringify(first),at+10*hour).friends[0].stats).toEqual(first.friends[0].stats)
 const second=parseSave(JSON.stringify(first),at+10.25*hour);expect(second.friends[0].stats.energy).toBe(82)
})
it('settles the legacy interval with its old rules exactly once, then activates the new rate at the trusted boundary',()=>{
 const s=freshWorld(at);delete s.world!.statusBalanceVersion;delete s.world!.statusBalanceSince
 for(const f of s.friends){f.stats=stats(80);life(f,at)}
 const untouched=structuredClone(s),migrated=applyCommand(s,{}, {type:'refresh'},'pc',at+hour).save
 expect(s).toEqual(untouched);expect(migrated.friends[0].stats).toEqual(legacyChange(stats(80),hour))
 expect(migrated.world!.statusBalanceSince).toBe(at+hour);expect(migrated.savedAt).toBe(at+hour)
 const again=applyCommand(migrated,{}, {type:'refresh'},'phone',at+hour).save;expect(again.friends[0].stats).toEqual(migrated.friends[0].stats)
 const later=applyCommand(again,{}, {type:'refresh'},'pc',at+2*hour).save
 expect(later.friends[0].stats.energy).toBeCloseTo(78.4,12);expect(later.friends[0].stats.hunger).toBe(64)
 expect(later.world!.statusBalanceSince).toBe(at+hour)
})
it('preserves a legacy sleeping interval and removes the former 9.6 sleep compensation after migration',()=>{
 const night=Date.parse('2026-10-19T16:00:00Z'),s=freshWorld(night);delete s.world!.statusBalanceVersion;delete s.world!.statusBalanceSince
 s.friends[0].stats=stats();life(s.friends[0],night)
 settleLife(s,night+hour);expect(s.friends[0].stats.energy).toBeCloseTo(52,10)
 settleLife(s,night+2*hour);expect(s.friends[0].stats.energy).toBeCloseTo(72,10)
})
it.each([false,true])('keeps separate sleep bonus with cold=%s, without the removed decline compensation',cold=>{
 const night=Date.parse('2026-10-19T16:00:00Z'),s=freshWorld(night);s.friends[0].stats=stats();if(cold)life(s.friends[0],night).coldAt=night
 settleLife(s,night+hour);expect(s.friends[0].stats.energy).toBeCloseTo(cold?54:60,10)
 settleLife(s,night+hour);expect(s.friends[0].stats.energy).toBeCloseTo(cold?54:60,10)
})
it('splits a completed bath at its recorded end, pays happiness once and uses the new post-bath hygiene rate',()=>{
 const s=freshWorld(at);s.friends[0].stats={...stats(0),happiness:50,hygiene:0}
 lifeCommand(s,{type:'bath',friendId:'momo'},at)
 const start=structuredClone(s);settleLife(s,at+2.5*hour)
 expect(s.friends[0].stats.hygiene).toBe(82);expect(s.friends[0].stats.energy).toBe(20)
 const actual={...s.friends[0].stats};settleLife(s,at+2.5*hour);expect(s.friends[0].stats).toEqual(actual)
 const split=parseSave(JSON.stringify(start),at+.5*hour);settleLife(split,at+2.5*hour)
 for(const k of Object.keys(actual) as (keyof Stats)[])expect(split.friends[0].stats[k]).toBeCloseTo(actual[k],10)
})
it('preserves food, manual-rest cooldowns and expedition costs while natural recovery continues',()=>{
 const s=freshWorld(at),f=s.friends[0];f.stats=stats();world(s).inventory['pumpkin-porridge']=1
 useItem(s,'pumpkin-porridge',f.id,at);expect(f.stats.energy).toBe(55)
 care(f,'rest',at+2000);expect(f.stats.energy).toBe(75);expect(f.lastRestRewardAt).toBe(at+2000)
 care(f,'rest',at+4000);expect(f.stats.energy).toBe(75)
 const ready=freshWorld(at);ready.friends[0].stats=stats();const cost=15;growth(ready.friends[0]).traits.curious=100
 startExpedition(ready,'momo','forest',at,()=>.99);expect(ready.friends[0].stats.energy).toBe(40-cost)
 settleLife(ready,at+15*60000);expect(ready.friends[0].stats.energy).toBe(27)
})
it('clears the existing tired emotion above its unchanged threshold and preserves other need thresholds',()=>{
 const s=freshWorld(at),f=s.friends[0];f.stats={...stats(29.999),hunger:30,hygiene:30};f.stateEmotion={nextAt:at+200000,cycle:[],variant:0,active:{kind:'energy',at,until:at+1800,variant:0}}
 expect(visibleEmotion(f,at)?.kind).toBe('energy');settleLife(s,at+1000)
 expect(f.stats.energy).toBeGreaterThan(30);expect(visibleEmotion(f,at+1000)).toBeUndefined();expect(careNeeds(f)).toEqual(['hunger','hygiene'])
})
it('resets imported client timestamps to server time and never copies a device clock into settlement state',()=>{
 const future=freshWorld(at+100*hour);future.friends[0].stats=stats();life(future.friends[0],future.savedAt)
 const imported=importWorld(future,at);expect(imported.savedAt).toBe(at);expect(imported.friends[0].life!.lastSettledAt).toBe(at);expect(imported.world!.statusBalanceSince).toBe(at)
 settleLife(imported,at+hour);expect(imported.friends[0].stats.energy).toBe(48)
})
