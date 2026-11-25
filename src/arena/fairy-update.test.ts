import {test,expect} from 'vitest'
import {freshWorld} from '../cloud/engine.ts'
import {grantSpecialFriends} from '../humans/model.ts'
import {parseSave} from '../game.ts'
import {arenaCommand,arenaAccount,arenaProgress} from './server.ts'
import {restoreParty} from './party-memory.ts'
import {ownedArenaRoster} from './integration.ts'
import {ENERGY_INTERVAL,energyDay,energySpend,energyView} from './energy.ts'
import {ENERGY_INTERVAL as priorInterval} from './legacy-v5/energy.ts'
import {STAGES as previousStages} from './legacy-v5/stages.ts'
import * as frozen from './legacy-v5/model.ts'
import {stageDifficulty as priorDifficulty} from './legacy-v5/balance.ts'
import {REGIONS,STAGES,stageById,stageUnlocked} from './stages.ts'
import {stageDifficulty} from './balance.ts'
import {createBattle,current,act,enemyAction,enemyIntent} from './model.ts'
import {replay,ticketBattle} from './replay.ts'
import type {ArenaTicket} from './state.ts'
import type {Move,State} from './types.ts'
const now=Date.parse('2026-11-25T03:00:00Z'),owner='11111111-1111-4111-8111-111111111111',party=['special-boy','special-girl','momo','bibi']
function fixture(){const save=freshWorld(now);grantSpecialFriends(save,now);const p=arenaProgress(save,now);p.season=2;p.sharedOwner=owner;const a=arenaAccount(p,owner,now);a.growth=Object.fromEntries(save.friends.map(f=>[f.id,{level:35,xp:7}]));return{save,p,a}}
function play(initial:State){let s=initial;const moves:Move[]=[];for(let n=0;n<700&&s.phase==='battle';n++){
 const actor=current(s);if(actor.side==='enemy'){s=enemyAction(s).next;continue}
 const allies=s.units.filter(u=>u.side==='ally'&&u.hp>0),weak=[...allies].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0],foes=s.units.filter(u=>u.side==='enemy'&&u.hp>0)
 let skill='basic',target=foes.find(u=>/치유|사제|드리아드|음유|예언/.test(u.name))?.id??foes[0].id
 if(actor.id==='special-girl'&&actor.mp>=1&&weak.hp/weak.maxHp<.85){skill='active1';target=weak.id}
 else if(actor.id==='special-boy'&&actor.mp>=1&&allies.some(u=>u.attackBuff<1.2)){skill='active1';target=allies[0].id}
 else if(!['special-boy','special-girl'].includes(actor.id)&&actor.mp>=1)skill=actor.mp>=3?'ultimate':'active1'
 moves.push({skill,target});s=act(s,skill,target).next
 }return{s,moves}}

test('energy is exactly twice as fast; carry-over fractions and full-cap behavior remain',()=>{
 expect(ENERGY_INTERVAL*2).toBe(priorInterval)
 const source={value:15,at:now,lastMidnight:energyDay(now)}
 expect(energyView(source,now+ENERGY_INTERVAL-1).value).toBe(15)
 expect(energyView(source,now+ENERGY_INTERVAL).value).toBe(16)
 const spent=energySpend(source,10,now+ENERGY_INTERVAL+40000)
 expect(spent.value).toBe(6);expect(energyView(spent,now+ENERGY_INTERVAL+40000).nextIn).toBe(ENERGY_INTERVAL-40000)
 expect(energyView({value:99,at:now},now+ENERGY_INTERVAL*4).value).toBe(100)
})
test('KST midnight fills once offline or online and spending never retriggers the same day',()=>{
 const before=Date.parse('2026-11-25T14:59:59Z'),midnight=before+1000
 expect(energyDay(before)).toBe('2026-11-25');expect(energyDay(midnight)).toBe('2026-11-26')
 const source={value:15,at:before,lastMidnight:'2026-11-25'}
 expect(energyView(source,before+999).value).toBe(15)
 expect(energyView(source,midnight).value).toBe(100)
 const spent=energySpend(source,25,midnight);expect(spent).toMatchObject({value:75,lastMidnight:'2026-11-26'})
 expect(energyView(spent,midnight+1).value).toBe(75)
 expect(energyView(spent,midnight+ENERGY_INTERVAL).value).toBe(76)
 expect(energyView(spent,midnight+86400000*8).value).toBe(100)
 expect(energyView({value:0,at:before},midnight+9*3600000).value).toBe(100)
 expect(source.value).toBe(15)
})
test('only successful official entry saves ordered party; abandon, invalid input and retries retain it',()=>{
 const{save,p,a}=fixture(),ids=['bibi','special-girl','momo','special-boy']
 arenaCommand(save,{type:'arena-start',stageId:'1-1',party:ids},owner,now,()=>7)
 expect(a.lastParty).toEqual({ids,owner,at:now})
 const stored=structuredClone(a.lastParty),ticket=p.tickets[owner]
 arenaCommand(save,{type:'arena-start',stageId:'1-1',party:ids},owner,now+1)
 expect(a.lastParty).toEqual(stored)
 arenaCommand(save,{type:'arena-abandon',runId:ticket.id},owner,now+2)
 expect(a.lastParty).toEqual(stored)
 expect(()=>arenaCommand(save,{type:'arena-start',stageId:'1-1',party:['missing']},owner,now+3)).toThrow()
 expect(a.lastParty).toEqual(stored)
 const restored=parseSave(JSON.stringify(save),now).world!.arena!.accounts![owner]
 const roster=ownedArenaRoster(save.friends.map(f=>({id:f.id,name:f.name,kind:f.kind,level:1})),restored)
 expect(restoreParty(roster,restored)).toEqual({ids,repaired:false})
})
test('party restoration removes unowned/duplicate members and repairs leaders/cost without editing cloud data',()=>{
 const{save,a}=fixture(),roster=ownedArenaRoster(save.friends.map(f=>({id:f.id,name:f.name,kind:f.kind,level:1})),a)
 a.lastParty={ids:['missing','coco','coco','bibi','momo'],owner,at:now};const before=structuredClone(a)
 const restored=restoreParty(roster,a)
 expect(restored.repaired).toBe(true);expect(restored.ids).not.toContain('missing')
 expect(new Set(restored.ids).size).toBe(restored.ids.length);expect(restored.ids).toContain('special-boy');expect(a).toEqual(before)
})
test('14 chapters have 125 unique stages, 10-stage ruins+ chapters and safe sequential unlocks',()=>{
 expect(REGIONS).toHaveLength(14);expect(STAGES).toHaveLength(125);expect(new Set(STAGES.map(s=>s.id)).size).toBe(125)
 for(const region of REGIONS.slice(3)){const stages=STAGES.filter(s=>s.region===region.id);expect(stages).toHaveLength(10);expect(stages[4].midBoss).toBe(true);expect(stages[4].boss).toBe(false);expect(stages[9].boss).toBe(true)}
 for(const region of REGIONS.slice(10)){const mid=STAGES.find(s=>s.region===region.id&&s.midBoss)!,boss=STAGES.find(s=>s.region===region.id&&s.boss)!;expect(mid.waves.at(-1)![0]).not.toBe(boss.waves.at(-1)![0])}
 const cleared:Record<string,unknown>={};for(const stage of STAGES){expect(stageUnlocked(stage.id,cleared),stage.id).toBe(true);cleared[stage.id]=true}
 expect(stageUnlocked('5-1',{'4-5':true})).toBe(false)
})
test('pre-expansion chapter access and every clear/reward/growth record survive without fabricated rewards',()=>{
 const{save,a,p}=fixture();a.cleared={'4-5':{firstAt:now,clears:4,firstRewarded:true,firstBonusGranted:true},'5-2':{firstAt:now,clears:2,firstRewarded:true}};delete a.layoutVersion;delete a.chapterAccess
 a.beasts['beast-lumi']={at:now,level:37,xp:30,stars:4,mastery:3,shards:61,duplicates:4}
 const before=structuredClone({friends:save.friends,cleared:a.cleared,beasts:a.beasts,coins:save.world!.coins,growth:a.growth})
 arenaAccount(p,owner,now)
 expect(a.chapterAccess).toBe(5);expect(stageUnlocked('5-1',a.cleared,a.chapterAccess)).toBe(true)
 expect({friends:save.friends,cleared:a.cleared,beasts:a.beasts,coins:save.world!.coins,growth:a.growth}).toEqual(before)
 expect(a.cleared['4-10']).toBeUndefined()
 for(const stage of STAGES)a.cleared[stage.id]??={firstAt:now,clears:1,firstRewarded:true}
 expect(Object.keys(parseSave(JSON.stringify(save),now).world!.arena!.accounts![owner].cleared)).toHaveLength(125)
})
test('existing IDs keep energy/coins while XP per energy rises; difficulty increases against frozen baseline',()=>{
 let efficiency=0,firstEfficiency=0;for(const stage of STAGES){expect(stage.repeat.xp/stage.energy).toBeGreaterThan(efficiency);efficiency=stage.repeat.xp/stage.energy;expect(stage.first.xp/stage.energy).toBeGreaterThan(firstEfficiency);firstEfficiency=stage.first.xp/stage.energy;expect(stage.first.xp).toBeGreaterThan(stage.repeat.xp)}
 for(const old of previousStages){const stage=stageById(old.id)!;expect(stage.energy).toBe(old.energy);expect(stage.repeat.coins).toBe(old.repeat.coins);expect(stage.first.coins).toBe(old.first.coins);expect(stageDifficulty(stage.index).hp).toBeGreaterThan(priorDifficulty(old.index).hp)}
})
test('an active rules5 battle replays byte-for-byte and receives its original XP/coin terms once',()=>{
 const{save,p,a}=fixture(),profiles=Object.fromEntries(party.map(id=>[id,{level:35,name:id}]))
 const t:ArenaTicket={id:crypto.randomUUID(),owner,stageId:'1-1',party,profiles,seed:7,rules:5,startedAt:now,expiresAt:now+3600000,moves:[],status:'active',costLimit:10};p.tickets[owner]=t
 let state=frozen.createBattle(party,1,7,profiles,'1-1'),moves:Move[]=[]
 expect(ticketBattle(t)).toEqual(state)
 for(let i=0;i<200&&state.phase==='battle';i++){if(frozen.current(state).side==='enemy')state=frozen.enemyAction(state).next;else{const move={skill:'basic',target:state.units.find(u=>u.side==='enemy'&&u.hp>0)!.id};moves.push(move);state=frozen.act(state,move.skill,move.target).next}}
 expect(state.phase).toBe('victory');expect(replay(t,moves)).toEqual(state)
 arenaCommand(save,{type:'arena-complete',runId:t.id,moves},owner,now+10000)
 expect(t.reward?.xp).toBe(previousStages[0].first.xp);const before=structuredClone(a)
 arenaCommand(save,{type:'arena-complete',runId:t.id,moves},owner,now+11000);expect(a).toEqual(before)
})
test('new XP goes to all participating growth types, uses the raised cap, and never grows ordinary friends',()=>{
 const{save,p,a}=fixture();a.beasts['beast-lumi']={at:now,level:35,xp:0,mastery:2,stars:3,shards:5,duplicates:1};a.adventurers={ 'adv-aria':{at:now,level:35,xp:0,shards:3,duplicates:0}}
 const ids=['special-boy','special-girl','beast-lumi','adv-aria'],before=structuredClone(save.friends)
 a.daily.xp['special-boy']=600
 arenaCommand(save,{type:'arena-start',stageId:'1-1',party:ids},owner,now,()=>7)
 const t=p.tickets[owner],{s,moves}=play(ticketBattle(t));expect(s.phase).toBe('victory')
 arenaCommand(save,{type:'arena-complete',runId:t.id,moves},owner,now+10000)
 expect(t.reward?.xp).toBe(stageById('1-1')!.first.xp)
 for(const id of ids)expect(a.daily.xp[id]).toBe((id==='special-boy'?600:0)+t.reward!.xp)
 expect(save.friends).toEqual(before)
 const paid=structuredClone(save);arenaCommand(save,{type:'arena-complete',runId:t.id,moves},owner,now+11000);expect(save).toEqual(paid)
})
test('final bosses telegraph guard then area attacks and trained five-person parties can clear every chapter',()=>{
 const ids=['special-boy','special-girl','beast-astra','beast-nebula','beast-phynix']
 const profiles=Object.fromEntries(ids.map(id=>[id,{name:id,level:50,mastery:5,stars:5,training:{hp:30,atk:30,def:30},skillLevels:{basic:10,active1:10,active2:10,ultimate:10}}]))
 for(const region of REGIONS){const stage=STAGES.find(s=>s.region===region.id&&s.boss)!,initial=createBattle(ids,50,7,profiles,stage.id,15)
  const{s}=play(initial);expect(s.phase,stage.id).toBe('victory')

 }
 const untrained=Object.fromEntries(ids.map(id=>[id,{name:id,level:50,stars:1}]))
 expect(play(createBattle(ids,50,7,untrained,'14-10',15)).s.phase).toBe('defeat')
 const bossState=createBattle(ids,50,7,profiles,'4-10',15);const enemy=bossState.units.find(u=>u.side==='enemy')!;enemy.boss=true;enemy.turns=1;expect(enemyIntent(bossState,enemy).id).toBe('guard');enemy.turns=2;expect(enemyIntent(bossState,enemy).id).toBe('sweep')
})

test('the existing server refresh settles midnight history once without a new polling endpoint',async()=>{
 const{applyCommand}=await import('../cloud/engine.ts'),{save,a}=fixture(),before=Date.parse('2026-11-25T14:59:59Z'),midnight=before+1000
 a.energy={value:15,at:before,lastMidnight:'2026-11-25'}
 const first=applyCommand(save,{}, {type:'refresh'},owner,midnight).save
 expect(first.world!.arena!.accounts![owner].energy).toMatchObject({value:100,lastMidnight:'2026-11-26'})
 const second=applyCommand(first,{}, {type:'refresh'},owner,midnight+1000).save
 expect(second.world!.arena!.accounts![owner].energy).toEqual(first.world!.arena!.accounts![owner].energy)
 expect(save.world!.arena!.accounts![owner].energy.value).toBe(15)
})
test('max-level friends, adventurers and fairies receive zero new XP',()=>{
 const{save,p,a}=fixture();a.growth!['special-boy']={level:50,xp:0};a.adventurers={'adv-aria':{at:now,level:50,xp:0,shards:0,duplicates:0}};a.beasts['beast-lumi']={at:now,level:50,xp:0,mastery:2,stars:3,shards:0,duplicates:0}
 const ids=['special-boy','adv-aria','beast-lumi']
 arenaCommand(save,{type:'arena-start',stageId:'1-1',party:ids},owner,now,()=>7)
 const t=p.tickets[owner],{s,moves}=play(ticketBattle(t));expect(s.phase).toBe('victory')
 arenaCommand(save,{type:'arena-complete',runId:t.id,moves},owner,now+10000)
 expect(t.reward!.xp).toBe(0);expect(a.daily.xp).toEqual({});expect(a.growth!['special-boy'].xp).toBe(0);expect(a.adventurers['adv-aria'].xp).toBe(0);expect(a.beasts['beast-lumi'].xp).toBe(0)
})
