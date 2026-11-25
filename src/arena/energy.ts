export const ENERGY_MAX=100,ENERGY_INTERVAL=6*60*1000
export type Energy={value:number;at:number;lastMidnight?:string}
export const energyDay=(now:number)=>new Date(now+9*3600000).toISOString().slice(0,10)
/** Lazy server settlement: the same midnight cannot replenish energy spent later that day. */
export function energyView(source:Energy|undefined,now:number){
 const day=energyDay(now),e=source??{value:ENERGY_MAX,at:now,lastMidnight:day}
 const midnight=day>(e.lastMidnight??energyDay(e.at))
 const elapsed=Math.max(0,now-e.at),ticks=Math.floor(elapsed/ENERGY_INTERVAL)
 const value=midnight?ENERGY_MAX:Math.min(ENERGY_MAX,e.value+ticks)
 const at=value===ENERGY_MAX?now:Math.min(now,e.at)+ticks*ENERGY_INTERVAL
 return {value,at,lastMidnight:midnight?day:e.lastMidnight??energyDay(e.at),nextIn:value===ENERGY_MAX?0:Math.max(0,ENERGY_INTERVAL-(now-at)),fullIn:value===ENERGY_MAX?0:Math.max(0,(ENERGY_MAX-value)*ENERGY_INTERVAL-(now-at))}
}
export function settleEnergy(source:Energy|undefined,now:number):Energy{const{value,at,lastMidnight}=energyView(source,now);return{value,at,lastMidnight}}
// Original per-stage consumption; expansion stages inherit their chapter's original cost.
export function stageEnergy(index:number){return index>=45?25:index>=40?22:index<10?10:index<20?12:index<30?15:index<35?18:20}
export function energySpend(source:Energy|undefined,amount:number,now:number):Energy{const e=settleEnergy(source,now);if(e.value<amount)throw Error(`별빛 에너지가 부족해요. 입장에 ${amount}이 필요해요.`);return{...e,value:e.value-amount}}
export function clockText(ms:number){const seconds=Math.ceil(Math.max(0,ms)/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
