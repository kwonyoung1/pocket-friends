import {stageEnergy} from './energy.ts'
/** Preserve the original forty stages; later regions increase coin/energy efficiency under the shared daily cap. */
export const REWARD_MULTIPLIERS=[1,1.5,2.5,4,6,9,13,20] as const
export function stageTerms(index:number,boss:boolean){const coins=index>=40?[180,200,220,240,270,330,360,390,430,500][index-40]:Math.round(6*REWARD_MULTIPLIERS[Math.floor(index/5)]);return{energy:stageEnergy(index),repeat:{coins,xp:Math.min(180,30+index*4)},first:{coins:coins*3,xp:Math.min(240,60+index*6),stones:boss?1:0,treasure:boss}}}
export function stageDifficulty(index:number){if(index>=40){const p=(index-40)/9;return{hp:2.1+p*.9,atk:1.85+p*.6,def:1.7+p*.6,spd:7+Math.floor(p*4),toughness:4+Math.floor(p*3),shield:.18+p*.07,phase:true}}const p=index/39;return{hp:1+p*.9,atk:1+p*.7,def:1+p*.55,spd:Math.floor(p*6),toughness:Math.floor(p*3),shield:index>=20?.12:index>=10?.06:0,phase:index>=30}}
