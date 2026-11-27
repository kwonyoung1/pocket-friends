import {test,expect} from 'vitest'
import * as model from './model.ts'
import * as v8 from './legacy-v8/model.ts'
import {BEASTS} from './beasts.ts'
import {ADVENTURERS} from './adventurers.ts'
import {auditCast,AUDIT_SCENARIOS} from './skill-audit.ts'
import {actForRules,enemyForRules,ticketBattle,replay} from './replay.ts'
import {upgradedSkill} from './skill-upgrades.ts'
import {skillSummary,supportSkill} from './targeting.ts'
import {freshWorld} from '../cloud/engine.ts'
import {grantSpecialFriends} from '../humans/model.ts'
import {arenaProgress,arenaAccount,arenaCommand} from './server.ts'
import type {ArenaTicket} from './state.ts'
import type {Move} from './types.ts'
const heroes=[...model.HEROES,...BEASTS,...ADVENTURERS]
for(const h of heroes)test(`${h.id} keeps identity/cost/hits and no mean primary damage inversion at +0/+5/+10`,()=>{
 const old=v8.heroById(h.id);expect([h.name,h.kind,h.element,h.hp,h.atk,h.def,h.spd,h.cost]).toEqual([old.name,old.kind,old.element,old.hp,old.atk,old.def,old.spd,old.cost]);expect(h.skills.map(k=>[k.id,k.name,k.unlock,k.cost,k.hits,k.target,k.targetCount])).toEqual(old.skills.map(k=>[k.id,k.name,k.unlock,k.cost,k.hits,k.target,k.targetCount]))
 for(const upgrade of [0,5,10])for(const scenario of AUDIT_SCENARIOS){const scores=h.skills.slice(1).map(k=>Array.from({length:32},(_,i)=>auditCast(model,h.id,k.id,upgrade,17+i*7919,scenario).primary).reduce((a,b)=>a+b,0));for(let i=1;i<3;i++)if(!supportSkill(h.skills[i])&&!supportSkill(h.skills[i+1]))expect(scores[i],`${scenario.id} +${upgrade} skill${i}`).toBeGreaterThanOrEqual(scores[i-1])}
})
test('Nebula +5 real damage sums all strikes and has meaningful upper-tier burst',()=>{const r=['active1','active2','ultimate'].map(k=>auditCast(model,'beast-nebula',k,5,17));expect(r.map(r=>r.hits)).toEqual([2,1,3]);expect(r.map(r=>r.cost)).toEqual([1,2,3]);for(const a of r)expect(a.damage).toBe(a.strikes.flatMap(h=>h.values).reduce((x,y)=>x+y,0));expect(r[1].damage/r[0].damage).toBeGreaterThan(1.35);expect(r[1].damage/r[0].damage).toBeLessThan(1.6);expect(r[2].damage/r[1].damage).toBeGreaterThan(1.6);expect(r[2].damage/r[1].damage).toBeLessThan(2)})
test('upgrade is applied once per native/extra strike and UI separates coefficient totals',()=>{const k=model.heroById('beast-nebula').skills[1],n=upgradedSkill(k,5);expect(n.power).toBeCloseTo(k.power*1.15);expect(skillSummary(n)).toContain('총 계수 264.5%');expect(skillSummary(n)).toContain('강화 +5');for(const step of [0,20,30]){const a=auditCast(model,'special-boy','active2',5,17,AUDIT_SCENARIOS[0],step);expect(a.strikes[0].values).toHaveLength(step?4:2)}expect(skillSummary(model.heroById('special-boy').skills[2],.7)).toContain('추가')})
test('rules8 active ticket replays its original engine and grants the original reward once',()=>{
 const now=Date.parse('2026-11-27T03:00:00Z'),owner=crypto.randomUUID(),save=freshWorld(now);grantSpecialFriends(save,now);const p=arenaProgress(save,now);p.season=2;const a=arenaAccount(p,owner,now),party=['special-boy','special-girl','momo'],profiles=Object.fromEntries(party.map(id=>[id,{name:id,level:50,training:{hp:20,atk:20,def:20}}])),ticket:ArenaTicket={id:crypto.randomUUID(),owner,stageId:'1-1',party,profiles,seed:11,rules:8,startedAt:now,expiresAt:now+3600000,moves:[],status:'active',costLimit:10};p.tickets[owner]=ticket;let s=v8.createBattle(party,50,11,profiles,'1-1');expect(ticketBattle(ticket)).toEqual(s);const moves:Move[]=[]
 for(let n=0;n<100&&s.phase==='battle';n++){if(v8.current(s).side==='enemy'){expect(enemyForRules(8,s)).toEqual(v8.enemyAction(s));s=v8.enemyAction(s).next}else{const move={skill:'basic',target:s.units.find(u=>u.side==='enemy'&&u.hp>0)!.id};expect(actForRules(8,s,move.skill,move.target)).toEqual(v8.act(s,move.skill,move.target));moves.push(move);s=v8.act(s,move.skill,move.target).next}}
 expect(s.phase).toBe('victory');expect(replay(ticket,moves)).toEqual(s);arenaCommand(save,{type:'arena-complete',runId:ticket.id,moves},owner,now+10000);const paid=structuredClone(save);arenaCommand(save,{type:'arena-complete',runId:ticket.id,moves},owner,now+11000);expect(save).toEqual(paid);expect(a.cleared['1-1'].clears).toBe(1)
})
