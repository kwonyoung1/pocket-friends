import type {GearInstance} from './model.ts'
// Explicit target-level table. Costs are charged on both outcomes.
export const enhancementTable=[
 [100,100,0],[100,200,0],[100,300,0],[100,400,0],[100,500,0],
 [85,700,0],[80,1000,0],[70,1400,0],[60,1900,0],[50,2500,0],
 [45,3000,0],[42,4000,0],[39,5000,0],[35,6000,0],[32,7000,0],
 [29,9000,0],[26,11500,0],[23,14000,0],[20,17000,0],[15,20000,0],
 [12,25000,3],[11,32500,3],[10,40000,3],[9,50000,3],[8,60000,3],
 [6,75000,5],[5,90000,5],[4,105000,5],[3,120000,5],[2,150000,8],
].map(([chance,coins,stones],i)=>({target:i+1,chance,coins,stones,pity:i<10?0:i<20?2:i<29?1:.5}))
export const enhancementLevel=(i:GearInstance)=>i.enhancement??0
export function enhancementOffer(i:GearInstance){const level=enhancementLevel(i),row=enhancementTable[level];return row?{...row,failures:i.failures??0,finalChance:Math.min(100,row.chance+(i.failures??0)*row.pity)}:null}
const anchors=[[0,0],[5,.1],[10,.25],[15,.45],[20,.7],[25,1],[30,1.5]]
export function enhancementMultiplier(level:number){level=Math.max(0,Math.min(30,level));const end=anchors.findIndex(([n])=>n>=level);if(end===0)return 1;const [a,x]=anchors[end-1],[b,y]=anchors[end];return 1+x+(y-x)*(level-a)/(b-a)}
export const stoneDrops:Record<string,{chance:number;min:number;max:number}>={cave:{chance:.2,min:1,max:1},garden:{chance:.3,min:1,max:2},mine:{chance:.4,min:1,max:3},temple:{chance:.5,min:2,max:4},sanctuary:{chance:.6,min:3,max:6}}
export function drawStones(regionId:string,random:()=>number){const d=stoneDrops[regionId];return !d||random()>=d.chance?0:d.min+Math.floor(random()*(d.max-d.min+1))}
export const auraClass=(i:GearInstance)=>enhancementLevel(i)>=30?'enhance-gold':enhancementLevel(i)>=20?'enhance-purple':enhancementLevel(i)>=10?'enhance-blue':''
