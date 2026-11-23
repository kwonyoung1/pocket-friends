import * as legacy from './legacy/model.ts'
import {act,createBattle,current,enemyAction} from './model.ts'
import {stageById} from './stages.ts'
import {ARENA_LIMITS,ARENA_RULES} from './state.ts'
import type {ArenaTicket} from './state.ts'
import type {Move,State} from './types.ts'
export function ticketBattle(ticket:ArenaTicket):State{const stage=stageById(ticket.stageId);if(!stage||![1,ARENA_RULES].includes(ticket.rules))throw Error('전투 규칙이 업데이트됐어요. 새 전투로 시작해 주세요.');return (ticket.rules===1?legacy.createBattle:createBattle)(ticket.party,stage.level,ticket.seed,ticket.profiles,ticket.stageId)}
export function enemyTurns(source:State,rules=ARENA_RULES){let s=source;for(let guard=0;s.phase==='battle'&&current(s).side==='enemy';guard++){if(guard>200)throw Error('전투 행동 제한을 초과했어요.');s=(rules===1?legacy.enemyAction:enemyAction)(s).next}return s}
export function replay(ticket:ArenaTicket,moves:readonly Move[]):State{
 if(moves.length>ARENA_LIMITS.moves)throw Error('전투 행동이 너무 많아요.');let s=ticketBattle(ticket)
 for(const move of moves){s=enemyTurns(s,ticket.rules);if(s.phase!=='battle')throw Error('끝난 전투 뒤에 행동을 추가할 수 없어요.');s=(ticket.rules===1?legacy.act:act)(s,move.skill,move.target).next}
 return enemyTurns(s,ticket.rules)
}
export const sameMove=(a:Move,b:Move)=>a.skill===b.skill&&a.target===b.target
export function extendsCheckpoint(ticket:ArenaTicket,moves:readonly Move[]){return ticket.moves.length<=moves.length&&ticket.moves.every((m,i)=>sameMove(m,moves[i]))}
export const actForRules=(rules:number,s:State,skill:string,target?:string)=>(rules===1?legacy.act:act)(s,skill,target)
export const enemyForRules=(rules:number,s:State)=>(rules===1?legacy.enemyAction:enemyAction)(s)
