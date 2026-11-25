import {defaultParty} from './integration.ts'
import type {ArenaFriend} from './integration.ts'
import {partyErrors} from './model.ts'
import {costLimit} from './shop-state.ts'
import type {ArenaAccount} from './beast-state.ts'
export type LastParty={ids:string[];owner:string;at:number}
/** Keep order and owned IDs, repair only invalid entries and explain the repair in UI. */
export function restoreParty(roster:readonly ArenaFriend[],account?:ArenaAccount){
 const stored=account?.lastParty?.ids,profiles=Object.fromEntries(roster.map(f=>[f.id,{level:f.level,name:f.name,kind:f.kind}]))
 if(!stored)return {ids:defaultParty(roster),repaired:false}
 let ids=[...new Set(stored)].filter(id=>roster.some(f=>f.id===id)).slice(0,5)
 if(!ids.some(id=>['special-boy','special-girl'].includes(id))){const leader=roster.find(f=>['special-boy','special-girl'].includes(f.id));if(leader)ids=[leader.id,...ids.filter(id=>id!==leader.id)].slice(0,5)}
 while(ids.length>1&&partyErrors(ids,profiles,costLimit(account?.shop,ids,profiles,!!account?.commandRelic)).length)ids.pop()
 if(partyErrors(ids,profiles,costLimit(account?.shop,ids,profiles,!!account?.commandRelic)).length)ids=defaultParty(roster)
 return{ids,repaired:JSON.stringify(ids)!==JSON.stringify(stored)}
}
