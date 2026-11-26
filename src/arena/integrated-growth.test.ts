import {test,expect} from 'vitest'
import * as model from './model.ts'
import * as old from './legacy-v7/model.ts'
import {STAGES,EVENT_STAGES} from './stages.ts'
import {STAGES as oldStages} from './legacy-v7/stages.ts'
import {attackIncrease} from './enemy-pressure.ts'
import {ADVENTURERS} from './adventurers.ts'
import {BEAST_LIMITS} from './beast-state.ts'
import {STAR_MULTIPLIERS,STAR_DEFENSE_MULTIPLIERS,fuseBeast,fusionCost} from './fusion.ts'
import {arenaProgress,arenaAccount,arenaCommand} from './server.ts'
import {freshWorld,validateCommand} from '../cloud/engine.ts'
import {grantSpecialFriends} from '../humans/model.ts'
import {restoreArena} from './state.ts'
import type {ArenaTicket} from './state.ts'
import type {State,Move} from './types.ts'
import {ticketBattle,replay,actForRules,enemyForRules,intentForRules} from './replay.ts'
import {specialGrowth,grantGrace,expireGrace} from './special-growth.ts'
import {enemyLayout} from './battle-layout.ts'
const now=Date.parse('2026-11-26T03:00:00Z'),owner=crypto.randomUUID(),party=['special-boy','special-girl','momo']
function setup(){const save=freshWorld(now);grantSpecialFriends(save,now);const p=arenaProgress(save,now);p.season=2;const a=arenaAccount(p,owner,now);return {save,p,a}}
function field(id='special-boy',step=20):State{
 const profiles=Object.fromEntries(party.map(id=>[id,{name:id,level:50,training:{hp:step,atk:step,def:step}}]))
 const s=model.createBattle(party,50,11,profiles,'1-1');s.order=[id,...s.units.filter(u=>u.id!==id).map(u=>u.id)];s.cursor=0
 for(const e of s.units.filter(u=>u.side==='enemy')){e.hp=e.maxHp=100000;e.shield=0;e.def=0;e.toughness=e.maxToughness=0;e.dodge=0}return s
}
test('all 125 stages retain rewards, energy, unlocks and old enemy HP/DEF; final live ATK grows once',()=>{
 expect(STAGES).toHaveLength(oldStages.length)
 for(const stage of STAGES){const original=oldStages.find(s=>s.id===stage.id)!;expect({...stage,waves:original.waves}).toEqual(original)
  for(let w=1;w<=stage.waves.length;w++){const before=old.enemies(stage.level,w,stage.id),after=model.enemies(stage.level,w,stage.id);expect(after.slice(0,before.length).map(u=>u.id)).toEqual(before.map(u=>u.id))
   for(let i=0;i<before.length;i++){expect(after[i].atk).toBe(Math.round(before[i].atk*attackIncrease(stage.chapter)));expect(after[i].maxHp).toBe(before[i].maxHp);expect(after[i].def).toBe(before[i].def)}
   if(stage.chapter!<=3)expect(after).toEqual(before)
   const chapter=stage.chapter!,range=chapter<=3?[1,3]:chapter===4?[2,3]:chapter<=6?[3,4]:chapter===7?[4,4]:chapter<=9?[4,5]:[5,6]
   expect(after.length).toBeGreaterThanOrEqual(range[0]);expect(after.length).toBeLessThanOrEqual(range[1]);if(chapter>=5)expect(new Set(after.map(u=>u.monsterId)).size).toBeGreaterThanOrEqual(2)
  }
 }
 for(const s of EVENT_STAGES)for(let w=1;w<=s.waves.length;w++)expect(model.enemies(s.level,w,s.id)).toEqual(old.enemies(s.level,w,s.id))
})
test('all eight adventurers fuse to five stars with existing shards and preserve growth, training, coins and clears',()=>{
 for(const h of ADVENTURERS){const {save,p,a}=setup(),unit=BEAST_LIMITS.duplicateShards[h.rarity];a.adventurers={[h.id]:{at:now-1,level:31,xp:17,duplicates:15,shards:unit*15+3}};a.shop={training:{[h.id]:{hp:13,atk:22,def:9}},skills:{[h.id]:{basic:4}},command:1,scrolls:{small:2}};const before=structuredClone(save),b=a.adventurers[h.id]
  for(let star=1;star<=4;star++){expect(fusionCost(h.id,star)).toBe(unit*2**(star-1));arenaCommand(save,{type:'arena-fuse',beastId:h.id,fromStars:star},owner,now);expect(b.stars).toBe(star+1)}
  expect(b).toEqual({...before.world!.arena!.accounts![owner].adventurers![h.id],stars:5,shards:3});expect(a.shop).toEqual(before.world!.arena!.accounts![owner].shop);expect(save.friends).toEqual(before.friends);expect(save.world!.coins).toBe(before.world!.coins);expect(a.energy).toEqual(before.world!.arena!.accounts![owner].energy);expect(restoreArena(p)).toEqual(p)
  const settled=structuredClone(save);expect(()=>arenaCommand(save,{type:'arena-fuse',beastId:h.id,fromStars:4},owner,now)).toThrow('최신');expect(save).toEqual(settled);expect(()=>fuseBeast(a,h.id,5,now)).toThrow('최고')
 }
 expect(()=>validateCommand({type:'arena-fuse',beastId:'special-boy',fromStars:1})).toThrow();expect(()=>validateCommand({type:'arena-fuse',beastId:'adv-aria',fromStars:1,shards:0})).toThrow()
})
test('adventurer stars apply computed HP/ATK/DEF only and never depend on fusion/level-up order',()=>{
 for(const h of ADVENTURERS){const base=model.combatStats(h.id,40);for(let stars=1;stars<=5;stars++){const n=model.combatStats(h.id,40,undefined,{stars});for(const k of ['hp','atk','def'] as const)expect(Math.abs(n[k]-base[k]*(k==='def'?STAR_DEFENSE_MULTIPLIERS:STAR_MULTIPLIERS)[stars-1])).toBeLessThanOrEqual(1);expect(n.spd).toBe(base.spd);expect(model.heroById(h.id).skills).toEqual(h.skills)}}
})
test('Youngi echo is real bounded direct damage for basic, burst and multi-hit AoE; buffs never echo',()=>{
 for(const step of [0,10,19,20,30])for(const skill of ['basic','active2','ultimate']){const s=field('special-boy',step),u=model.current(s);u.mp=3;const a=model.act(s,skill,s.units.find(u=>u.side==='enemy')!.id),h=a.hits[0],base=model.heroById('special-boy').skills.find(k=>k.id===skill)!,count=(base.hits+(base.primaryExtra??0))*(step>=20?2:1)
  expect(h.strikes).toHaveLength(count);expect(h.damage).toBe(h.strikes!.reduce((n,v)=>n+v,0));expect(a.next.totalDamage).toBe(h.damage);expect(a.next.units.find(u=>u.id===h.id)!.hp).toBe(100000-h.damage)
 }
 expect(specialGrowth('special-boy',{atk:20}).echo).toBe(.7);expect(specialGrowth('special-boy',{atk:30}).echo).toBe(.85)
 const s=field();model.current(s).mp=3;const attack=model.act(s,'basic',s.units.find(u=>u.side==='enemy')!.id);const grown=field('special-boy',30);model.current(grown).atk=model.current(s).atk;const higher=model.act(grown,'basic',grown.units.find(u=>u.side==='enemy')!.id);expect(higher.hits[0].damage).toBeGreaterThan(attack.hits[0].damage)
 const buff=model.act(s,'active1');expect(buff.hits.every(h=>h.damage===0&&!h.strikes?.length)).toBe(true)
 const dying=field();dying.units.find(u=>u.side==='enemy')!.hp=1;expect(model.act(dying,'basic',dying.units.find(u=>u.side==='enemy')!.id).hits[0].strikes).toHaveLength(1)
 const aoe=field();model.current(aoe).mp=3;aoe.units.push({...structuredClone(aoe.units.find(u=>u.side==='enemy')!),id:'second'});expect(model.act(aoe,'ultimate').hits.filter(h=>h.damage>0).map(h=>h.strikes!.length)).toEqual([6,6])
})
test('Chanmi shield grants one nonstacking hit block before HP/shield loss; DoT is not blocked; duration and +30 rebound bounded',()=>{
 for(const step of [19,20,30]){const s=field('special-girl',step),actor=model.current(s);actor.mp=3;const shield=model.act(s,'active2').next,allies=shield.units.filter(u=>u.side==='ally');expect(allies.every(u=>!!u.moonGrace===(step>=20))).toBe(true)
 const target=allies.find(u=>u.id==='special-boy')!,enemy=shield.units.find(u=>u.side==='enemy')!;shield.order=[enemy.id,...allies.map(u=>u.id)];shield.cursor=0;enemy.atk=100;const hp=target.hp,bar=target.shield;const a=model.act(shield,'basic',target.id),next=a.next.units.find(u=>u.id===target.id)!
 if(step>=20){expect(a.hits[0].blocked).toEqual([0]);expect(next.hp).toBe(hp);expect(next.shield).toBe(bar+(step===30?Math.round(target.maxHp*.04):0));expect(next.moonGrace).toBeUndefined()}else expect(a.hits[0].blocked).toBeUndefined()
 const fresh=field('special-girl',step),caster=model.current(fresh),t=fresh.units.find(u=>u.id==='special-boy')!;grantGrace(caster,t);grantGrace(caster,t);if(step>=20){expect(t.moonGrace!.until).toBe(step===30?3:2);t.turns=t.moonGrace!.until;expireGrace(t);expect(t.moonGrace).toBeUndefined()}
 }
 const s=field('special-girl'),caster=model.current(s),t=s.units.find(u=>u.id==='special-boy')!;grantGrace(caster,t);t.statuses=[{type:'poison',turns:2,power:.04}];s.order=[caster.id,t.id,...s.units.filter(u=>![caster.id,t.id].includes(u.id)).map(u=>u.id)];s.cursor=0;const hp=t.hp,next=model.act(s,'basic',s.units.find(u=>u.side==='enemy')!.id).next.units.find(u=>u.id===t.id)!;expect(next.hp).toBeLessThan(hp);expect(next.moonGrace).toBeDefined()
})
test('rules7 active tickets remain bit-identical and can pay their original verified reward once',()=>{
 const {save,p,a}=setup(),profiles=Object.fromEntries(party.map(id=>[id,{name:id,level:50,training:{hp:20,atk:20,def:20}}])),t:ArenaTicket={id:crypto.randomUUID(),owner,stageId:'1-1',party,profiles,seed:11,rules:7,startedAt:now,expiresAt:now+3600000,moves:[],status:'active',costLimit:10};p.tickets[owner]=t;let s=old.createBattle(party,50,11,profiles,'1-1');expect(ticketBattle(t)).toEqual(s);const moves:Move[]=[]
 for(let n=0;n<100&&s.phase==='battle';n++){if(old.current(s).side==='enemy'){expect(enemyForRules(7,s)).toEqual(old.enemyAction(s));s=old.enemyAction(s).next}else{const move={skill:'basic',target:s.units.find(u=>u.side==='enemy'&&u.hp>0)!.id};expect(actForRules(7,s,move.skill,move.target)).toEqual(old.act(s,move.skill,move.target));moves.push(move);s=old.act(s,move.skill,move.target).next}}
 expect(s.phase).toBe('victory');expect(replay(t,moves)).toEqual(s);const enemy=old.enemies(50,1,'5-10')[0];expect(intentForRules(7,s,enemy)).toEqual(old.enemyIntent(s,enemy));arenaCommand(save,{type:'arena-complete',runId:t.id,moves},owner,now+10000);const paid=structuredClone(save);arenaCommand(save,{type:'arena-complete',runId:t.id,moves},owner,now+11000);expect(save).toEqual(paid);expect(a.cleared['1-1'].clears).toBe(1)
})
test('six field sprites have unique nonoverlapping slots at the shortest and full-height portrait scales',()=>{
 for(const y of [.45,1]){const slots=Array.from({length:6},(_,i)=>enemyLayout(i,6,i===0,y));for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){const a=slots[i],b=slots[j];expect(Math.abs(a.x-b.x)>64*Math.max(a.scale,b.scale)||Math.abs(a.y-b.y)>64*Math.max(a.scale,b.scale)+24).toBe(true)}expect(slots.every(s=>s.x>=230&&s.x<=340&&s.y>20&&s.y<465*y)).toBe(true)}
})

test('a multi-hit strike consumes only one grace and all-party shield gives independent charges',()=>{
 const s=field('special-girl',20);model.current(s).mp=3;const next=model.act(s,'active2').next,enemy=next.units.find(u=>u.side==='enemy')!,target=next.units.find(u=>u.id==='special-boy')!;enemy.monsterId='lava-knight';enemy.turns=1;enemy.atk=500;next.stageId='5-10';next.order=[enemy.id,...next.units.filter(u=>u.side==='ally').map(u=>u.id)];next.cursor=0;const a=model.act(next,'flurry',target.id);expect(a.hits[0].strikes).toHaveLength(2);expect(a.hits[0].blocked).toEqual([0]);expect(a.hits[0].strikes![1]).toBeGreaterThanOrEqual(0);expect(a.next.units.find(u=>u.id==='momo')!.moonGrace).toBeDefined()
 const area=model.act(next,'cataclysm');expect(area.hits.filter(h=>h.blocked?.includes(0))).toHaveLength(3);expect(area.hits.every(h=>h.damage===0)).toBe(true)
})

 test('all-enemy attacks apply damage to all six server-generated targets rather than a three-target slice',()=>{
 const s=model.createBattle(['special-boy','adv-aria'],50,17,undefined,'10-2');s.order=['adv-aria',...s.units.filter(u=>u.id!=='adv-aria').map(u=>u.id)];s.cursor=0;for(const u of s.units.filter(u=>u.side==='enemy')){u.hp=u.maxHp=100000;u.shield=0;u.dodge=0}
 const a=model.act(s,'active2');expect(a.targets).toHaveLength(6);expect(a.hits.filter(h=>h.damage>0)).toHaveLength(6);for(const hit of a.hits)expect(a.next.units.find(u=>u.id===hit.id)!.hp).toBe(100000-hit.damage);expect(a.next.totalDamage).toBe(a.hits.reduce((n,h)=>n+h.damage,0))
 })

test('each late chapter full-health party survives a single opening boss AoE despite the higher final ATK',()=>{
 for(let chapter=5;chapter<=14;chapter++){const stage=STAGES.find(s=>s.chapter===chapter&&s.boss)!,s=model.createBattle(party,35,17,undefined,stage.id),boss=model.enemies(stage.level,stage.waves.length,stage.id).find(u=>u.boss)!;s.units=s.units.filter(u=>u.side==='ally').concat(boss);s.order=[boss.id,...party];s.cursor=0;boss.turns=2;const a=model.act(s,'cataclysm');expect(a.hits).toHaveLength(3);expect(a.next.units.filter(u=>u.side==='ally').every(u=>u.hp>0)).toBe(true)}
})
