import type {Friend,Point} from '../game.ts'
import {cells} from '../navigation.ts'

export const quietMovement={minRest:15000,maxRest:30000,longRestMin:30000,longRestMax:60000,speed:.8,maxMoving:2,startGap:1800} as const
const history=new WeakMap<Friend,{previous?:Point;speed:number}>()
export function restDuration(random=Math.random){return random()<.18?30000+random()*30000:15000+random()*15000}
export function nearbyDestination(f:Friend,random=Math.random,peers:Friend[]=[]){
 const old=history.get(f)?.previous,long=random()<.18,max=long?300:160
 const choices=cells.filter(p=>{const d=Math.hypot(p.x-f.x,p.y-f.y);return d>=55&&d<=max&&peers.every(other=>other===f||other.growth?.awayJobId||Math.hypot(p.x-other.x,p.y-other.y)>=55)&&(!old||Math.hypot(p.x-old.x,p.y-old.y)>55)})
 const target=choices[Math.floor(random()*choices.length)]
 if(target){const state=history.get(f)??{speed:0};state.previous={x:f.x,y:f.y};history.set(f,state)}
 return target
}
/** Visual travel state stays out of saved gameplay data and server rewards. */
export function travelStep(f:Friend,dt:number,remaining:number,ending:boolean){
 const state=history.get(f)??{speed:0};history.set(f,state)
 const desired=(f.kind==='bear'?29:f.kind==='fox'?42:35)*quietMovement.speed*(ending?Math.max(.22,Math.min(1,remaining/30)):1)
 state.speed+=(desired-state.speed)*(1-Math.exp(-Math.max(0,dt)*6))
 return state.speed*Math.max(0,dt)
}
export function stopTravel(f:Friend){const state=history.get(f);if(state)state.speed=0}
const gates=new WeakMap<Friend[],number>()
export function mayStart(friends:Friend[],now:number){return now>=(gates.get(friends)??0)}
export function started(friends:Friend[],now:number){gates.set(friends,now+quietMovement.startGap)}
