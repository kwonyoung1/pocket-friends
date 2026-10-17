import type {Friend} from '../game.ts'
import {careNeeds} from '../careNeeds.ts'
import {sleeping} from '../expansion/model.ts'
export type EmotionKind='cold'|'hunger'|'hygiene'|'energy'|'happy'
export type EmotionState={nextAt:number;cycle:EmotionKind[];lastKind?:EmotionKind;variant:0|1;active?:{kind:EmotionKind;at:number;until:number;variant:0|1}}
export const emotionRules={minInterval:120000,maxInterval:240000,duration:1800,stagger:2200}
const kinds:EmotionKind[]=['cold','hunger','hygiene','energy','happy']
function currentKinds(f:Friend):EmotionKind[]{const needs=careNeeds(f);return needs.length?needs:f.stats.happiness>=70?['happy']:[]}
export function visibleEmotion(f:Friend,now:number){
 const active=f.stateEmotion?.active
 if(!active||now>=active.until||!currentKinds(f).includes(active.kind)||f.interaction?.gesture||f.interaction&&f.interaction.phase!=='idle'||f.life?.bath||f.growth?.awayJobId||sleeping(f,now))return undefined
 return active
}
// Called on the authoritative server and by the local simulation. Never changes
// stats, positions or conversations. Persisting nextAt prevents reload spam.
export function settleEmotions(friends:Friend[],now:number,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
 let last=Math.max(-emotionRules.stagger,...friends.map(f=>f.stateEmotion?.active?.at??-emotionRules.stagger))
 for(const f of friends){
  const available=currentKinds(f)
  const e=f.stateEmotion??={nextAt:available.some(k=>k!=='happy')?0:now+emotionRules.minInterval+Math.floor(random()*120001),cycle:[],variant:0}
  if(e.active&&(!available.includes(e.active.kind)||now>=e.active.until))delete e.active
  e.cycle=e.cycle.filter(k=>available.includes(k))
  if(!available.length||now<e.nextAt||now-last<emotionRules.stagger||f.interaction?.gesture||f.interaction&&f.interaction.phase!=='idle'||f.life?.bath||f.growth?.awayJobId||sleeping(f,now))continue
  let kind:EmotionKind
  if(available[0]==='cold')kind='cold'
  else{if(available.every(k=>e.cycle.includes(k)))e.cycle=[];kind=available.find(k=>!e.cycle.includes(k))!}
  const variant=e.lastKind===kind?(1-e.variant) as 0|1:e.variant
  e.active={kind,at:now,until:now+emotionRules.duration,variant};e.lastKind=kind;e.variant=variant;if(!e.cycle.includes(kind))e.cycle.push(kind)
  e.nextAt=now+emotionRules.minInterval+Math.floor(Math.max(0,Math.min(.999999,random()))*(emotionRules.maxInterval-emotionRules.minInterval+1));last=now
 }
}
export function migrateEmotion(raw:unknown):EmotionState|undefined{
 if(raw===undefined)return undefined
 const e=structuredClone(raw) as EmotionState,num=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0
 if(!e||!num(e.nextAt)||!Array.isArray(e.cycle)||e.cycle.length>5||e.cycle.some(k=>!kinds.includes(k))||![0,1].includes(e.variant)||(e.lastKind!==undefined&&!kinds.includes(e.lastKind))||e.active&&(!kinds.includes(e.active.kind)||![0,1].includes(e.active.variant)||!num(e.active.at)||!num(e.active.until)||e.active.until-e.active.at!==emotionRules.duration))throw Error('상태 이모션 저장 형식을 확인해 주세요.')
 return e
}
