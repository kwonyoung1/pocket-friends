import {expect,it} from 'vitest'
import {freshWorld,applyCommand} from '../cloud/engine'
import {wordBank,wordById} from './bank'
import {wordCommand,wordProgress,accepts} from './model'
import type {WordCommand} from './state'
import {scores,wordCooldownMs,wordRecoveryMs} from './state'
import {parseSave} from '../game'
const at=Date.parse('2026-10-16T03:00:00Z')
function fixture(){const s=freshWorld(at);wordCommand(s,{type:'word-start',mode:'reward'},at,()=>.5);return s}
function current(s:ReturnType<typeof fixture>,type:Exclude<WordCommand['type'],'word-start'>,answer?:string,mode:'reward'|'review'='reward'):Exclude<WordCommand,{type:'word-start'}>{const p=wordProgress(s),r=mode==='review'?p.review!:p.round!;return{type,mode,sessionId:r.id,wordId:r.questions[r.index].wordId,answer}}
function solve(s:ReturnType<typeof fixture>,miss=0){const base=wordProgress(s).round!.startedAt;for(let i=0;i<30;i++){const q=wordProgress(s).round!.questions[wordProgress(s).round!.index];wordCommand(s,current(s,i<miss?'word-skip':'word-answer',wordById[q.wordId].acceptedAnswers[0]),base+i+1)}}
it('ships exactly 90 unique reviewed entries, 30 per level, with complete examples and safe exact Korean variants',()=>{
 expect(wordBank).toHaveLength(90);expect(new Set(wordBank.map(w=>w.word.toLowerCase())).size).toBe(90)
 for(const level of [1,2,3])expect(wordBank.filter(w=>w.level===level)).toHaveLength(30)
 for(const w of wordBank){expect(w.example.toLowerCase()).toContain(w.word==='begin'?'begin':w.word==='emphasize'?'emphasized':w.word==='establish'?'established':w.word==='sleep'?'sleep':w.word);expect(w.pos.length).toBeGreaterThan(0);expect(w.hint).toMatch(/[ㄱ-ㅎ]/);expect(w.meanings.length).toBeGreaterThan(0)}
 const run=wordById['word-run'];for(const a of [' 달리다! ','뛰다','운영하다','작동하다'])expect(accepts(run,a)).toBe(true)
 expect(accepts(wordById['word-discover'],'발견 해요.')).toBe(true)
 expect(accepts(wordById['word-apple'],'사과입니다.')).toBe(true)
 for(const bad of ['달','수영하다','운영하지 않다',''])expect(accepts(run,bad)).toBe(false)
})
it('has three ten-question stages without duplicates, exhausts unseen pools first and avoids the previous round',()=>{
 const s=fixture(),seen=new Set<string>();let previous:string[]=[]
 for(let game=0;game<4;game++){
  if(game)wordCommand(s,{type:'word-start',mode:'reward'},at+game*wordCooldownMs,()=>.5)
  const r=wordProgress(s).round!,ids=r.questions.map(q=>q.wordId)
  expect(new Set(ids).size).toBe(30);expect(ids.some(id=>previous.includes(id))).toBe(false)
  r.questions.forEach((q,i)=>expect(q.level).toBe(Math.floor(i/10)+1))
  if(game<3)ids.forEach(id=>{expect(seen.has(id)).toBe(false);seen.add(id)})
  previous=ids;solve(s)
 }
 expect(seen.size).toBe(90)
})
it('grades once across answer, reveal, skip and next actions, ignores stale question IDs and blank input',()=>{
 const s=fixture(),r=wordProgress(s).round!,q=r.questions[0],base=current(s,'word-answer','')
 wordCommand(s,base,at+1);expect(q.status).toBe('unanswered')
 wordCommand(s,{...base,answer:'모르는 뜻'},at+2);expect(q.status).toBe('incorrect')
 for(const type of ['word-answer','word-reveal','word-skip'] as const)wordCommand(s,{...base,type,answer:wordById[q.wordId].acceptedAnswers[0]},at+3)
 expect(scores(r).wrong).toBe(1);expect(q.revealed!.meanings).toEqual(wordById[q.wordId].meanings)
 wordCommand(s,{...base,type:'word-next'},at+4);expect(r.index).toBe(1);expect(r.feedback).toBeUndefined()
 wordCommand(s,base,at+5);expect(r.index).toBe(1);expect(scores(r).wrong).toBe(1)
})
it('uses at most three hints per stage, repeats a hint for free and gives no direct Korean answer',()=>{
 const s=fixture(),r=wordProgress(s).round!
 for(let i=0;i<10;i++){
  const h=current(s,'word-hint');wordCommand(s,h,at+i);wordCommand(s,h,at+i)
  if(i<3){expect(r.questions[i].hint).toBeDefined();expect(r.questions[i].hint).not.toHaveProperty('meanings')}
  else expect(r.questions[i].hint).toBeUndefined()
  wordCommand(s,current(s,'word-skip'),at+i)
 }
 expect(r.index).toBe(10);expect(r.hints).toEqual([0,3,3])
 wordCommand(s,current(s,'word-hint'),at+20);expect(r.hints).toEqual([0,2,3])
})
for(const wrong of [0,3,5,10,20,30])it(`pays exactly ${300-wrong*10} coins for ${wrong} wrong answers once after question 30`,()=>{
 const s=fixture();solve(s,wrong);const r=wordProgress(s).round!
 expect(r.questions.filter(q=>q.status==='unanswered')).toHaveLength(0);expect(r.reward).toBe(300-wrong*10);expect(s.world!.coins).toBe(600-wrong*10)
 const last=r.questions[29];wordCommand(s,{type:'word-answer',mode:'reward',sessionId:r.id,wordId:last.wordId,answer:wordById[last.wordId].acceptedAnswers[0]},at+100)
 expect(s.world!.coins).toBe(600-wrong*10);expect(s.world!.ledger.filter(l=>l.reason==='영단어 탐험 완료')).toHaveLength(wrong===30?0:1)
})
it('resumes progress and hints after reload, preserves cooldown on abandonment, and expires unpaid rounds at six hours',()=>{
 const s=fixture();wordCommand(s,current(s,'word-hint'),at+1);wordCommand(s,current(s,'word-skip'),at+2)
 const restored=parseSave(JSON.stringify(s),at+3)
 expect(wordProgress(restored)).toEqual(wordProgress(s))
 wordCommand(restored,{type:'word-start',mode:'reward'},at+wordCooldownMs);expect(wordProgress(restored).round!.index).toBe(1)
 wordCommand(restored,current(restored,'word-abandon'),at+1000)
 wordCommand(restored,{type:'word-start',mode:'reward'},at+wordCooldownMs-1);expect(wordProgress(restored).round!.abandoned).toBe(true)
 wordCommand(restored,{type:'word-start',mode:'reward'},at+wordCooldownMs);expect(wordProgress(restored).round!.startedAt).toBe(at+wordCooldownMs)
 wordCommand(restored,current(restored,'word-answer','틀린 답'),at+wordCooldownMs+wordRecoveryMs)
 expect(wordProgress(restored).round!.expired).toBe(true);expect(restored.world!.coins).toBe(300)
})
it('records mistakes and allows reward-free review without modifying the reward clock or active reward round',()=>{
 const s=fixture();wordCommand(s,current(s,'word-reveal'),at+1);const p=wordProgress(s),active=structuredClone(p.round),clock=p.nextStartAt
 wordCommand(s,{type:'word-start',mode:'review'},at+2)
 const q=p.review!.questions[0];wordCommand(s,current(s,'word-answer',wordById[q.wordId].acceptedAnswers[0],'review'),at+3)
 expect(p.review!.reward).toBe(0);expect(p.round).toEqual(active);expect(p.nextStartAt).toBe(clock);expect(s.world!.coins).toBe(300)
 expect(Object.values(p.mistakes)[0].count).toBe(1)
})
it('server ignores forged reward and correctness values and uses only its own recorded answers',()=>{
 let s=freshWorld(at),holds={};const apply=(c:WordCommand)=>{const result=applyCommand(s,holds,c,'user',at);s=result.save;holds=result.holds}
 apply({type:'word-start',mode:'reward'})
 for(let i=0;i<30;i++){const c=current(s,'word-skip');apply({...c,reward:999999,correct:true} as WordCommand)}
 expect(s.world!.coins).toBe(300);expect(wordProgress(s).round!.reward).toBe(0)
})
