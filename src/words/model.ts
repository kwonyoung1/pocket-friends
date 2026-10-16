import type {Save} from '../game.ts'
import {world,transact} from '../progression/model.ts'
import {wordSelection} from './selection.ts'
import {wordBank,wordById} from './bank.ts'
import type {Word} from './bank.ts'
import {newWordProgress,wordCooldownMs,wordRecoveryMs,scores} from './state.ts'
import type {WordRound,WordCommand,Question} from './state.ts'
export const normalizeAnswer=(v:string)=>v.normalize('NFKC').trim().replace(/[\p{P}\p{Z}\s]/gu,'').replace(/(해요|합니다|했어요)$/u,'하다').replace(/(입니다|이에요|예요)$/u,'')
export function accepts(w:Word,input:string){const n=normalizeAnswer(input);return !!n&&w.acceptedAnswers.some(a=>normalizeAnswer(a)===n)}
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296
function shuffled<T>(list:T[],rng:()=>number){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[a[i],a[j]]=[a[j],a[i]]}return a}
export function wordProgress(s:Save){return world(s).words??=newWordProgress()}
export function expireWords(s:Save,now:number){const p=wordProgress(s);for(const r of [p.round])if(r&&r.endedAt===undefined&&now>=r.expiresAt){r.endedAt=now;r.expired=true;r.reward=0}}
const view=(w:Word)=>({word:w.word,pos:w.pos,meanings:w.meanings,example:w.example})
function finish(s:Save,r:WordRound,now:number){if(r.endedAt!==undefined)return;r.endedAt=now;r.index=r.questions.length;r.reward=scores(r).coins;if(r.paidAt===undefined){if(r.reward)transact(world(s),r.reward,'영단어 탐험 완료',now);r.paidAt=now}}
export function wordCommand(s:Save,c:WordCommand,now:number,rng=random):string{
 const p=wordProgress(s);expireWords(s,now)
 p.bankVersion=2
 if(c.type==='word-delete'){
  if(!Array.isArray(c.ids)||!c.ids.length||c.ids.length>5000||c.ids.some(id=>typeof id!=='string'))throw Error('삭제할 단어를 확인해 주세요.')
  let count=0
  for(const id of new Set(c.ids))if(Object.hasOwn(p.mistakes,id)){delete p.mistakes[id];p.removals=[{wordId:id,at:now,reason:'manual' as const},...(p.removals??[])].slice(0,1000);count++}
  return count?`오답노트에서 ${count}개 단어를 삭제했어요.`:'이미 삭제한 단어예요.'
 }
 if(c.mode!=='reward')throw Error('별도 복습 게임은 종료되었어요. 오답 노트를 확인해 주세요.')
 if(c.type==='word-start'){
  if(p.round&&p.round.endedAt===undefined)return '진행 중인 탐험을 이어가요.'
  if(now<p.nextStartAt)return '다음 보상 탐험까지 기다려 주세요.'
  const selected:Word[]=[]
  for(const level of [1,2,3] as const){
   const pool=wordBank.filter(w=>w.level===level),used=new Set(p.used[level]??[]),chosen:Word[]=[]
   const mistaken=shuffled(pool.filter(w=>p.mistakes[w.id]),rng).slice(0,Math.floor(10*wordSelection.mistakeRatio))
   for(const w of mistaken){chosen.push(w);used.add(w.id)}
   while(chosen.length<10){
    const eligible=pool.filter(w=>!p.mistakes[w.id]&&!chosen.some(x=>x.id===w.id))
    let available=eligible.filter(w=>!used.has(w.id))
    if(!available.length){used.clear();chosen.forEach(w=>used.add(w.id));available=eligible}
    // A pathological all-mistakes pool must not exceed the configured mistake quota.
    if(!available.length)throw Error('오답 비중을 지킬 새 단어가 부족해요. 오답 노트를 정리해 주세요.')
    const fresh=available.filter(w=>!p.previous.includes(w.id));const w=shuffled(fresh.length?fresh:available,rng)[0]
    chosen.push(w);used.add(w.id)
   }
   p.used[level]=[...used];selected.push(...shuffled(chosen,rng))
  }
  p.round={id:crypto.randomUUID(),mode:'reward',startedAt:now,expiresAt:now+wordRecoveryMs,index:0,hints:[3,3,3],questions:selected.map(w=>({wordId:w.id,word:w.word,level:w.level,status:'unanswered'}))}
  p.nextStartAt=now+wordCooldownMs;p.previous=selected.map(w=>w.id)
  return '영단어 탐험을 시작해요!'
 }
 const r=p.round
 if(!r||r.id!==c.sessionId||r.endedAt!==undefined)return '이미 끝났거나 다른 회차예요.'
 const q=r.questions[r.index]
 if(!q||q.wordId!==c.wordId)return '이미 처리한 문제예요.'
 const w=wordById[q.wordId];if(!w)throw Error('등록되지 않은 단어예요.')
 if(c.type==='word-abandon'){r.endedAt=now;r.abandoned=true;r.reward=0;return '이번 회차를 보상 없이 종료했어요. 쿨타임은 유지돼요.'}
 if(c.type==='word-next'){if(q.status==='unanswered')return '먼저 답하거나 건너뛰어 주세요.';r.index++;r.feedback=undefined;if(r.index>=r.questions.length)finish(s,r,now);return '다음 문제로 가요.'}
 if(c.type==='word-hint'){
  if(q.hint)return '같은 힌트를 다시 확인해요.'
  if(q.status!=='unanswered')return '이미 채점한 문제예요.'
  const stage=Math.floor(r.index/10);if(r.hints[stage]<=0)return '이번 스테이지의 힌트를 다 썼어요.'
  r.hints[stage]--;q.hint={example:w.example,pos:w.pos,initials:w.hint};return '뜻 대신 예문과 초성을 살펴봐요.'
 }
 if(q.status!=='unanswered'){if(c.type==='word-reveal')q.revealed=view(w);return '이미 채점한 문제예요.'}
 if(c.type==='word-answer'&&(!c.answer||!c.answer.trim()))return '한국어 뜻을 입력해 주세요.'
 const correct=c.type==='word-answer'&&accepts(w,c.answer!)
 q.status=correct?'correct':c.type==='word-skip'?'skipped':'incorrect';q.revealed=view(w)
 const removed=correct&&!!p.mistakes[w.id]
 if(removed){delete p.mistakes[w.id];p.removals=[{wordId:w.id,at:now,reason:'correct' as const},...(p.removals??[])].slice(0,1000)}
 if(!correct){const prev=p.mistakes[w.id];p.mistakes[w.id]={...view(w),count:(prev?.count??0)+1,lastAt:now}}
 r.feedback=correct?(removed?'정답이에요! 오답노트에서 복습 완료!':'정답이에요! 잘했어요~'):c.type==='word-skip'?'건너뛴 문제를 오답 노트에 담았어요.':'아쉬워요! 정답을 확인하고 다음 문제로 가요.'
 if(correct||c.type==='word-skip')r.index++
 if(r.questions.every((x:Question)=>x.status!=='unanswered'))finish(s,r,now)
 return r.endedAt!==undefined?`탐험 완료! ${r.reward}코인${removed?' · 오답노트에서 복습 완료!':''}`:r.feedback
}
