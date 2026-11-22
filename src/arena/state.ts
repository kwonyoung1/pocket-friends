import type {Move,Profiles} from './types.ts'
export const ARENA_RULES=1
export const ARENA_LIMITS={moves:160,tickets:16,ticketMs:6*3600000,rewardedClears:5,coinsPerDay:120,xpPerFriendDay:100,maxCoins:1e12} as const
export type ArenaReward={coins:number;xp:number;stones:number;treasure?:string;first:boolean;capped:boolean}
export type ArenaTicket={id:string;owner:string;stageId:string;party:string[];profiles:Profiles;seed:number;rules:number;startedAt:number;expiresAt:number;moves:Move[];status:'active'|'claimed'|'abandoned';reward?:ArenaReward}
export type ArenaProgress={version:1;cleared:Record<string,{firstAt:number;clears:number;firstRewarded:boolean}>;tickets:Record<string,ArenaTicket>;daily:{day:string;coins:number;clears:number;xp:Record<string,number>}}
export type ArenaCommand={type:'arena-start';stageId:string;party:string[]}|{type:'arena-checkpoint'|'arena-complete';runId:string;moves:Move[]}|{type:'arena-abandon';runId:string}
/** Browser backup preservation only. Cloud import explicitly removes this untrusted subtree. */
export function restoreArena(value:unknown):ArenaProgress{
 const raw=JSON.stringify(value);if(raw.length>250000)throw Error('아레나 기록이 너무 커요.')
 const p=JSON.parse(raw) as ArenaProgress
 if(!p||p.version!==1||!p.cleared||!p.tickets||!p.daily||typeof p.daily.day!=='string'||!Number.isSafeInteger(p.daily.coins)||!Number.isSafeInteger(p.daily.clears)||!p.daily.xp)throw Error('아레나 기록 형식을 확인해 주세요.')
 let nodes=0;const scan=(x:unknown)=>{if(++nodes>12000)throw Error('아레나 기록이 너무 커요.');if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){if(['__proto__','constructor','prototype'].includes(k))throw Error('안전하지 않은 아레나 기록이에요.');scan(v)}};scan(p)
 if(Object.keys(p.cleared).length>100||Object.keys(p.tickets).length>16)throw Error('아레나 기록 범위를 확인해 주세요.')
 for(const c of Object.values(p.cleared))if(!Number.isFinite(c.firstAt)||!Number.isSafeInteger(c.clears)||c.clears<0||typeof c.firstRewarded!=='boolean')throw Error('아레나 클리어 기록을 확인해 주세요.')
 for(const t of Object.values(p.tickets))if(!t||typeof t.id!=='string'||typeof t.owner!=='string'||typeof t.stageId!=='string'||!Array.isArray(t.party)||t.party.length>4||!Array.isArray(t.moves)||t.moves.length>160||!['active','claimed','abandoned'].includes(t.status)||!t.profiles||!Number.isFinite(t.startedAt)||!Number.isFinite(t.expiresAt)||!Number.isInteger(t.seed))throw Error('아레나 전투 기록을 확인해 주세요.')
 return p
}
