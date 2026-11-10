import type {Friend,Memory} from '../game'
import {items} from '../progression/config'
/** Presentation reads confirmed existing messages and active reaction timestamps.
 * No new fields, inferred rewards, inventory writes or optimistic effects. */
export function activityItem(f:Friend,memories:Memory[],notice:string,now:number){
 const food=(f.eatingUntil??0)>now,play=(f.furnitureUntil??0)>now&&f.furnitureActivity==='신나는 놀이'
 if(!food&&!play)return undefined
 const lines=[notice,...memories.filter(m=>now>=m.at&&now-m.at<2500).map(m=>m.text)]
 return items.find(item=>(food?item.category==='food':item.category==='toy')&&lines.some(line=>line===`${f.name}와 ${item.name}을 ${food?'먹었어요':'가지고 놀았어요'}!`||food&&line.startsWith(`일괄 ${item.name} 먹이주기`)))
}
