export const COMBO_MS=3000
export const TIME_RATES=[1,1.25,1.5,1.8,2.1,2.5,3] as const
export const rewardRules={scoreUnit:250,combo:[[50,6],[40,5],[30,4],[20,3],[15,2.2],[10,1.7],[5,1.3],[1,1]] as const,duration:[[90,800],[60,450],[45,250],[30,120],[20,60],[10,20]] as const}
export function rewardFor(score:number,combo:number,longestMs:number){const base=Math.floor(Math.max(0,score)/rewardRules.scoreUnit),factor=rewardRules.combo.find(([n])=>combo>=n)?.[1]??1,maintenance=rewardRules.duration.find(([s])=>longestMs>=s*1000)?.[1]??0,comboBonus=Math.floor(base*Math.round(factor*10)/10)-base;return {base,factor,comboBonus,maintenance,coins:base+comboBonus+maintenance}}
export const comboCheer=(n:number)=>n>=20?'GODLIKE!':n>=15?'LEGENDARY!':n>=10?'UNSTOPPABLE!':n>=7?'FANTASTIC!':n>=5?'AMAZING!':n>=3?'GREAT!':'COMBO!'
