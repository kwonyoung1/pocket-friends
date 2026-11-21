import {HEROES,bossBattle,createBattle,heroById,partyErrors} from './model'
import type {HeroId,Profiles} from './model'
/** Read-only entry snapshot. No mutable Save/Friend references or cloud commands cross this boundary. */
export type ArenaFriend={id:string;name:string;level:number}
export function arenaRoster(friends:readonly ArenaFriend[]):ArenaFriend[]{
 return HEROES.flatMap(h=>{const f=friends.find(f=>f.id===h.id);if(!f)return[];const level=Number.isFinite(f.level)?Math.max(1,Math.min(50,Math.floor(f.level))):1;return[{id:h.id,name:/^(남자아이|여자아이)$/.test(f.name)?h.name:f.name||h.name,level}]})
}
export function defaultParty(roster:readonly ArenaFriend[]){return roster.filter(f=>heroById(f.id).cost===2).slice(0,4).map(f=>f.id as HeroId)}
export function rosterBattle(ids:string[],roster:readonly ArenaFriend[],practiceLevel:number|null,boss=false){
 const errors=partyErrors(ids);if(errors.length)throw Error(errors[0]);if(ids.some(id=>!roster.some(f=>f.id===id)))throw Error('우리 집에 없는 친구는 편성할 수 없어요.')
 if(practiceLevel!==null&&(!Number.isInteger(practiceLevel)||practiceLevel<1||practiceLevel>50))throw Error('연습 레벨을 확인해 주세요.')
 const profiles:Profiles=Object.fromEntries(roster.map(f=>[f.id,{level:practiceLevel??f.level,name:f.name}]))
 const level=Math.max(1,Math.round(ids.reduce((sum,id)=>sum+profiles[id].level,0)/ids.length))
 return (boss?bossBattle:createBattle)(ids,level,20261121,profiles)
}
