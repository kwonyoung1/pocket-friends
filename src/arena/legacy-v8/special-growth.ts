import {bounded} from './shop-state.ts'
import type {Training} from './shop-state.ts'
import type {Unit} from './types.ts'
export function specialGrowth(id:string,training?:Partial<Training>){
 const atk=bounded(training?.atk,30),def=bounded(training?.def,30),hp=bounded(training?.hp,30)
 return {legendaryReady:atk>=20&&def>=20&&hp>=20,echo:id==='special-boy'&&atk>=20?(atk>=30?.85:.7):0,grace:id==='special-girl'&&def>=20?(def>=30?3:2):0,rebound:id==='special-girl'&&def>=30?.04:0}
}
export function specialDescription(id:string,training?:Partial<Training>){
 const p=specialGrowth(id,training)
 if(id==='special-boy')return `쌍성의 일격 · ${p.echo?`활성: 직접 공격마다 추가 타격 ${Math.round(p.echo*100)}%`:`ATK +10 예고 · +20 해금(추가 70%) · +30 추가 85%`}${p.legendaryReady?' · 세 능력치 +20 달성':''}`
 if(id==='special-girl')return `달빛의 가호 · ${p.grace?`활성: 보호막 대상별 직접 피해 1회 차단 · ${p.grace}턴${p.rebound?' · 차단 후 HP 4% 보호막':''}`:'DEF +10 예고 · +20 해금(2턴) · +30 지속 3턴·보호막'}${p.legendaryReady?' · 세 능력치 +20 달성':''}`
 return ''
}
/** One charge, refreshed rather than stacked; duration counts recipient turns. */
export function grantGrace(actor:Unit,target:Unit){const p=specialGrowth(actor.heroId??'',actor.training);if(p.grace)target.moonGrace={until:target.turns+p.grace,rebound:p.rebound}}
export function expireGrace(u:Unit){if(u.moonGrace&&u.turns>=u.moonGrace.until)delete u.moonGrace}
