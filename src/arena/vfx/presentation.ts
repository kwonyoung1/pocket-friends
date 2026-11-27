import type {Action,Hit} from '../types.ts'
export type Strike=Omit<Hit,'strikes'|'strikeCriticals'|'blocked'>&{index:number;blocked:boolean}
/** Exact resolved strikes, including zero/blocked hits and auxiliary heals. Never invent damage or hits. */
export function resolvedStrikes(action:Action):Strike[]{return action.hits.flatMap(h=>(h.strikes?.length?h.strikes:[h.damage]).map((damage,index)=>({...h,index,damage,critical:h.strikeCriticals?.[index]??h.critical,blocked:h.blocked?.includes(index)??false,heal:index===0?h.heal:0,shield:index===0?h.shield:0,break:index===0?h.break:false,counter:index===0?h.counter:0})))}
