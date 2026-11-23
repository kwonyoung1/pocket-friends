import {beastById} from './beasts.ts'
import type {ArenaAccount} from './beast-state.ts'
import {bossBattle,createBattle,practiceBossBattle,heroById,partyErrors} from './model.ts'
import type {Kind} from '../game.ts'
import type {Profiles} from './types.ts'
/** A read-only snapshot of actual owned friends, never an economy or writable Save reference. */
export type ArenaFriend={id:string;name:string;level:number;kind?:Kind;mastery?:number;gear?:number;stars?:number;training?:import('./shop-state.ts').Training;skillLevels?:Partial<Record<string,number>>}
export function arenaRoster(friends:readonly ArenaFriend[]):ArenaFriend[]{
 return friends.flatMap(f=>{const h=heroById(f.id,f.kind);if(!h)return[];return[{id:f.id,name:/^(남자아이|여자아이)$/.test(f.name)?h.name:f.name||h.name,level:Number.isFinite(f.level)?Math.max(1,Math.min(50,Math.floor(f.level))):1,kind:h.kind,mastery:f.mastery,gear:f.gear,stars:f.stars,training:f.training,skillLevels:f.skillLevels}]}).sort((a,b)=>Number(b.id.startsWith('special-'))-Number(a.id.startsWith('special-')))
}
export function defaultParty(roster:readonly ArenaFriend[]){const leader=roster.find(f=>f.id==='special-boy'||f.id==='special-girl');return [...(leader?[leader]:[]),...roster.filter(f=>f!==leader&&heroById(f.id,f.kind).cost===2)].slice(0,5).map(f=>f.id)}
export function rosterBattle(ids:string[],roster:readonly ArenaFriend[],practiceLevel:number|null,boss=false,stageId?:string,costLimit=10){
 const profiles:Profiles=Object.fromEntries(roster.map(f=>[f.id,{level:practiceLevel??f.level,name:f.name,kind:f.kind,mastery:f.mastery,gear:f.gear,stars:f.stars,training:f.training,skillLevels:f.skillLevels}]))
 const errors=partyErrors(ids,profiles,costLimit);if(errors.length)throw Error(errors[0]);if(ids.some(id=>!roster.some(f=>f.id===id)))throw Error('우리 집에 없는 친구는 편성할 수 없어요.')
 if(practiceLevel!==null&&(!Number.isInteger(practiceLevel)||practiceLevel<1||practiceLevel>50))throw Error('연습 레벨을 확인해 주세요.')
 const level=Math.max(1,Math.round(ids.reduce((sum,id)=>sum+profiles[id].level,0)/ids.length))
 if(stageId)return (boss?practiceBossBattle:createBattle)(ids,level,20261121,profiles,stageId,costLimit)
 return boss?bossBattle(ids,level,20261121,profiles,costLimit):createBattle(ids,level,20261121,profiles,undefined,costLimit)
}

export function ownedArenaRoster(friends:readonly ArenaFriend[],account?:ArenaAccount){return arenaRoster([...friends.map(f=>({...f,training:account?.shop?.training[f.id],skillLevels:account?.shop?.skills[f.id]})),...Object.entries(account?.beasts??{}).flatMap(([id,b])=>{const h=beastById(id);return h?[{id,name:h.name,level:b.level,mastery:b.mastery,stars:b.stars??1,training:account?.shop?.training[id],skillLevels:account?.shop?.skills[id]}]:[]})])}
