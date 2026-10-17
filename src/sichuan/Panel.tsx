import {useEffect,useRef,useState} from 'react'
import type {Save} from '../game'
import type {CloudGame,GameCommand} from '../cloud/protocol'
import {formatTime,icons,rules,stages,path} from './board'
import {newSichuan,ranking} from './state'
import type {Mode,SichuanCommand} from './state'
import './styles.css'
export function SichuanPanel({save,cloud,changed,close}:{save:Save;cloud?:CloudGame;changed:()=>void;close:()=>void}){
 const [mode,setMode]=useState<Mode>('adventure'),[nickname,setNickname]=useState('친구'),[selected,setSelected]=useState<number|null>(null),[error,setError]=useState(''),[feedback,setFeedback]=useState(''),[working,setWorking]=useState(false),[confirm,setConfirm]=useState(false),[restart,setRestart]=useState(false),[,render]=useState(0)
 const sending=useRef(false),expiration=useRef(''),pointer=useRef(false)
 const p=save.world?.sichuan??newSichuan(),user=cloud?.playerId??'local-player',r=mode==='adventure'?p.adventure:p.competitions[user],now=cloud?.now()??Date.now()
 const shuffling=r?.shuffledAt!==undefined&&now-r.shuffledAt<rules.shuffleMs,expired=!!r&&r.mode==='adventure'&&r.status==='playing'&&now>=r.stageEndsAt
 const blocked=working||cloud?.busy||shuffling||expired
 async function run(c:GameCommand){if(sending.current||cloud?.busy)return;sending.current=true;setWorking(true);setError('');try{if(cloud)await cloud.send(c);else if(import.meta.env.DEV){const {sichuanCommand,expireSichuan}=await import('./model');if(c.type==='refresh')expireSichuan(save,Date.now());else setFeedback(sichuanCommand(save,c as SichuanCommand,user,Date.now()));changed()}}catch(e){setError((e as Error).message)}finally{sending.current=false;setWorking(false)}}
 useEffect(()=>{const t=setInterval(()=>render(n=>n+1),80);return()=>clearInterval(t)},[])
 useEffect(()=>{setSelected(null);setConfirm(false)},[r?.id,r?.turn,mode])
 useEffect(()=>{if(expired&&r&&expiration.current!==r.id&&!cloud?.busy&&!working){expiration.current=r.id;void run({type:'refresh'})}})
 const current=(type:Exclude<SichuanCommand['type'],'sichuan-start'>,extra?:{a:number;b:number})=>{if(r)void run({type,mode,sessionId:r.id,turn:r.turn,...extra})}
 function choose(i:number){if(blocked||!r||r.status!=='playing'||!r.board.tiles[i])return
  if(selected===null){setSelected(i);return}if(selected===i){setSelected(null);return}
  if(path(r.board,selected,i)){current('sichuan-match',{a:selected,b:i});setSelected(null);setError('')}else{setSelected(i);setError('같은 그림을 두 번 이하로 꺾어 연결해 주세요.')}
 }
 const active=r&&r.status!=='settled',remaining=mode==='adventure'&&r?Math.max(0,r.stageEndsAt-now):r?.elapsedMs??(r?now-r.startedAt:0)
 return <div className="sichuan-backdrop"><section role="dialog" aria-modal="true" aria-label="사천성 미니게임" className="sichuan-panel">
  <header><div><small>POCKET TILE GARDEN</small><h2>사천성 정원 🌸</h2></div><button onClick={close} aria-label="사천성 닫기">✕</button></header>
  <p>같은 그림 두 개를 두 번 이하로 꺾어 연결해요. 보드 밖으로 돌아가도 좋아요!</p>
  <nav aria-label="사천성 모드"><button aria-pressed={mode==='adventure'} onClick={()=>setMode('adventure')}>탐험모드</button><button aria-pressed={mode==='competition'} onClick={()=>setMode('competition')}>경쟁모드</button></nav>
  <p className="sichuan-tip">{mode==='adventure'?'1시간마다 다섯 단계 도전 · 마지막 완료 단계 보상을 한 번 받아요.':'8 × 8 무제한 도전 · 입장료와 코인 보상 없이 최고 기록에 도전해요.'}</p>
  {!active&&<div className="sichuan-start">
   {r&&<div className={r.top?'sichuan-celebrate':''} role="status"><h3>{mode==='competition'&&r.elapsedMs!==undefined?'🎉 경쟁모드 완료!':'이번 게임을 마쳤어요'}</h3>{mode==='adventure'?<p data-testid="sichuan-reward">{r.completed}단계 완료 · {r.reward??0}코인 정산 완료</p>:r.elapsedMs!==undefined&&<><strong>{formatTime(r.elapsedMs)}</strong><p>힌트 {r.hintsUsed}회 · 자동 섞기 {r.autoShuffles}회</p>{r.top&&<p>✨ TOP 5 기록 달성을 축하해요! ✨</p>}</>}</div>}
   {mode==='competition'&&<label>닉네임 (2~12자)<input aria-label="사천성 닉네임" value={nickname} maxLength={24} onChange={e=>setNickname(e.target.value)}/></label>}
   {mode==='adventure'&&now<p.nextStartAt&&<p role="status">다음 탐험까지 {formatTime(p.nextStartAt-now)}</p>}
   <button disabled={working||cloud?.busy||(mode==='adventure'&&now<p.nextStartAt)} onClick={()=>void run({type:'sichuan-start',mode,nickname})}>{mode==='adventure'?'사천성 탐험 시작':'경쟁 시작'}</button>
  </div>}
  {active&&<>
   <div className="sichuan-metrics"><strong>{mode==='adventure'?`${r.stage}단계 · ${r.completed?stages[r.completed-1].reward:0}코인 확보`:'경쟁 · 8 × 8'}</strong><output aria-label={mode==='adventure'?'남은 시간':'경과 시간'}>{formatTime(remaining)}</output></div>
   {r.status==='cleared'?<div className="sichuan-clear"><h3>🌷 {r.completed}단계 완료!</h3><p>다음 단계에서 실패해도 {stages[r.completed-1].reward}코인은 지켜져요.</p><button disabled={blocked} onClick={()=>current('sichuan-stop')}>보상 받고 멈추기</button><button disabled={blocked} onClick={()=>current('sichuan-next')}>다음 단계 도전하기</button></div>:<>
   <div className={`sichuan-board ${shuffling?'shuffling':''}`} data-testid="sichuan-board" style={{gridTemplateColumns:`repeat(${r.board.width},minmax(0,1fr))`}} aria-label={`${r.board.width} × ${r.board.height} 사천성 보드`}>
    {r.board.tiles.map((v,i)=><button key={i} className={`${v?'':'empty'} ${selected===i?'selected':''} ${r.hint?.includes(i)?'hint':''}`} aria-label={`${i+1}번 패${v?' '+icons[v-1]:' 비어 있음'}`} aria-pressed={selected===i} disabled={!v||blocked} data-index={i} data-tile={v} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();pointer.current=true;choose(i)}} onClick={e=>{if(e.detail===0)choose(i);else if(!pointer.current)choose(i);pointer.current=false}}>{v?icons[v-1]:''}</button>)}
   </div>
   <p className="sichuan-shuffle-message" role="status">{r.autoAt!==undefined&&now-r.autoAt<4000?'연결할 수 있는 패가 없어 자동으로 섞었어요!':shuffling?'패를 섞고 있어요…':feedback||'빈 공간을 지나 같은 그림을 찾아보세요.'}</p>
   <div className="sichuan-tools"><button disabled={blocked||!r.hints} onClick={()=>current('sichuan-hint')}>힌트 ({r.hints}/3)</button><button disabled={blocked||!r.manual} onClick={()=>current('sichuan-shuffle')}>섞기 ({r.manual}/3)</button><button disabled={working||cloud?.busy} onClick={()=>{setRestart(false);setConfirm(true)}}>그만하기</button></div>
   </>}
   {mode==='competition'&&<button disabled={working||cloud?.busy} onClick={()=>{setRestart(true);setConfirm(true)}}>새 보드로 다시 시작</button>}
   {confirm&&<div role="alertdialog" aria-label="사천성 종료 확인" className="sichuan-confirm"><p>{mode==='adventure'?`중간 종료할까요? 마지막 완료 단계의 ${r.completed?stages[r.completed-1].reward:0}코인을 한 번 정산해요.`:'지금 기록을 포기할까요? 완료하지 않은 기록은 랭킹에 올라가지 않아요.'}</p><button disabled={working||cloud?.busy} onClick={()=>{if(restart)void run({type:'sichuan-start',mode:'competition',nickname:r.nickname});else current('sichuan-stop');setConfirm(false)}}>종료 확정</button><button onClick={()=>setConfirm(false)}>계속하기</button></div>}
  </>}
  {error&&<p role="alert">{error}</p>}
  <section className="sichuan-ranking" aria-label="사천성 TOP 5"><h3>🏆 경쟁모드 TOP 5</h3><p>{cloud?'인증된 플레이어별 최고 기록 · 서버에서 연결과 시간을 검증해요.':'이 브라우저의 연습 기록이에요. 공용 랭킹에는 등록하지 않아요.'}</p>{!p.bests.length?<p>첫 번째 기록의 주인공이 되어 보세요!</p>:<ol>{ranking(p).map(x=><li key={x.playerId}><span>{x.nickname}</span><strong>{formatTime(x.elapsedMs)}</strong><time dateTime={new Date(x.at).toISOString()}>{new Date(x.at).toLocaleDateString('ko-KR')}</time></li>)}</ol>}<p>동일 기록은 먼저 달성한 순서예요. 닉네임을 바꿔도 같은 인증 계정의 기록은 하나만 표시해요.</p></section>
  <p className="sichuan-tip">창을 닫아도 진행 시간은 흘러요. 탐험은 기기 간 이어 할 수 있어요. 수동 섞기는 단계마다 3회이며 자동 섞기는 차감하지 않아요.</p>
 </section></div>
}
