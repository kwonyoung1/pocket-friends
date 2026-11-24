import type {Save} from '../game.ts'
import type {ArenaProgress} from './state.ts'
import type {ArenaAccount,ClearRecord} from './beast-state.ts'
export type ArenaGrowth={level:number;xp:number}
export type AdventurerOwned=ArenaGrowth&{at:number;shards:number;duplicates:number}
export type SeasonArchive={at:number;commonGrowth:Record<string,ArenaGrowth>;cleared:ArenaProgress['cleared'];accounts:Record<string,{cleared:Record<string,ClearRecord>;beastGrowth:Record<string,ArenaGrowth>;growth?:Record<string,ArenaGrowth>;adventurerGrowth?:Record<string,ArenaGrowth>}>;counts:{accounts:number;friends:number;beasts:number;clears:number;firstRewards:number}}
export const arenaXpNeed=(level:number)=>20+8*level
export function growArena(g:ArenaGrowth,amount:number){if(g.level>=50)return;g.xp+=Math.max(0,Math.floor(amount));while(g.level<50&&g.xp>=arenaXpNeed(g.level)){g.xp-=arenaXpNeed(g.level);g.level++}if(g.level>=50)g.xp=0}
export function arenaGrowth(a:ArenaAccount,id:string):ArenaGrowth{a.growth??={};return a.growth[id]??={level:1,xp:0}}
/** Snapshot precedes every reset in the same Save clone/CAS commit. A duplicate commit can never rerun the season transition. */
export function startSeason2(save:Save,p:ArenaProgress,now:number){if(p.season===2)return '시즌 2 전환은 이미 완료됐어요.';const accounts=p.accounts??{},archive:SeasonArchive={at:now,commonGrowth:Object.fromEntries(save.friends.map(f=>[f.id,{level:f.growth?.level??1,xp:f.growth?.xp??0}])),cleared:structuredClone(p.cleared),accounts:{},counts:{accounts:Object.keys(accounts).length,friends:0,beasts:0,clears:0,firstRewards:0}};
 for(const[id,a]of Object.entries(accounts)){archive.accounts[id]={growth:structuredClone(a.growth??{}),adventurerGrowth:Object.fromEntries(Object.entries(a.adventurers??{}).map(([id,h])=>[id,{level:h.level,xp:h.xp}])),cleared:structuredClone(a.cleared),beastGrowth:Object.fromEntries(Object.entries(a.beasts).map(([id,b])=>[id,{level:b.level,xp:b.xp}]))};archive.counts.friends+=save.friends.length;archive.counts.beasts+=Object.keys(a.beasts).length;archive.counts.clears+=Object.keys(a.cleared).length;archive.counts.firstRewards+=Object.values(a.cleared).filter(c=>c.firstRewarded).length}
 p.season1Archive=archive;p.seasonReport={at:now,counts:structuredClone(archive.counts)};
 for(const a of Object.values(accounts)){a.growth=Object.fromEntries(save.friends.map(f=>[f.id,{level:1,xp:0}]));for(const b of Object.values(a.beasts)){b.level=1;b.xp=0}for(const h of Object.values(a.adventurers??{})){h.level=1;h.xp=0}a.cleared={}}
 p.cleared={};p.season=2;return `시즌 2 전환 완료 · 계정 ${archive.counts.accounts} · 아레나 성장 ${archive.counts.friends+archive.counts.beasts} · 일반 클리어 ${archive.counts.clears}건. 기존 기록은 복구용으로 보관했어요.`
}
