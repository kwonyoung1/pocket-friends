export type Outcome='unanswered'|'correct'|'incorrect'|'skipped'
export type WordView={word:string;pos:string;meanings:string[];example:string}
export type Question={wordId:string;word:string;level:1|2|3;status:Outcome;hint?:{example:string;pos:string;initials:string};revealed?:WordView}
// The review value exists only to preserve archived saves; no command can start or play it.
export type WordRound={id:string;mode:'reward'|'review';startedAt:number;expiresAt:number;index:number;questions:Question[];hints:number[];endedAt?:number;paidAt?:number;reward?:number;expired?:boolean;abandoned?:boolean;feedback?:string}
export type WordProgress={version:1;bankVersion?:2;removals?:{wordId:string;at:number;reason:'correct'|'manual'}[];nextStartAt:number;used:Record<string,string[]>;previous:string[];round?:WordRound;review?:WordRound;mistakes:Record<string,WordView&{count:number;lastAt:number}>}
export type WordCommand={type:'word-delete';ids:string[]}|{type:'word-start';mode:'reward'}|{type:'word-answer'|'word-reveal'|'word-skip'|'word-next'|'word-hint'|'word-abandon';mode:'reward';sessionId:string;wordId:string;answer?:string}
export function newWordProgress():WordProgress{return{version:1,nextStartAt:0,used:{},previous:[],mistakes:{}}}
export function migrateWords(value:unknown):WordProgress|undefined{
 if(value===undefined)return undefined
 const p=structuredClone(value) as WordProgress
 const number=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0
 if(!p||p.version!==1||!number(p.nextStartAt)||!p.used||typeof p.used!=='object'||!Array.isArray(p.previous)||!p.mistakes||typeof p.mistakes!=='object')throw Error('영단어 저장 형식이 올바르지 않아요.')
 for(const ids of Object.values(p.used))if(!Array.isArray(ids)||ids.length>10000||ids.some(id=>typeof id!=='string'))throw Error('출제 이력이 올바르지 않아요.')
 for(const r of [p.round,p.review])if(r){if(!Array.isArray(r.questions)||r.questions.length>30||!number(r.startedAt)||!number(r.expiresAt)||!Number.isInteger(r.index)||r.index<0||r.index>r.questions.length||!Array.isArray(r.hints)||r.hints.length!==3||r.hints.some(n=>!Number.isInteger(n)||n<0||n>3)||new Set(r.questions.map(q=>q.wordId)).size!==r.questions.length||r.questions.some(q=>typeof q.wordId!=='string'||typeof q.word!=='string'||!['unanswered','correct','incorrect','skipped'].includes(q.status)||![1,2,3].includes(q.level)))throw Error('영단어 진행 기록이 올바르지 않아요.')}
 const validView=(v:WordView)=>v&&typeof v.word==='string'&&typeof v.pos==='string'&&typeof v.example==='string'&&Array.isArray(v.meanings)&&v.meanings.length>0&&v.meanings.every(m=>typeof m==='string')
 for(const r of [p.round,p.review])if(r){
  if(typeof r.id!=='string'||!['reward','review'].includes(r.mode)||!r.questions.length||(r.mode==='reward'&&r.questions.length!==30)||r.expiresAt<r.startedAt||[r.endedAt,r.paidAt,r.reward].some(n=>n!==undefined&&!number(n))||(r.reward!==undefined&&(!Number.isInteger(r.reward)||r.reward>300))||r.questions.some(q=>q.revealed&&!validView(q.revealed))||r.questions.some(q=>q.hint&&(typeof q.hint.example!=='string'||typeof q.hint.pos!=='string'||typeof q.hint.initials!=='string'))||r.questions.slice(0,r.index).some(q=>q.status==='unanswered')||(r.endedAt===undefined&&r.index===r.questions.length))throw Error('영단어 채점 기록이 올바르지 않아요.')
 }
 for(const m of Object.values(p.mistakes))if(!m||typeof m.word!=='string'||!Array.isArray(m.meanings)||m.meanings.some(x=>typeof x!=='string')||typeof m.example!=='string'||!number(m.count)||!number(m.lastAt))throw Error('오답 노트가 올바르지 않아요.')
 if(p.removals!==undefined&&(!Array.isArray(p.removals)||p.removals.length>1000||p.removals.some(x=>typeof x.wordId!=='string'||!number(x.at)||!['correct','manual'].includes(x.reason))))throw Error('오답 삭제 이력이 올바르지 않아요.')
 if(p.bankVersion!==undefined&&p.bankVersion!==2)throw Error('지원하지 않는 단어 버전이에요.')
 return p
}
export const wordCooldownMs=2*3600000,wordRecoveryMs=6*3600000
export const scores=(r:WordRound)=>{const correct=r.questions.filter(q=>q.status==='correct').length,wrong=r.questions.filter(q=>q.status==='incorrect'||q.status==='skipped').length;return{correct,wrong,coins:Math.max(0,300-wrong*10)}}
