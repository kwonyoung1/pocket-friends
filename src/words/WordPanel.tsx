import {useEffect,useState,useRef} from 'react'
import type {Save} from '../game'
import type {GameCommand} from '../cloud/protocol'
import {newWordProgress,scores,wordRecoveryMs} from './state'
import type {WordCommand} from './state'
import './styles.css'
const left=(ms:number)=>{const m=Math.ceil(Math.max(0,ms)/60000);return `${Math.floor(m/60)}시간 ${m%60}분`}
export function WordPanel({save,command,busy,changed,notify,now}:{save:Save;command?:(c:GameCommand)=>Promise<void>;busy?:boolean;changed:()=>void;notify:(m:string)=>void;now?:()=>number}){
 const sending=useRef(false)
 const [mode,setMode]=useState<'reward'|'review'|'notebook'>('reward'),[answer,setAnswer]=useState(''),[error,setError]=useState(''),[working,setWorking]=useState(false),[abandon,setAbandon]=useState(false)
 const p=save.world?.words??newWordProgress(),r=mode==='review'?p.review:p.round,q=r?.questions[r.index],at=now?now():Date.now(),expired=!!r&&r.endedAt===undefined&&at>=r.expiresAt
 const done=!!r&&(r.endedAt!==undefined||expired),stage=Math.min(3,Math.floor((r?.index??0)/10)+1),tally=r?scores(r):{correct:0,wrong:0,coins:300}
 const blocked=busy||working
 useEffect(()=>{setAnswer('');setError('');setAbandon(false)},[r?.id,r?.index])
 async function run(c:WordCommand){if(blocked||sending.current)return;sending.current=true;setWorking(true);setError('');try{if(command)await command(c);else if(import.meta.env.DEV){const {wordCommand}=await import('./model');notify(wordCommand(save,c,Date.now()));changed()}}catch{setError('연결을 확인하고 같은 작업을 다시 시도해 주세요.')}finally{sending.current=false;setWorking(false)}}
 const current=(type:Exclude<WordCommand['type'],'word-start'>,extra?:{answer:string})=>{if(!r||!q)return;void run({type,mode:mode==='review'?'review':'reward',sessionId:r.id,wordId:q.wordId,...extra})}
 return <section className="word-expedition" aria-label="영단어 탐험 게임">
  <div className="word-intro"><span>📚</span><div><h3>단어 하나, 작은 모험 하나.</h3><p>초기 검토 단어 90개 · 난이도별 30개<br/>목표 5,000개 중 90개 제공 · 공식 교육과정 목록은 아니에요.</p></div></div>
  <div className="word-tabs"><button onClick={()=>setMode('reward')} aria-pressed={mode==='reward'}>보상 탐험</button><button onClick={()=>setMode('notebook')} aria-pressed={mode==='notebook'}>오답 노트 ({Object.keys(p.mistakes).length})</button><button disabled={!Object.keys(p.mistakes).length} onClick={()=>{setMode('review');void run({type:'word-start',mode:'review'})}}>오답 복습</button></div>
  {mode==='notebook'?<div className="wrong-notes">{Object.entries(p.mistakes).map(([id,m])=><article key={id}><h3>{m.word}</h3><p>{m.meanings.join(' · ')}</p><blockquote>{m.example}</blockquote><small>틀린 횟수 {m.count}회 · 마지막 오답 {new Date(m.lastAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</small></article>)}{!Object.keys(p.mistakes).length&&<p>아직 오답이 없어요. 새로운 단어를 만나 볼까요?</p>}</div>:<>
  <p className="word-cooldown" data-testid="word-cooldown">{mode==='review'?'복습은 언제든 가능해요 · 코인 보상 없음':at<p.nextStartAt?`다음 보상 탐험: ${left(p.nextStartAt-at)} 후`:'보상 탐험 시작 가능!'}</p>
  {!r||done?<div className="word-results">{r&&<><h3>{expired||r.expired?'복구 기간이 끝났어요':r.abandoned?'이번 탐험을 마쳤어요':'영단어 탐험 완료!'}</h3><p>정답 {tally.correct} · 오답·건너뛰기 {tally.wrong}</p><strong data-testid="word-reward">{expired?0:r.reward??0}코인</strong><p>{r.paidAt!==undefined?'코인이 한 번 지급되었어요.':r.mode==='review'?'복습은 코인 보상이 없어요.':'종료된 회차에는 추가 보상이 없어요.'}</p></>}
  {mode==='review'?<p>오답 중 최대 30개를 언제든 복습해요.<br/>복습에는 코인 보상과 시작 제한이 없어요.</p>:<p>중학교 → 고등학교 기본 → 심화, 각 10문제씩 총 30문제예요.<br/>최대 300코인 · 오답·건너뛰기 1개당 10코인 차감</p>}
  <button className="small-primary" disabled={blocked||(mode==='reward'&&at<p.nextStartAt)} onClick={()=>void run({type:'word-start',mode:mode==='review'?'review':'reward'})}>{mode==='review'?'다시 복습하기':'영단어 탐험 시작'}</button>
  </div>:q&&<div className="word-play" data-testid="word-play" data-session={r.id} data-word-id={q.wordId} data-status={q.status}>
   <div className="word-stage"><strong>{Math.floor(r.index/10)+1}스테이지 · {['중학교','고등학교 기본','고등학교 심화'][stage-1]}</strong><span>{r.index+1} / {r.questions.length}문제</span></div>
   <progress max={r.questions.length} value={r.index}/><h3 className="english-word" lang="en" data-testid="english-word">{q.word}</h3>
   <form onSubmit={e=>{e.preventDefault();if(q.status!=='unanswered'||blocked)return;if(!answer.trim()){setError('한국어 뜻을 입력해 주세요.');return}setAnswer('');current('word-answer',{answer})}}>
    <label>한국어 뜻<input aria-label="한국어 뜻" value={answer} onChange={e=>setAnswer(e.target.value)} maxLength={120} disabled={blocked||q.status!=='unanswered'} autoComplete="off"/></label>
    <button className="small-primary" type="submit" disabled={blocked||q.status!=='unanswered'}>정답 확인</button>
   </form>
   {error&&<p role="alert">{error}</p>}
   {r.feedback&&<p className={`word-feedback ${r.feedback.startsWith('정답')?'correct':'incorrect'}`} role="status">{r.feedback}</p>}
   {q.revealed&&<div className="word-answer"><strong>등록된 뜻: {q.revealed.meanings.join(' · ')}</strong><p lang="en">{q.revealed.example}</p></div>}
   <div className="word-controls"><button disabled={blocked||q.status!=='unanswered'||(!q.hint&&r.hints[stage-1]===0)} onClick={()=>current('word-hint')}>{q.hint?'힌트 다시 보기':`힌트 · 남은 ${r.hints[stage-1]}회`}</button><button disabled={blocked||q.status==='correct'} onClick={()=>current('word-reveal')}>정답 보기</button><button disabled={blocked||q.status!=='unanswered'} onClick={()=>current('word-skip')}>건너뛰기</button>{q.status!=='unanswered'&&<button className="small-primary" disabled={blocked} onClick={()=>current('word-next')}>다음 문제</button>}</div>
   {q.hint&&<aside className="word-hint"><p lang="en">{q.hint.example}</p><p>품사: {q.hint.pos} · 초성: {q.hint.initials}</p></aside>}
   <div className="word-score">정답 {tally.correct} · 오답 {tally.wrong} · 예상 보상 {mode==='review'?0:tally.coins}코인</div>
   <p className="menu-note">진행은 자동 저장돼요. 메뉴를 닫았다 열면 이어가요.<br/>복구 가능 시간: {left(Math.min(wordRecoveryMs,r.expiresAt-at))}</p>
   <button onClick={()=>setAbandon(true)} disabled={blocked}>이번 회차 포기</button>
   {abandon&&<div role="alertdialog" aria-label="영단어 탐험 포기"><p>보상 없이 종료할까요? 보상 탐험의 2시간 제한은 유지돼요.</p><button onClick={()=>current('word-abandon')} disabled={blocked}>확인하고 포기</button><button onClick={()=>setAbandon(false)}>계속 풀기</button></div>}
  </div>}
  </>}
 </section>
}
