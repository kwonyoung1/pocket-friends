import {test,expect} from 'vitest'
import {STAGES,EVENT_STAGES,MONSTERS,monsterById} from './legacy-v7/stages.ts'
import * as before from './legacy-v6/model.ts'
import {STAGES as oldStages} from './legacy-v6/stages.ts'
import * as model from './legacy-v7/model.ts'
import {pressureFor} from './enemy-pressure.ts'
import {hdMonster,monsterArtRow,monsterArtCell} from './monster-art.ts'
import {ticketBattle,replay,intentForRules} from './replay.ts'
import {arenaAccount,arenaCommand,arenaProgress} from './server.ts'
import {freshWorld} from '../cloud/engine.ts'
import {grantSpecialFriends} from '../humans/model.ts'
import type {ArenaTicket} from './state.ts'
import type {Move} from './types.ts'

test('one pressure pass on final rules6 stats, identical stage IDs, energy, rewards and early game',()=>{
 expect(STAGES).toEqual(oldStages)
 for(const stage of [...STAGES,...EVENT_STAGES])for(let wave=1;wave<=stage.waves.length;wave++){
 const old=before.enemies(stage.level,wave,stage.id),next=model.enemies(stage.level,wave,stage.id),p=pressureFor(stage.event?1:stage.chapter)
 expect(next.map(u=>u.id)).toEqual(old.map(u=>u.id))
 for(let i=0;i<old.length;i++)for(const [field,mult]of [['maxHp',p.hp],['atk',p.atk],['def',p.def]] as const)expect(next[i][field],stage.id+' '+field).toBe(Math.round(old[i][field]*mult))
 if(stage.chapter!<=4||stage.event)expect(next).toEqual(old)
 }
})
test('every late monster has a real atlas row including four upgraded middle-boss forms',()=>{
 const monsters=MONSTERS.filter(m=>hdMonster(m.region));expect(monsters).toHaveLength(26)
 for(const m of monsters){const row=monsterArtRow(m.region,m.row,m.id,m.rank==='boss');expect(row).toBeGreaterThanOrEqual(0);expect(row).toBeLessThan(5)}
 for(const region of ['garden','dream','skycastle','star-temple']){
 const mid=STAGES.find(s=>s.region===region&&s.midBoss)!,id=mid.waves[1][0],m=monsterById(id)!
 expect(monsterArtRow(region,m.row,id,true)).toBe(3);expect(monsterArtRow(region,3,'boss',true)).toBe(4)
 }
 expect([0,1,10,11,13,14,15,16].map(f=>monsterArtCell(f,true))).toEqual([0,1,2,2,2,2,3,3])
})
test('late elite doubles, boss dispels/telegraphs and a full-health team survives one AoE',()=>{
 let s=model.createBattle(['special-boy','special-girl','momo','bibi'],30,7,undefined,'5-10')
 const elite=s.units.find(u=>u.monsterId&&monsterById(u.monsterId)?.rank==='elite')!;elite.turns=1
 expect(model.enemyIntent(s,elite).id).toBe('flurry')
 const boss=model.enemies(30,3,'5-10')[0];s.units=s.units.filter(u=>u.side==='ally').concat(boss);s.order=[boss.id,...s.units.filter(u=>u.side==='ally').map(u=>u.id)];s.cursor=0
 boss.turns=2;expect(model.enemyIntent(s,boss).id).toBe('cataclysm')
 const action=model.enemyAction(s);expect(action.skill.target).toBe('all-enemies');expect(action.next.units.filter(u=>u.side==='ally').every(u=>u.hp>0)).toBe(true)
 boss.turns=3;expect(model.enemyIntent(s,boss).id).toBe('shatter');boss.hp=Math.floor(boss.maxHp*.4);expect(model.enemyIntent(s,boss).id).toBe('rampage')
})
test('rules6 runs replay exactly and pay original reward once without changing party, energy or beasts',()=>{
 const now=Date.parse('2026-11-25T03:00:00Z'),owner=crypto.randomUUID(),save=freshWorld(now);grantSpecialFriends(save,now)
 const p=arenaProgress(save,now);p.season=2;p.sharedOwner=owner;const account=arenaAccount(p,owner,now),ids=['special-boy','special-girl','momo','bibi'],profiles=Object.fromEntries(ids.map(id=>[id,{name:id,level:35}]))
 const ticket:ArenaTicket={id:crypto.randomUUID(),owner,stageId:'1-1',party:ids,profiles,seed:7,rules:6,startedAt:now,expiresAt:now+3600000,moves:[],status:'active',costLimit:10};p.tickets[owner]=ticket
 let s=before.createBattle(ids,35,7,profiles,'1-1'),moves:Move[]=[];expect(ticketBattle(ticket)).toEqual(s)
 for(let i=0;i<180&&s.phase==='battle';i++){if(before.current(s).side==='enemy')s=before.enemyAction(s).next;else{const m={skill:'basic',target:s.units.find(u=>u.side==='enemy'&&u.hp>0)!.id};moves.push(m);s=before.act(s,m.skill,m.target).next}}
 expect(s.phase).toBe('victory');expect(replay(ticket,moves)).toEqual(s)
 account.lastParty={ids:[...ids],owner,at:now}
 const retained=structuredClone({energy:account.energy,lastParty:account.lastParty,beasts:account.beasts,friends:save.friends})
 arenaCommand(save,{type:'arena-complete',runId:ticket.id,moves},owner,now+10000)
 expect(ticket.reward?.xp).toBe(oldStages[0].first.xp);expect({energy:account.energy,lastParty:account.lastParty,beasts:account.beasts,friends:save.friends}).toEqual(retained)
 const paid=structuredClone(save);arenaCommand(save,{type:'arena-complete',runId:ticket.id,moves},owner,now+11000);expect(save).toEqual(paid)
})

test('rarity benchmark: Lv30 legendary/mythic teams clear chapter5 while chapter6 requires growth',async()=>{
 const {battlePolicy}=await import('../../scripts/arena-benchmark-policy.ts')
 const parties=[['special-boy','special-girl','beast-astra','beast-nebula'],['special-boy','beast-seraphia','beast-nebula']]
 for(const ids of parties)for(const stage of STAGES.filter(s=>s.chapter===5))for(const seed of [17,7936,15855]){
 const profiles=Object.fromEntries(ids.map(id=>[id,{name:id,level:30,stars:id==='beast-nebula'?3:1}]))
 let s=model.createBattle(ids,30,seed,profiles,stage.id)
 for(let n=0;n<1500&&s.phase==='battle';n++){if(model.current(s).side==='enemy')s=model.enemyAction(s).next;else{const move=battlePolicy(model,s);s=model.act(s,move.skill,move.target).next}}
 expect(s.phase,ids.join('+')+' '+stage.id+' seed '+seed).toBe('victory')
 }
})

test('old tickets keep their matching intent preview as well as the old damage engine',()=>{const s=before.createBattle(['special-boy','special-girl','momo','bibi'],30,7,undefined,'5-10'),boss=before.enemies(30,3,'5-10')[0];boss.turns=2;expect(intentForRules(6,s,boss)).toEqual(before.enemyIntent(s,boss));expect(intentForRules(7,s,boss).id).toBe('cataclysm');expect(intentForRules(6,s,boss).id).toBe('sweep')})
