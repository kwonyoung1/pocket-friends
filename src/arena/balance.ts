import {stageEnergy} from './energy.ts'
/** Runtime economy stays below existing expeditions: 6..120 repeat coins / 10..20 energy. */
export const REWARD_MULTIPLIERS=[1,1.5,2.5,4,6,9,13,20] as const
export function stageTerms(index:number,boss:boolean){const coins=Math.round(6*REWARD_MULTIPLIERS[Math.floor(index/5)]);return{energy:stageEnergy(index),repeat:{coins,xp:Math.min(36,3+Math.floor(index*.8))},first:{coins:coins*3,xp:Math.min(60,12+index),stones:boss?1:0,treasure:boss}}}
export function stageDifficulty(index:number){const p=index/39;return{hp:1+p*.9,atk:1+p*.7,def:1+p*.55,spd:Math.floor(p*6),toughness:Math.floor(p*3),shield:index>=20?.12:index>=10?.06:0,phase:index>=30}}
