import type {Move,Profiles} from './types.ts'
export const ARENA_RULES=8
export const ARENA_LIMITS={moves:160,tickets:16,ticketMs:6*3600000,rewardedClears:5,coinsPerDay:120,xpPerFriendDay:100,seasonXpPerDay:16000,maxCoins:1e12} as const
export type ArenaReward={coins:number;xp:number;stones:number;treasure?:string;first:boolean;capped:boolean;chests?:Partial<Record<import('./beast-state.ts').ChestId,number>>}
export type ArenaTicket={id:string;owner:string;stageId:string;party:string[];profiles:Profiles;seed:number;rules:number;startedAt:number;expiresAt:number;moves:Move[];status:'active'|'claimed'|'abandoned';reward?:ArenaReward;energyCost?:number;costLimit?:number}
export type ArenaProgress={version:1;legacyCleared?:Record<string,Record<string,import('./beast-state.ts').ClearRecord>>;season?:2;season1Archive?:import('./season2.ts').SeasonArchive;seasonReport?:{at:number;counts:import('./season2.ts').SeasonArchive['counts']};sharedOwner?:string;links?:Record<string,string>;accounts?:Record<string,import('./beast-state.ts').ArenaAccount>;cleared:Record<string,{firstAt:number;clears:number;firstRewarded:boolean;firstBonusGranted?:boolean}>;tickets:Record<string,ArenaTicket>;daily:{day:string;coins:number;clears:number;xp:Record<string,number>}}
export type ArenaCommand=import('./shop-state.ts').ShopCommand|{type:'arena-fuse';beastId:string;fromStars:number}|{type:'arena-share'}|{type:'arena-season-start'}|{type:'arena-adventurer-train';adventurerId:string}|{type:'arena-select';accountId:string;previousOwner:string}|{type:'arena-start';stageId:string;party:string[]}|{type:'arena-checkpoint'|'arena-complete';runId:string;moves:Move[]}|{type:'arena-abandon';runId:string}|{type:'arena-open';chest:import('./beast-state.ts').ChestId;nonce:number}|{type:'arena-link';accountId:string;secret:string}|{type:'arena-train';beastId:string;training:'xp'|'mastery'}
/** Browser backup preservation only. Cloud import explicitly removes this untrusted subtree. */
export function restoreArena(value:unknown):ArenaProgress{
 const raw=JSON.stringify(value);if(raw.length>1000000)throw Error('아레나 기록이 너무 커요.')
 const p=JSON.parse(raw) as ArenaProgress
 if(!p||p.version!==1||!p.cleared||!p.tickets||!p.daily||typeof p.daily.day!=='string'||!Number.isSafeInteger(p.daily.coins)||!Number.isSafeInteger(p.daily.clears)||!p.daily.xp)throw Error('아레나 기록 형식을 확인해 주세요.')
 if(p.sharedOwner&&(!p.accounts?.[p.sharedOwner]||!/^[0-9a-f-]{36}$/i.test(p.sharedOwner)))throw Error('공유 아레나 기록을 확인해 주세요.');
 let nodes=0;const scan=(x:unknown)=>{if(++nodes>50000)throw Error('아레나 기록이 너무 커요.');if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){if(['__proto__','constructor','prototype'].includes(k))throw Error('안전하지 않은 아레나 기록이에요.');scan(v)}};scan(p)
 if(Object.keys(p.cleared).length>200||Object.keys(p.tickets).length>16)throw Error('아레나 기록 범위를 확인해 주세요.')
 for(const c of Object.values(p.cleared))if(!Number.isFinite(c.firstAt)||!Number.isSafeInteger(c.clears)||c.clears<0||typeof c.firstRewarded!=='boolean')throw Error('아레나 클리어 기록을 확인해 주세요.')
 for(const t of Object.values(p.tickets))if(!t||typeof t.id!=='string'||typeof t.owner!=='string'||typeof t.stageId!=='string'||!Array.isArray(t.party)||t.party.length>5||!Array.isArray(t.moves)||t.moves.length>160||!['active','claimed','abandoned'].includes(t.status)||!t.profiles||!Number.isFinite(t.startedAt)||!Number.isFinite(t.expiresAt)||!Number.isInteger(t.seed))throw Error('아레나 전투 기록을 확인해 주세요.')
 if(p.accounts&&Object.keys(p.accounts).length>32)throw Error('아레나 계정 기록 범위를 확인해 주세요.');
 if(p.links&&Object.keys(p.links).length>256)throw Error('아레나 연결 기록 범위를 확인해 주세요.');
 const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
 for(const a of Object.values(p.accounts??{})){if(!a.energy||!integer(a.energy.value,0,100)||!Number.isFinite(a.energy.at)||!a.cleared||Object.keys(a.cleared).length>200||!a.beasts||Object.keys(a.beasts).length>8||!a.chests||Object.keys(a.chests).length>7||!integer(a.opens,0,Number.MAX_SAFE_INTEGER)||!a.pity||!integer(a.pity.legendary,0,40)||!integer(a.pity.mythic,0,300)||!a.daily||typeof a.daily.day!=='string'||!a.daily.xp)throw Error('요정·에너지 기록을 확인해 주세요.');for(const b of Object.values(a.beasts))if(!integer(b.level,1,50)||!integer(b.xp,0,100000)||!integer(b.mastery,0,5)||!integer(b.shards,0,999999)||!integer(b.duplicates,0,Number.MAX_SAFE_INTEGER)||!Number.isFinite(b.at)||(b.stars!==undefined&&!integer(b.stars,1,5)))throw Error('요정 성장 기록을 확인해 주세요.');for(const n of Object.values(a.chests))if(!integer(n,0,9999))throw Error('보물상자 수량을 확인해 주세요.')}

 for(const a of Object.values(p.accounts??{})){
  if(a.lastParty&&(!Array.isArray(a.lastParty.ids)||a.lastParty.ids.length>5||a.lastParty.ids.some(id=>typeof id!=='string'||id.length>60)||typeof a.lastParty.owner!=='string'||!Number.isFinite(a.lastParty.at)))throw Error('저장된 파티를 확인해 주세요.')
  if(a.energy.lastMidnight!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(a.energy.lastMidnight))throw Error('에너지 날짜를 확인해 주세요.')
  if(a.layoutVersion!==undefined&&a.layoutVersion!==2||a.chapterAccess!==undefined&&!integer(a.chapterAccess,1,14))throw Error('챕터 진행 기록을 확인해 주세요.')
 }
 for(const a of Object.values(p.accounts??{})){const f=a.lastFusion;if(f&&(!(a.beasts[f.beastId]??a.adventurers?.[f.beastId])||!integer(f.fromStars,1,4)||f.toStars!==f.fromStars+1||!integer(f.shards,1,999999)||!Number.isFinite(f.at)))throw Error('합성 결과 기록을 확인해 주세요.')}
 for(const a of Object.values(p.accounts??{})){
  if(a.commandRelic!==undefined&&typeof a.commandRelic!=='boolean')throw Error('지휘 인장 기록을 확인해 주세요.')
  if(a.eventClears&&Object.keys(a.eventClears).length>32)throw Error('이벤트 진행 기록이 너무 많아요.')
  for(const c of Object.values(a.eventClears??{}))if(!Number.isFinite(c.firstAt)||!integer(c.clears,0,1000000)||typeof c.firstRewarded!=='boolean')throw Error('이벤트 기록을 확인해 주세요.')
  const s=a.shop;if(s){if(!s.training||!s.skills||!s.scrolls||!integer(s.command,0,3)||Object.keys(s.training).length>64||Object.keys(s.skills).length>64||Object.keys(s.scrolls).length>4)throw Error('별빛 상점 기록을 확인해 주세요.');for(const t of Object.values(s.training))if(!integer(t.hp,0,30)||!integer(t.atk,0,30)||!integer(t.def,0,30))throw Error('훈련 기록을 확인해 주세요.');for(const skills of Object.values(s.skills))for(const [id,n]of Object.entries(skills))if(!['basic','active1','active2','ultimate'].includes(id)||!integer(n,0,10))throw Error('스킬 강화 기록을 확인해 주세요.');for(const [id,n]of Object.entries(s.scrolls))if(!['small','medium','large','legendary'].includes(id)||!integer(n,0,9999))throw Error('주문서 기록을 확인해 주세요.')}
 }
 if(p.season!==undefined&&p.season!==2)throw Error('아레나 시즌을 확인해 주세요.')
 for(const a of Object.values(p.accounts??{})){if(Object.keys(a.growth??{}).length>64||Object.keys(a.adventurers??{}).length>8)throw Error('아레나 전용 성장 범위를 확인해 주세요.');for(const g of [...Object.values(a.growth??{}),...Object.values(a.adventurers??{})])if(!integer(g.level,1,50)||!integer(g.xp,0,100000))throw Error('아레나 전용 성장 기록을 확인해 주세요.');for(const h of Object.values(a.adventurers??{}))if(!integer(h.shards,0,999999)||!integer(h.duplicates,0,Number.MAX_SAFE_INTEGER)||!Number.isFinite(h.at)||(h.stars!==undefined&&!integer(h.stars,1,5)))throw Error('모험가 소유 기록을 확인해 주세요.')}
 return p
}
