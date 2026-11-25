import {stageTerms as originalTerms,stageDifficulty as originalDifficulty} from './legacy-v5/balance.ts'
export {REWARD_MULTIPLIERS} from './legacy-v5/balance.ts'
/** Currency/entry costs of existing IDs are unchanged; XP efficiency increases along the expanded path. */
export function stageTerms(index:number,boss:boolean,originalIndex=Math.min(index,49)){
 const old=originalTerms(originalIndex,boss),xp=Math.round(old.energy*(4.5+Math.min(index,14)*.7+Math.max(0,index-14)*.12))
 return{energy:old.energy,repeat:{coins:old.repeat.coins,xp},first:{...old.first,xp:Math.round(xp*1.35+old.energy*3)}}
}
export function stageDifficulty(index:number){
 const chapter=index<15?Math.floor(index/5):3+Math.floor((index-15)/10),part=index<15?index%5:(index-15)%10
 const old=originalDifficulty(Math.min(49,chapter*5+Math.min(part,4)))
 const factor=chapter===0?1.08:chapter<3?1.3:Math.min(2.2,1.5+(chapter-3)*.035)+Math.max(0,part-4)*.025
 return{hp:old.hp*factor,atk:old.atk*factor,def:old.def*factor,spd:old.spd+(chapter>=3?2:0),toughness:old.toughness+(chapter>=3?1:0),shield:Math.min(.28,old.shield+(chapter>=3?.03:0)),phase:old.phase||chapter>=3}
}
