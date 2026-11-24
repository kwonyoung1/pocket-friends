import {BEAST_LIMITS} from './beast-state.ts'
import type {ArenaAccount,BeastOwned,FusionResult} from './beast-state.ts'
import {beastById} from './beasts.ts'
export const STAR_MULTIPLIERS=[1,1.35,1.85,2.6,3.7] as const
export const STAR_DEFENSE_MULTIPLIERS=[1,1.2,1.45,1.75,2.1] as const
export const starsOf=(b?:{stars?:number})=>Number.isInteger(b?.stars)&&b!.stars!>=1&&b!.stars!<=5?b!.stars!:1
export const starMultiplier=(stars?:number)=>STAR_MULTIPLIERS[starsOf({stars})-1]
export function fusionCost(id:string,stars:number){const h=beastById(id);if(!h||!Number.isInteger(stars)||stars<1||stars>4)throw Error('합성할 환수와 성급을 확인해 주세요.');return BEAST_LIMITS.duplicateShards[h.rarity]*2**(stars-1)}
export function fusionIssue(id:string,b?:BeastOwned){if(!b)return '보유한 환수가 필요해요.';const stars=starsOf(b);if(stars===5)return '최고 성급 ★5';const cost=fusionCost(id,stars);return b.shards<cost?`전용 조각 ${cost}개 필요`:''}
/** The owned main plus 2^(S-1) duplicate equivalents produces exactly one S+1 main. */
export function fuseBeast(a:ArenaAccount,id:string,expectedStars:number,now:number):FusionResult{
 const b=a.beasts[id];if(!b||!beastById(id))throw Error('보유한 같은 종류의 환수만 합성할 수 있어요.')
 if(starsOf(b)!==expectedStars)throw Error('최신 성급을 먼저 확인해 주세요. 같은 재료를 다시 사용하지 않아요.')
 const issue=fusionIssue(id,b);if(issue)throw Error(issue)
 const shards=fusionCost(id,expectedStars),result={beastId:id,fromStars:expectedStars,toStars:expectedStars+1,shards,at:now};b.shards-=shards;b.stars=result.toStars;a.lastFusion=result;return result
}
