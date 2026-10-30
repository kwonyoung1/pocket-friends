import {emptyChallenge} from './result'
import type {ChallengeRecords,ChallengeResult} from './result'
export const recordKey='pocket-friends-treasure-match-v1'
// Older open v1 tabs only know recordKey; retain challenge data independently as well.
export const challengeRecordKey='pocket-friends-treasure-match-challenge-v2'
export type Records={version:1;unlocked:number;bests:number[];sound:boolean;shake:boolean;effects:'low'|'normal'|'strong';challenge:ChallengeRecords}
export const emptyRecords=():Records=>({version:1,unlocked:1,bests:Array(30).fill(0),sound:false,shake:true,effects:'strong',challenge:emptyChallenge()})
const number=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:0
function challenge(raw:unknown):ChallengeRecords{const r=raw&&typeof raw==='object'?raw as Record<string,unknown>:{}
 const recent:ChallengeResult[]=Array.isArray(r.recent)?r.recent.slice(0,10).filter((p)=>p&&typeof p.id==='string'&&p.id.length<128&&(p.ended==='timeout'||p.ended==='quit')).map(p=>({id:p.id,ended:p.ended,at:number(p.at),score:Math.floor(number(p.score)),survivalMs:number(p.survivalMs),playMs:number(p.playMs),maxCombo:Math.floor(number(p.maxCombo)),maxMoveScore:Math.floor(number(p.maxMoveScore)),difficulty:Math.max(1,Math.min(7,Math.floor(number(p.difficulty)))),turns:Math.floor(number(p.turns))})):[]
 return {bestScore:Math.floor(number(r.bestScore)),bestSurvivalMs:number(r.bestSurvivalMs),bestCombo:Math.floor(number(r.bestCombo)),bestDifficulty:Math.max(1,Math.min(7,Math.floor(number(r.bestDifficulty))||1)),recent}
}
export function readRecords():Records{
 const read=(key:string)=>{try{const value=JSON.parse(localStorage.getItem(key)??'null');return value?.version===1?value:{}}catch{return {}}},r=read(recordKey),addon=read(challengeRecordKey)
 const base:Records={version:1,unlocked:Math.max(1,Math.min(30,Number.isInteger(r.unlocked)?r.unlocked:1)),bests:Array.from({length:30},(_,i)=>Number.isSafeInteger(r.bests?.[i])&&r.bests[i]>=0?r.bests[i]:0),sound:r.sound===true,shake:r.shake!==false,effects:['low','normal','strong'].includes(r.effects)?r.effects:'strong',challenge:challenge(r.challenge)}
 return mergeRecords({...base,shake:addon.shake===undefined?base.shake:addon.shake!==false,effects:['low','normal','strong'].includes(addon.effects)?addon.effects:base.effects,challenge:challenge(addon.challenge)},base)
}
export function mergeRecords(records:Records,old:Records){
 const a=old.challenge,b=records.challenge;return {...records,unlocked:Math.max(old.unlocked,records.unlocked),bests:records.bests.map((n,i)=>Math.max(n,old.bests[i])),challenge:{bestScore:Math.max(a.bestScore,b.bestScore),bestSurvivalMs:Math.max(a.bestSurvivalMs,b.bestSurvivalMs),bestCombo:Math.max(a.bestCombo,b.bestCombo),bestDifficulty:Math.max(a.bestDifficulty,b.bestDifficulty),recent:[...b.recent,...a.recent].filter((p,i,all)=>all.findIndex(q=>q.id===p.id)===i).sort((a,b)=>b.at-a.at).slice(0,10)}}
}
export function saveRecords(records:Records){
 const merged=mergeRecords(records,readRecords())
 try{localStorage.setItem(recordKey,JSON.stringify(merged));if(merged.challenge.recent.length||merged.challenge.bestScore||merged.shake!==true||merged.effects!=='strong'||localStorage.getItem(challengeRecordKey))localStorage.setItem(challengeRecordKey,JSON.stringify({version:1,challenge:merged.challenge,shake:merged.shake,effects:merged.effects}));return {records:merged,ok:true}}catch{return {records:merged,ok:false}}
}
