import {expect,it} from 'vitest'
import {freshWorld,applyCommand} from '../cloud/engine'
import {settleEmotions,visibleEmotion,migrateEmotion} from './model'
import {careNeeds} from '../careNeeds'
import {parseSave} from '../game'
const now=Date.parse('2026-10-17T03:00:00Z')
it('uses cold > hunger > hygiene > fatigue and cycles one need at a time at 2–4 minute intervals',()=>{
 const f=freshWorld(now).friends[0];f.stats.hunger=20;f.stats.hygiene=2;f.stats.energy=5
 expect(careNeeds(f)).toEqual(['hunger','hygiene','energy'])
 for(const [i,kind] of ['hunger','hygiene','energy','hunger'].entries()){
  settleEmotions([f],now+i*120000,()=>0);expect(visibleEmotion(f,now+i*120000)?.kind).toBe(kind)
  expect(f.stateEmotion!.nextAt).toBe(now+(i+1)*120000)
 }
 f.life={bathDay:'2026-10-17',bathCount:0,names:[],lastSettledAt:now,coldAt:now}
 settleEmotions([f],now+480000,()=>.999);expect(visibleEmotion(f,now+480000)?.kind).toBe('cold');expect(f.stateEmotion!.nextAt-(now+480000)).toBeLessThanOrEqual(240000)
})
it('expires after 1.8s, immediately stops recovered states and suppresses direct interaction and baths',()=>{
 const f=freshWorld(now).friends[0];f.stats.hunger=10;settleEmotions([f],now,()=>0)
 expect(visibleEmotion(f,now+1799)).toBeDefined();expect(visibleEmotion(f,now+1800)).toBeUndefined()
 f.stats.hunger=80;expect(visibleEmotion(f,now+1)).toBeUndefined();settleEmotions([f],now+1);expect(f.stateEmotion!.active).toBeUndefined()
 f.stats.hunger=10;settleEmotions([f],now+120000,()=>0)
 f.life={bathDay:'2026-10-17',bathCount:1,names:[],lastSettledAt:now,bath:{startedAt:now,endsAt:now+1800000}};expect(visibleEmotion(f,now+120000)).toBeUndefined()
})
it('staggering prevents simultaneous icons and identical repeats alternate artwork without changing stats or positions',()=>{
 const s=freshWorld(now);s.friends.forEach(f=>f.stats.hunger=5);const old=s.friends.map(f=>({stats:{...f.stats},x:f.x,y:f.y}))
 settleEmotions(s.friends,now,()=>0);expect(s.friends.filter(f=>visibleEmotion(f,now))).toHaveLength(1)
 settleEmotions(s.friends,now+2200,()=>0);expect(s.friends.filter(f=>visibleEmotion(f,now+2200))).toHaveLength(1)
 const f=s.friends[0],variant=f.stateEmotion!.variant;settleEmotions([f],now+120000,()=>0);expect(f.stateEmotion!.variant).not.toBe(variant)
 expect(s.friends.map(f=>({stats:f.stats,x:f.x,y:f.y}))).toEqual(old)
})
it('persists schedules through reload and server refresh without changing original photos or economy',()=>{
 const s=freshWorld(now);s.friends[0].stats.hunger=10;s.friends[0].photo='data:image/png;base64,AAAA'
 settleEmotions(s.friends,now,()=>0);const restored=parseSave(JSON.stringify(s),now+1)
 expect(restored.friends[0].stateEmotion).toEqual(s.friends[0].stateEmotion)
 const result=applyCommand(restored,{}, {type:'refresh'},'pc',now+1000).save
 expect(result.friends[0].stateEmotion!.nextAt).toBe(now+120000);expect(result.friends[0].photo).toBe(s.friends[0].photo);expect(result.world!.coins).toBe(s.world!.coins)
 expect(()=>migrateEmotion({nextAt:0,cycle:[],variant:0,active:{kind:'hunger',at:now,until:now+99999,variant:0}})).toThrow()
})
