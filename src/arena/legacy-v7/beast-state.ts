import type {Energy} from './energy.ts'
export type BeastRarity='rare'|'heroic'|'legendary'|'mythic'
export type ChestId='forest'|'lake'|'crystal'|'ancient'|'starlight'|'legendary'|'christmas'
export type BeastOwned={at:number;level:number;xp:number;shards:number;duplicates:number;mastery:number;stars?:number}
export type ClearRecord={firstAt:number;clears:number;firstRewarded:boolean;firstBonusGranted?:boolean}
export type Opening={nonce:number;chest:ChestId;tier:'common'|BeastRarity;beastId?:string;adventurerId?:string;duplicate:boolean;shards:number;coins:number;stones:number;at:number;pity:boolean}
export type FusionResult={beastId:string;fromStars:number;toStars:number;shards:number;at:number}
export type ArenaAccount={lastParty?:import('../party-memory.ts').LastParty;layoutVersion?:2;chapterAccess?:number;growth?:Record<string,import('../season2.ts').ArenaGrowth>;adventurers?:Record<string,import('../season2.ts').AdventurerOwned>;shop?:import('./shop-state.ts').ArenaShop;commandRelic?:boolean;eventClears?:Record<string,ClearRecord>;recoveryHash?:string;energy:Energy;cleared:Record<string,ClearRecord>;beasts:Record<string,BeastOwned>;chests:Partial<Record<ChestId,number>>;opens:number;pity:{legendary:number;mythic:number};lastOpening?:Opening;lastFusion?:FusionResult;daily:{day:string;xp:Record<string,number>}}
export const BEAST_LIMITS={accounts:32,chests:9999,shards:999999,worldCoinsPerDay:5000,duplicateShards:{rare:8,heroic:16,legendary:32,mythic:64},legendaryPity:40,mythicPity:300} as const
export function beastXpNeed(level:number){return 20+level*8}
export function addBeastXp(b:BeastOwned,amount:number){if(b.level>=50)return;b.xp+=Math.max(0,Math.floor(amount));while(b.level<50&&b.xp>=beastXpNeed(b.level)){b.xp-=beastXpNeed(b.level);b.level++}if(b.level>=50)b.xp=0}
