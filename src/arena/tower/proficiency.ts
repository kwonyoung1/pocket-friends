import {count} from './state.ts'
export const PROFICIENCY_RATES={atk:20n,def:15n,hp:25n} as const
export const proficiencyLevel=(xp='0')=>(count(xp)/1000n).toString()
export function proficiencyPercent(level:string,stat:keyof typeof PROFICIENCY_RATES){const n=count(level)*PROFICIENCY_RATES[stat];const fraction=(n%1000n).toString().padStart(3,'0').replace(/0+$/,'');return (n/1000n).toString()+(fraction?'.'+fraction:'')+'%'}
export type FiniteStats={hp:number;atk:number;def:number;statScale?:number}
/** Values carry their decimal scale, rather than capping the persistent growth bonus. */
export function representStats(exact:{hp:bigint;atk:bigint;def:bigint}):FiniteStats{const scale=Math.max(0,...Object.values(exact).map(n=>n.toString().length-100)),div=10n**BigInt(scale);return{hp:Math.max(1,Number(exact.hp/div)),atk:Math.max(1,Number(exact.atk/div)),def:Math.max(1,Number(exact.def/div)),...(scale?{statScale:scale}:{})}}
export function addProficiency(base:FiniteStats,intrinsic:FiniteStats,xp='0'):FiniteStats{const level=count(xp)/1000n;if(level===0n)return base;const exact=Object.fromEntries((['hp','atk','def'] as const).map(stat=>[stat,BigInt(base[stat])+BigInt(intrinsic[stat])*level*PROFICIENCY_RATES[stat]/100000n])) as {hp:bigint;atk:bigint;def:bigint};return representStats(exact)}
export function alignStats(items:FiniteStats[]){const scale=Math.max(0,...items.map(x=>x.statScale??0));return{scale,values:items.map(x=>{const divisor=10**Math.min(324,scale-(x.statScale??0));return{hp:Math.max(1,Math.round(x.hp/divisor)),atk:Math.max(1,Math.round(x.atk/divisor)),def:Math.max(1,Math.round(x.def/divisor))}})}}

export function formatBattleStat(value:number,scale=0){if(!scale)return value>=1e9?value.toExponential(3):value.toLocaleString('ko-KR');const [digits,exponent]=value.toExponential(3).split('e');return digits+'e+'+(Number(exponent)+scale)}
