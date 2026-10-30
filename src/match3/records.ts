export const recordKey='pocket-friends-treasure-match-v1'
export type Records={version:1;unlocked:number;bests:number[];sound:boolean}
export const emptyRecords=():Records=>({version:1,unlocked:1,bests:Array(30).fill(0),sound:false})
export function readRecords():Records{
 try{const r=JSON.parse(localStorage.getItem(recordKey)??'null');if(!r||r.version!==1)return emptyRecords();return {version:1,unlocked:Math.max(1,Math.min(30,Number.isInteger(r.unlocked)?r.unlocked:1)),bests:Array.from({length:30},(_,i)=>Number.isSafeInteger(r.bests?.[i])&&r.bests[i]>=0?r.bests[i]:0),sound:r.sound===true}}catch{return emptyRecords()}
}
export function saveRecords(records:Records){
 const old=readRecords(),merged={...records,unlocked:Math.max(old.unlocked,records.unlocked),bests:records.bests.map((n,i)=>Math.max(n,old.bests[i]))}
 try{localStorage.setItem(recordKey,JSON.stringify(merged));return {records:merged,ok:true}}catch{return {records:merged,ok:false}}
}
