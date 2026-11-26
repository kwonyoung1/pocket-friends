import * as v7 from './legacy-v7/model.ts'
import {stageById as stage7} from './legacy-v7/stages.ts'
import * as v6 from './legacy-v6/model.ts'
import {stageById as stage6} from './legacy-v6/stages.ts'
import * as v5 from './legacy-v5/model.ts'
import {stageById as stage5} from './legacy-v5/stages.ts'
import * as v4 from './legacy-v4/model.ts'
import {stageById as stage4} from './legacy-v4/stages.ts'
import * as legacy from './legacy/model.ts'
import * as v3 from './legacy-v3/model.ts'
import * as v2 from './legacy-v2/model.ts'
import {heroById} from './model.ts'
import {act,createBattle,current,enemyAction,enemyIntent} from './model.ts'
import {stageById} from './stages.ts'
import {ARENA_LIMITS,ARENA_RULES} from './state.ts'
import type {ArenaTicket} from './state.ts'
import type {Move,State,Definition,Unit} from './types.ts'
export function ticketBattle(ticket:ArenaTicket):State{const stage=ticket.rules<=4?stage4(ticket.stageId):ticket.rules===5?stage5(ticket.stageId):ticket.rules===6?stage6(ticket.stageId):ticket.rules===7?stage7(ticket.stageId):stageById(ticket.stageId);if(!stage||![1,2,3,4,5,6,7,ARENA_RULES].includes(ticket.rules))throw Error('전투 규칙이 업데이트됐어요. 새 전투로 시작해 주세요.');return ticket.rules===8?createBattle(ticket.party,stage.level,ticket.seed,ticket.profiles,ticket.stageId,ticket.costLimit??10):(ticket.rules===1?legacy.createBattle:ticket.rules===2?v2.createBattle:ticket.rules===3?v3.createBattle:ticket.rules===4?v4.createBattle:ticket.rules===5?v5.createBattle:ticket.rules===6?v6.createBattle:v7.createBattle)(ticket.party,stage.level,ticket.seed,ticket.profiles,ticket.stageId,...(ticket.rules>=4?[ticket.costLimit??10]:[]))}
export function enemyTurns(source:State,rules=ARENA_RULES){let s=source;for(let guard=0;s.phase==='battle'&&current(s).side==='enemy';guard++){if(guard>200)throw Error('전투 행동 제한을 초과했어요.');s=(rules===1?legacy.enemyAction:rules===2?v2.enemyAction:rules===3?v3.enemyAction:rules===4?v4.enemyAction:rules===5?v5.enemyAction:rules===6?v6.enemyAction:rules===7?v7.enemyAction:enemyAction)(s as never).next}return s}
export function replay(ticket:ArenaTicket,moves:readonly Move[]):State{
 if(moves.length>ARENA_LIMITS.moves)throw Error('전투 행동이 너무 많아요.');let s=ticketBattle(ticket)
 for(const move of moves){s=enemyTurns(s,ticket.rules);if(s.phase!=='battle')throw Error('끝난 전투 뒤에 행동을 추가할 수 없어요.');s=(ticket.rules===1?legacy.act:ticket.rules===2?v2.act:ticket.rules===3?v3.act:ticket.rules===4?v4.act:ticket.rules===5?v5.act:ticket.rules===6?v6.act:ticket.rules===7?v7.act:act)(s as never,move.skill,move.target).next}
 return enemyTurns(s,ticket.rules)
}
export const sameMove=(a:Move,b:Move)=>a.skill===b.skill&&a.target===b.target
export function extendsCheckpoint(ticket:ArenaTicket,moves:readonly Move[]){return ticket.moves.length<=moves.length&&ticket.moves.every((m,i)=>sameMove(m,moves[i]))}
export const actForRules=(rules:number,s:State,skill:string,target?:string)=>(rules===1?legacy.act:rules===2?v2.act:rules===3?v3.act:rules===4?v4.act:rules===5?v5.act:rules===6?v6.act:rules===7?v7.act:act)(s as never,skill,target)
export const enemyForRules=(rules:number,s:State)=>(rules===1?legacy.enemyAction:rules===2?v2.enemyAction:rules===3?v3.enemyAction:rules===4?v4.enemyAction:rules===5?v5.enemyAction:rules===6?v6.enemyAction:rules===7?v7.enemyAction:enemyAction)(s as never)

export const heroForRules=(rules:number,id:string,kind?:Parameters<typeof heroById>[1]):Definition=>(rules===1?legacy.heroById:rules===2?v2.heroById:rules===3?v3.heroById:rules===4?v4.heroById:rules===5?v5.heroById:rules===6?v6.heroById:rules===7?v7.heroById:heroById)(id,kind)

export const intentForRules=(rules:number,s:State,u:Unit)=>rules===6?v6.enemyIntent(s,u):rules===7?v7.enemyIntent(s,u):enemyIntent(s,u)
