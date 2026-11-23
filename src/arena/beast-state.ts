import type {Energy} from './energy.ts'
export type BeastRarity='rare'|'heroic'|'legendary'|'mythic'
export type ChestId='forest'|'lake'|'crystal'|'ancient'|'starlight'|'legendary'
export type BeastOwned={at:number;level:number;xp:number;shards:number;duplicates:number;mastery:number}
export type ClearRecord={firstAt:number;clears:number;firstRewarded:boolean}
export type Opening={nonce:number;chest:ChestId;tier:'common'|BeastRarity;beastId?:string;duplicate:boolean;shards:number;coins:number;stones:number;at:number;pity:boolean}
export type ArenaAccount={recoveryHash?:string;energy:Energy;cleared:Record<string,ClearRecord>;beasts:Record<string,BeastOwned>;chests:Partial<Record<ChestId,number>>;opens:number;pity:{legendary:number;mythic:number};lastOpening?:Opening;daily:{day:string;xp:Record<string,number>}}
export const BEAST_LIMITS={accounts:32,chests:9999,shards:999999,worldCoinsPerDay:5000,duplicateShards:{rare:8,heroic:16,legendary:32,mythic:64},legendaryPity:40,mythicPity:300} as const
export function beastXpNeed(level:number){return 20+level*8}
export function addBeastXp(b:BeastOwned,amount:number){if(b.level>=50)return;b.xp+=Math.max(0,Math.floor(amount));while(b.level<50&&b.xp>=beastXpNeed(b.level)){b.xp-=beastXpNeed(b.level);b.level++}if(b.level>=50)b.xp=0}
