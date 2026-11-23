export const ENERGY_MAX=100,ENERGY_INTERVAL=12*60*1000
export type Energy={value:number;at:number}
export function energyView(source:Energy|undefined,now:number){const e=source??{value:ENERGY_MAX,at:now},elapsed=Math.max(0,now-e.at),ticks=Math.floor(elapsed/ENERGY_INTERVAL),value=Math.min(ENERGY_MAX,e.value+ticks),at=value===ENERGY_MAX?now:e.at+ticks*ENERGY_INTERVAL;return{value,at,nextIn:value===ENERGY_MAX?0:Math.max(0,ENERGY_INTERVAL-(now-at)),fullIn:value===ENERGY_MAX?0:Math.max(0,(ENERGY_MAX-value)*ENERGY_INTERVAL-(now-at))}}
export function stageEnergy(index:number){return index>=45?25:index>=40?22:index<10?10:index<20?12:index<30?15:index<35?18:20}
export function energySpend(source:Energy|undefined,amount:number,now:number):Energy{const e=energyView(source,now);if(e.value<amount)throw Error(`별빛 에너지가 부족해요. 입장에 ${amount}이 필요해요.`);return{value:e.value-amount,at:e.at}}
export function clockText(ms:number){const m=Math.ceil(ms/60000);return m>=60?`${Math.floor(m/60)}시간 ${m%60}분`:`${m}분`}
