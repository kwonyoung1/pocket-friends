import {expect,test} from 'vitest'
import {BEASTS} from './beasts.ts'
import {BEAST_LIMITS} from './beast-state.ts'
import {fuseBeast,fusionCost,starsOf,STAR_MULTIPLIERS,STAR_DEFENSE_MULTIPLIERS} from './fusion.ts'
import {arenaAccount,arenaProgress} from './server.ts'
import {freshWorld,applyCommand,validateCommand} from '../cloud/engine.ts'
import {parseSave} from '../game.ts'
import {combatStats,heroById,partyErrors,createBattle,act,current} from './model.ts'
import {skillTargets,skillScope} from './targeting.ts'
import {activeResonances,applyResonances} from './resonance.ts'
import * as v2 from './legacy-v2/model.ts'
const now=Date.parse('2026-11-23T03:00:00Z'),user='11111111-1111-4111-8111-111111111111'
function setup(){const save=freshWorld(now),p=arenaProgress(save,now),a=arenaAccount(p,user,now);return{save,p,a}}
test('every species uses exactly 16 one-star equivalents for five stars and preserves old growth and asset records',()=>{
 for(const h of BEASTS){const{save,a}=setup(),unit=BEAST_LIMITS.duplicateShards[h.rarity];a.beasts[h.id]={at:now-100,level:31,xp:7,mastery:3,duplicates:17,shards:unit*15+5};const before=structuredClone(save),b=a.beasts[h.id]
  expect(starsOf(b)).toBe(1);expect(parseSave(JSON.stringify(save),now).world!.arena).toEqual(save.world!.arena)
  for(let star=1;star<5;star++){expect(fusionCost(h.id,star)).toBe(unit*2**(star-1));fuseBeast(a,h.id,star,now);expect(b.stars).toBe(star+1)}
  expect(b.shards).toBe(5);expect({at:b.at,level:b.level,xp:b.xp,mastery:b.mastery,duplicates:b.duplicates}).toEqual({at:now-100,level:31,xp:7,mastery:3,duplicates:17});expect(save.friends).toEqual(before.friends);expect(save.world!.coins).toBe(before.world!.coins);expect(a.energy).toEqual(before.world!.arena!.accounts![user].energy);expect(parseSave(JSON.stringify(save),now).world!.arena).toEqual(save.world!.arena)
  expect(()=>fuseBeast(a,h.id,5,now)).toThrow('최고');expect(()=>fuseBeast(a,h.id,1,now)).toThrow('최신');expect(b.shards).toBe(5)
 }
})
test('insufficient, unowned, cross-species and forged fusion commands cannot consume assets',()=>{
 const{save,a}=setup();a.beasts['beast-lumi']={at:now,level:1,xp:0,mastery:0,duplicates:1,shards:7};const before=structuredClone(save)
 expect(()=>applyCommand(save,{}, {type:'arena-fuse',beastId:'beast-lumi',fromStars:1},user,now)).toThrow('8개');expect(save).toEqual(before)
 expect(()=>fuseBeast(a,'beast-nebula',1,now)).toThrow('보유');expect(()=>validateCommand({type:'arena-fuse',beastId:'beast-lumi',fromStars:1,material:'beast-nebula'})).toThrow();expect(()=>validateCommand({type:'arena-fuse',beastId:'beast-lumi',fromStars:0})).toThrow();expect(()=>validateCommand({type:'arena-fuse',beastId:'beast-lumi',fromStars:1,stars:5,shards:0})).toThrow();expect(save).toEqual(before)
})
test('all star multipliers apply only to HP/ATK/DEF while cost, speed, dodge, crit and skill unlocks stay bounded',()=>{
 for(const h of BEASTS){const base=combatStats(h.id,35,undefined,{stars:1,mastery:2});for(let star=1;star<=5;star++){const stat=combatStats(h.id,35,undefined,{stars:star,mastery:2});for(const key of ['hp','atk','def'] as const)expect(Math.abs(stat[key]-base[key]*(key==='def'?STAR_DEFENSE_MULTIPLIERS:STAR_MULTIPLIERS)[star-1])).toBeLessThanOrEqual(3);expect(stat.spd).toBe(base.spd);expect(heroById(h.id).cost).toBe(h.cost);expect(h.skills.map(k=>k.unlock)).toEqual([1,30,35,50])}}
 expect(combatStats('special-boy',35,undefined,{stars:5})).toEqual(combatStats('special-boy',35));expect(partyErrors(['special-boy','special-girl','momo','bibi','beast-lumi'])).toEqual([]);expect(partyErrors(['special-boy','beast-seraphia','beast-astra'])).toContain('총 COST는 10을 넘을 수 없어요.')
})
test('all beasts receive role-specific buffs and both leaders improve without touching unlocks or mastery',()=>{
 for(const h of BEASTS){const old=v2.heroById(h.id);expect(h.hp+h.atk+h.def+h.spd).toBeGreaterThan(old.hp+old.atk+old.def+old.spd);expect(h.cost).toBe(old.cost);expect(h.mastery).toBe(old.mastery)}
 expect(heroById('special-boy').atk/v2.heroById('special-boy').atk).toBeGreaterThan(1.25);expect(heroById('special-girl').hp/v2.heroById('special-girl').hp).toBeCloseTo(1.3);expect(heroById('special-girl').supportPower).toBe(1.3)
})
function controlled(ids=['special-boy','beast-phynix','beast-nebula']){const s=createBattle(ids,50,7,undefined,'8-4');s.order=[ids[0],...s.order.filter(id=>id!==ids[0])];s.cursor=0;current(s).mp=3;for(const u of s.units)if(u.side==='enemy'){u.hp=u.maxHp=100000;u.def=0;u.shield=0;u.dodge=0;u.controlImmune=0;u.toughness=u.maxToughness=20}return s}
test('two- and three-target attacks hit unique living enemies and preview matches actual action targets',()=>{
 for(const [id,skill,count]of [['beast-nebula','active1',2],['beast-phynix','active1',3]] as const){const s=controlled(['special-boy',id]),actor=s.units.find(u=>u.id===id)!;s.order=[id,...s.order.filter(x=>x!==id)];const k=heroById(id).skills.find(k=>k.id===skill)!,primary=s.units.find(u=>u.side==='enemy')!;expect(skillScope(k)).toBe(`범위 · ${count}명`);const preview=skillTargets(s,actor,k,primary.id),action=act(s,skill,primary.id);expect(action.targets).toEqual(preview.map(u=>u.id));expect(new Set(action.targets).size).toBe(Math.min(count,s.units.filter(u=>u.side==='enemy').length))
  for(const u of s.units)if(u.side==='enemy'&&u.id!==primary.id)u.hp=0;const one=act(s,skill,primary.id);expect(one.targets).toEqual([primary.id]);expect(one.hits).toHaveLength(1)
 }
})
test('all distinct echoes fire once after a multi-hit attack; AoE divides one capped budget across targets',()=>{
 const s=controlled(),actor=current(s),foe=s.units.find(u=>u.side==='enemy')!;const a=act(s,'basic',foe.id);expect(a.resonances!.map(h=>h.element)).toEqual(['fire','dark']);expect(a.next.actions).toBe(s.actions+1);expect(a.resonances!.every(h=>h.damage>0)).toBe(true);expect(a.resonances!.reduce((n,h)=>n+h.damage+h.absorbed,0)).toBeLessThanOrEqual(Math.floor(actor.atk*.5))
 const multi=act(s,'ultimate',foe.id);expect(multi.resonances).toHaveLength(multi.targets.length*2);expect(multi.resonances!.reduce((n,h)=>n+h.damage+h.absorbed,0)).toBeLessThanOrEqual(Math.floor(actor.atk*.5));expect(multi.next.allyActions).toBe(s.allyActions+1)
})
test('duplicate elements fire once, stars and duplicates stay under the cap, and a beast never supplies its own echo',()=>{
 const s=controlled(['special-boy','beast-lumi','beast-nebula','beast-astra']);for(const u of s.units)if(u.side==='ally')u.stars=5
 const groups=activeResonances(s.units,'special-boy');expect(groups.filter(g=>g.element==='light')).toHaveLength(1);expect(groups.find(g=>g.element==='light')!.sources).toHaveLength(2);expect(groups.reduce((n,g)=>n+g.ratio,0)).toBeLessThanOrEqual(.5000001)
 const solo=controlled(['special-boy','beast-phynix']);expect(activeResonances(solo.units,'beast-phynix')).toEqual([]);solo.units.find(u=>u.id==='beast-phynix')!.hp=0;expect(activeResonances(solo.units,'special-boy')).toEqual([])
})
test('misses and non-attacking actions have no echoes; weak breaks from resonance are limited separately',()=>{
 const s=controlled(['special-girl','beast-phynix','beast-nebula']);s.order=['special-girl',...s.order.filter(id=>id!=='special-girl')];s.cursor=0;const girl=current(s),foe=s.units.find(u=>u.side==='enemy')!;girl.hp=Math.round(girl.hp/2)
 expect(act(s,'active1',girl.id).resonances).toEqual([]);expect(act(s,'active2',girl.id).resonances).toEqual([]);for(const u of s.units)if(u.side==='enemy')u.dodge=1;expect(act(s,'basic',foe.id).resonances).toEqual([])
 foe.weakness=['fire','dark'];foe.dodge=0;const before=foe.toughness;const hit=applyResonances(s,girl,[foe]);expect(hit).toHaveLength(2);expect(before-foe.toughness).toBeLessThanOrEqual(.25);expect(girl.element).toBe('light')
})

test('Chanmi heals and shields about thirty percent more at equal target health while retaining the old passive',()=>{
 const s=controlled(['special-boy','special-girl']);s.order=['special-girl',...s.order.filter(id=>id!=='special-girl')];s.cursor=0;const target=s.units.find(u=>u.id==='special-boy')!;target.maxHp=2000;target.hp=1
 const heal=act(s,'active1',target.id).hits.find(h=>h.id===target.id)!.heal,oldHeal=v2.act(s,'active1',target.id).hits.find(h=>h.id===target.id)!.heal
 expect(heal/oldHeal).toBeCloseTo(1.3,2);const shield=act(s,'active2',target.id).hits.find(h=>h.id===target.id)!.shield,oldShield=v2.act(s,'active2',target.id).hits.find(h=>h.id===target.id)!.shield;expect(shield/oldShield).toBeCloseTo(1.3,2);expect(heroById('special-girl').passive).toEqual(v2.heroById('special-girl').passive)
})
