export const COMBO_MS=3000
export const LEGACY_TIME_RATES=[1,1.25,1.5,1.8,2.1,2.5,3] as const
export const RULE5_TIME_RATES=[1.5,2,2.7,3.5,4.5,6,8] as const
export const TIME_RATES=[1.5,2,2.7,3.5,4.5,6,8,9.5,11,12.5,14,16] as const
export const timeRates=(version=6)=>version===4?LEGACY_TIME_RATES:version===5?RULE5_TIME_RATES:TIME_RATES
export const rewardRules={scoreUnit:500,combo:[[50,6],[40,5],[30,4],[20,3],[15,2.2],[10,1.7],[5,1.3],[1,1]] as const,duration:[[90,800],[60,450],[45,250],[30,120],[20,60],[10,20]] as const}
export function rewardFor(score:number,combo:number,longestMs:number,version=5){const base=Math.floor(Math.max(0,score)/(version===4?250:rewardRules.scoreUnit)),factor=rewardRules.combo.find(([n])=>combo>=n)?.[1]??1,maintenance=rewardRules.duration.find(([s])=>longestMs>=s*1000)?.[1]??0,comboBonus=Math.floor(base*Math.round(factor*10)/10)-base;return {base,factor,comboBonus,maintenance,coins:base+comboBonus+maintenance}}
export const comboCheer=(n:number)=>n>=20?'GODLIKE!':n>=15?'LEGENDARY!':n>=10?'UNSTOPPABLE!':n>=7?'FANTASTIC!':n>=5?'AMAZING!':n>=3?'GREAT!':'COMBO!'
