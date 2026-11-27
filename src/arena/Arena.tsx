import {specialDescription} from './special-growth.ts'
import {upgradedSkill} from './skill-upgrades.ts'
import {STAGES} from './stages.ts'
import {skillTargets,skillScope,skillSummary,statusLabel} from './targeting.ts'
import {activeResonances,resonanceName} from './resonance.ts'
import {starsOf} from './fusion.ts'
import type {ResonanceHit} from './types.ts'
import {arenaOwner} from './identity.ts'
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react'
import {HEROES,heroById,current,skillIssue,equippedArenaBonus} from './model.ts'
import type {State,Action,Skill,Move,Unit} from './types.ts'
import {BattleView} from './Battle.ts'
import type {Cinematic} from './Battle.ts'
import {ASSETS} from './assets.ts'
import {ownedArenaRoster,rosterBattle} from './integration.ts'
import type {ArenaFriend} from './integration.ts'
import {Party} from './Party.tsx'
import type {Entry} from './Party.tsx'
import type {CloudGame} from '../cloud/protocol.ts'
import type {ArenaTicket,ArenaReward} from './state.ts'
import {ARENA_LIMITS} from './state.ts'
import {extendsCheckpoint,replay,ticketBattle,actForRules,enemyForRules,heroForRules,intentForRules} from './replay.ts'
import {stageById,regionById} from './stages.ts'
import {elementNames} from './characters.ts'
import './styles.css'
import './polish.css'
function Icon({name,size=18}:{name:string;size?:number}){const paths:Record<string,string>={star:'m12 2 2.8 6.2 6.7.8-5 4.5 1.4 6.7L12 17l-5.9 3.2 1.4-6.7-5-4.5 6.7-.8Z',arrow:'m9 5 7 7-7 7',back:'m15 5-7 7 7 7',sword:'m4 20 4-4m-2-3 5 5m-2-5L19 3l2 2-10 10',lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z',shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z',heart:'M12 20 4 12C-3 3 8-2 12 6 16-2 27 3 20 12z',check:'m5 12 4 4L20 5',settings:'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-8 0v6'};return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]??paths.star}/></svg>}
const arenaText=(text:string)=>text.replaceAll('환수','요정').replaceAll('공명','속성')
const arenaLog=(text:string,units:readonly Unit[])=>{const named=units.find(u=>text.startsWith(u.name+' · '));return named?named.name+' · '+arenaText(text.slice(named.name.length+3)):arenaText(text)}
const moveKey=(id:string)=>'pocket-friends-arena-run:'+id
function localMoves(ticket:ArenaTicket):Move[]{try{const m=JSON.parse(localStorage.getItem(moveKey(ticket.id))??'null');if(Array.isArray(m)&&m.length<=ARENA_LIMITS.moves&&extendsCheckpoint(ticket,m)){replay(ticket,m);return m}}catch{/* A damaged local rehearsal never replaces the server checkpoint. */}return structuredClone(ticket.moves)}
function App({friends,cloud,checkpoint}:{friends:readonly ArenaFriend[];cloud?:CloudGame;checkpoint:React.MutableRefObject<()=>void>}){
 const[battle,setBattle]=useState<State|null>(null),[run,setRun]=useState<ArenaTicket|null>(null),[serial,setSerial]=useState(0),[requested,setRequested]=useState<Entry|null>(null),[error,setError]=useState('')
 const moves=useRef<Move[]>([]),latestRun=useRef(run),latestCloud=useRef(cloud),entry=useRef<Entry|null>(null),winSent=useRef(false),checkpointLength=useRef(0),requestedPrevious=useRef<string|undefined>(undefined);latestRun.current=run;latestCloud.current=cloud
 useLayoutEffect(()=>{const dialog=document.querySelector('.starlight-arena');if(dialog)dialog.scrollTop=0},[!!battle,serial])
 const seasonAttempted=useRef(false)
 useEffect(()=>{if(cloud&&!cloud.busy&&!cloud.error&&(!cloud.row.data?.world?.arena?.sharedOwner||cloud.row.data.world.arena.season!==2)&&!seasonAttempted.current){seasonAttempted.current=true;void cloud.send({type:'arena-season-start'})}},[cloud?.row.revision,cloud?.busy,cloud?.error])
 const mine=cloud?.playerId?cloud.row.data?.world?.arena?.tickets[arenaOwner(cloud.row.data?.world?.arena,cloud.playerId)]:undefined
 function open(ticket:ArenaTicket){entry.current={ids:[...ticket.party],level:null,stageId:ticket.stageId,official:true};const history=localMoves(ticket),state=history.length?replay(ticket,history):ticketBattle(ticket);moves.current=history;checkpointLength.current=ticket.moves.length;winSent.current=false;setRun(ticket);setBattle(state);setSerial(n=>n+1);setRequested(null);setError('')}
 useEffect(()=>{if(requested&&mine?.status==='active'&&mine.id!==requestedPrevious.current&&mine.stageId===requested.stageId&&JSON.stringify(mine.party)===JSON.stringify(requested.ids))open(mine);else if(requested&&cloud?.error&&!cloud.busy){setRequested(null);setError(cloud.error)}},[cloud?.row.revision,cloud?.error,cloud?.busy,requested])
 function start(next:Entry){entry.current=next;setError('');if(next.official&&cloud){setBattle(null);requestedPrevious.current=mine?.id;setRequested(next);void cloud.send({type:'arena-start',stageId:next.stageId,party:next.ids});return}try{moves.current=[];winSent.current=false;setRun(null);setBattle(rosterBattle(next.ids,arenaRosterForEntry(),next.level,!!next.boss,next.stageId,next.costLimit));setSerial(n=>n+1)}catch(e){setError((e as Error).message)}}
 function arenaRosterForEntry(){return ownedArenaRoster(cloud?.row.data?.friends.map(f=>({id:f.id,name:f.name,kind:f.kind,level:f.growth?.level??1,gear:equippedArenaBonus(cloud?.row.data?.world?.equipment?.instances??[],f.id)}))??friends,cloud?.playerId?cloud.row.data?.world?.arena?.accounts?.[arenaOwner(cloud.row.data?.world?.arena,cloud.playerId)]:undefined)}
 function saveCheckpoint(){const t=latestRun.current,c=latestCloud.current;if(!t||!c||winSent.current||moves.current.length<=checkpointLength.current)return;checkpointLength.current=moves.current.length;void c.send({type:'arena-checkpoint',runId:t.id,moves:structuredClone(moves.current)})}
 checkpoint.current=saveCheckpoint
 useEffect(()=>{const hidden=()=>{if(document.hidden)checkpoint.current()};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden)},[])
 function record(move:Move){moves.current=moves.current.concat(move);const t=latestRun.current;if(t)try{localStorage.setItem(moveKey(t.id),JSON.stringify(moves.current))}catch{/* The server checkpoint remains valid; display remains playable. */}}
 function finish(){const t=latestRun.current,c=latestCloud.current;if(!t||!c||winSent.current)return;winSent.current=true;void c.send({type:'arena-complete',runId:t.id,moves:structuredClone(moves.current)})}
 function defeat(){const t=latestRun.current,c=latestCloud.current;if(!t||!c||winSent.current)return;winSent.current=true;void c.send({type:'arena-abandon',runId:t.id})}
 const receipt=mine?.id===run?.id&&mine?.status==='claimed'?mine.reward:undefined
 const retry=()=>{if(!run||!cloud)return;void cloud.retry();void cloud.send({type:'arena-complete',runId:run.id,moves:structuredClone(moves.current)})}
 return <><div hidden={!!battle}><Party friends={friends} cloud={cloud} start={start} starting={!!requested} error={error} resume={()=>{if(mine?.status==='active')open(mine)}}/></div>{battle&&<Combat key={serial} initial={battle} back={()=>{saveCheckpoint();setBattle(null)}} restart={()=>{if(entry.current)start(entry.current)}} record={record} checkpoint={saveCheckpoint} onWin={finish} onLose={defeat} settling={cloud?.busy} official={!!run} rules={run?.rules??8} receipt={receipt} rewardError={cloud?.error} retry={retry}/>}</>
}
function Combat({initial,back,restart,record,checkpoint,onWin,onLose,settling,official,rules,receipt,rewardError,retry}:{initial:State;back:()=>void;restart:()=>void;record:(move:Move)=>void;checkpoint:()=>void;onWin:()=>void;onLose:()=>void;settling?:boolean;official:boolean;rules:number;receipt?:ArenaReward;rewardError?:string;retry:()=>void}){
 const[selectedSkill,setSelectedSkill]=useState('basic'),[echoes,setEchoes]=useState<ResonanceHit[]>([])
 const[state,setState]=useState(initial),[busy,setBusy]=useState(true),[target,setTarget]=useState(initial.units.find(u=>u.side==='enemy')!.id),[cinematic,setCinematic]=useState<Cinematic>(null),[speed,setSpeed]=useState(1),[quality,setQuality]=useState(true),[short,setShort]=useState(false),[settings,setSettings]=useState(false),[error,setError]=useState('')
 const enemyInfo=useRef<HTMLDetailsElement>(null),host=useRef<HTMLDivElement>(null),view=useRef<BattleView|null>(null),latest=useRef(state),locked=useRef(true),live=useRef(true);latest.current=state
 function options(){if(view.current){view.current.speed=speed;view.current.quality=quality;view.current.shortCutin=short}}
 useEffect(()=>{options()},[speed,quality,short])
 useEffect(()=>{live.current=true;const v=new BattleView(host.current!,id=>{if(!locked.current)setTarget(id)},setCinematic);view.current=v
  void v.init(initial).then(()=>{if(!live.current)return;return v.intro(initial.units.some(u=>u.boss))}).then(()=>{if(live.current){locked.current=false;setBusy(false)}}).catch(e=>{if(live.current){setError('전투 화면을 준비하지 못했어요. WebGL을 지원하는 최신 브라우저에서 다시 열어주세요.');console.error(e)}})
  return()=>{live.current=false;v.destroy();view.current=null}
 },[])

 async function perform(action:Action){
  action={...action,skill:{...action.skill,name:arenaText(action.skill.name),description:arenaText(action.skill.description)}}
  if(locked.current||!view.current)return;if(enemyInfo.current)enemyInfo.current.open=false;locked.current=true;setBusy(true);setError('')
  const v=view.current,previous=latest.current,waveChange=action.next.wave!==previous.wave
  try{
   await v.play(action,()=>{if(action.resonances?.length)setEchoes(action.resonances);if(live.current&&!waveChange){latest.current=action.next;setState(action.next);v.sync(action.next)}})
   if(!live.current)return
   latest.current=action.next;setState(action.next);v.sync(action.next)
   if(waveChange){setTarget(action.next.units.find(u=>u.side==='enemy'&&u.hp>0)!.id);checkpoint();await v.intro(action.next.units.some(u=>u.boss))}
   if(action.next.phase==='victory')v.victory()
  }catch(e){if(live.current)setError('연출을 마치지 못했어요. 편성 화면에서 다시 시작해 주세요.');console.error(e)}
  finally{if(live.current){locked.current=false;setBusy(false)}}
 }
 useEffect(()=>{if(busy||state.phase!=='battle'||current(state).side!=='enemy')return;const timer=setTimeout(()=>{if(!locked.current)void perform(enemyForRules(rules,latest.current))},200);return()=>clearTimeout(timer)},[state,busy])
 useEffect(()=>{if(!busy&&official){if(state.phase==='victory')onWin();else if(state.phase==='defeat')onLose()}},[state.phase,busy,official])
 const stage=state.stageId?stageById(state.stageId):undefined,region=stage?regionById(stage.region):undefined
 const actor=current(state),allies=state.units.filter(u=>u.side==='ally'),aliveEnemies=state.units.filter(u=>u.side==='enemy'&&u.hp>0),baseHero=actor?.heroId?heroForRules(rules,actor.heroId,actor.kind):null,hero=baseHero?{...baseHero,skills:baseHero.skills.map(k=>rules>=4?upgradedSkill(k,actor.skillLevels?.[k.id]):k)}:null,order=state.order.slice(state.cursor).concat(state.order.slice(0,state.cursor)).map(id=>state.units.find(u=>u.id===id)!).filter(u=>u.hp>0).slice(0,7)
 const selected=hero?.skills.find(k=>k.id===selectedSkill)??hero?.skills[0]
 const validTarget=(k:Skill)=>{const friendly=k.target==='ally'||k.target==='all-allies',valid=state.units.filter(u=>u.hp>0&&u.side===(friendly?'ally':'enemy'));return valid.find(u=>u.id===target)??(friendly?valid.reduce<Unit|undefined>((a,b)=>!a||b.hp/b.maxHp<a.hp/a.maxHp?b:a,undefined):valid[0])}
 const preview=selected&&actor&&state.phase==='battle'?skillTargets(state,actor,selected,validTarget(selected)?.id):[]
 const focusEnemy=aliveEnemies.find(u=>u.id===target)??aliveEnemies[0],enemyNumbers=new Map(state.units.filter(u=>u.side==='enemy').map((u,i)=>[u.id,i+1]))
 const resonances=rules>=3?activeResonances(state.units,actor?.id):[]
 useEffect(()=>{setSelectedSkill('basic')},[actor?.id])
 useEffect(()=>{view.current?.choose(target,busy?[]:preview.map(u=>u.id))},[target,selectedSkill,state,busy])
 function useSkill(k:Skill){if(busy||locked.current||!hero)return;const chosen=validTarget(k);try{const action=actForRules(rules,latest.current,k.id,chosen?.id);record({skill:k.id,target:chosen?.id??''});void perform(action)}catch(e){setError((e as Error).message)}}
 return <main className="shell battle-view" data-phase={state.phase} data-busy={busy} data-rules={rules} data-wave={state.wave} data-actor={actor?.id} data-side={actor?.side}>
  <header className="battle-header"><button className="icon-button" aria-label="편성으로 돌아가기" onClick={back} disabled={busy}><Icon name="back"/></button><div><span className="eyebrow">{stage?.id??'MOONLIT WOODS'}</span><h1>{region?.name??'달빛 숲'} <small>{state.wave}/{state.maxWaves} 웨이브</small></h1></div><button className={`speed-button ${speed===2?'active':''}`} onClick={()=>setSpeed(n=>n===1?2:1)} aria-label="전투 속도">{speed}×</button><button className="icon-button" aria-label="전투 연출 설정" onClick={()=>setSettings(!settings)}><Icon name="settings"/></button></header>
  {settings&&<section className="battle-settings"><label><input type="checkbox" checked={quality} onChange={e=>setQuality(e.target.checked)}/> 풍부한 이펙트</label><label><input type="checkbox" checked={short} onChange={e=>setShort(e.target.checked)}/> 필살기 연출 단축</label><button disabled={busy} onClick={()=>{if(view.current&&allies[0]){setSettings(false);locked.current=true;setBusy(true);void view.current.previewCutin(allies[0],heroById(allies[0].heroId!).skills[3].name).finally(()=>{if(live.current){locked.current=false;setBusy(false)}})}}}>컷인 미리보기 <small>연출만 · 피해 없음</small></button></section>}
  <div className="turn-order" aria-label="행동 순서"><span className="round-label">ROUND<br/><b>{state.round}</b></span>{order.map((u,i)=><span key={`${u.id}-${i}`} className={`turn-chip ${u.side} ${i===0?'now':''}`}><i/>{u.name}</span>)}</div>
  {resonances.length>0&&<div className="battle-resonance" aria-label="현재 공격자의 요정 속성">{resonances.map(r=><span key={r.element} data-element={r.element}>{resonanceName(r.element)}</span>)}</div>}
  <section className={`field-shell ${stage?.event?'winter-field':''}`} aria-label="전투 필드" data-cinematic={cinematic?.type??'none'}><div className="battle-canvas" ref={host}/>{stage?.event&&<div className="winter-snow" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${i*9}%`,animationDelay:`${-i*.7}s`}}/>)}</div>}<div className="field-topline"><span>WAVE {state.wave} / {state.maxWaves}</span><span>{region?.subtitle??'달빛이 머무는 숲'}</span></div>{focusEnemy&&<details className="enemy-intel" ref={enemyInfo}><summary aria-label="선택한 적 상세 정보">대상 정보 · {enemyNumbers.get(focusEnemy.id)}</summary><div><h3>{focusEnemy.name}{focusEnemy.boss?' · BOSS':''}</h3><p>HP {focusEnemy.hp.toLocaleString()} / {focusEnemy.maxHp.toLocaleString()}</p><p>약점 {focusEnemy.weakness.map(e=>elementNames[e]).join(' · ')} · {focusEnemy.broken?'BREAK':`격파 ${focusEnemy.toughness}/${focusEnemy.maxToughness}`}</p><p>{focusEnemy.statuses.map(statusLabel).join(' · ')||'상태 이상 없음'}</p>{rules>=6&&<p>{intentForRules(rules,state,focusEnemy).label}</p>}<small>번호가 같은 필드의 발밑 원과 연결돼요. 금빛은 주 대상, 푸른빛은 스킬 범위예요.</small></div></details>}
   {cinematic&&<div className={`cinematic ${cinematic.type}`} role="status">{cinematic.type==='cutin'?<><img src={ASSETS['card-'+cinematic.art]} alt={`${cinematic.name} 필살기 일러스트`}/><div className="cutin-copy"><span>STARLIGHT FINISH</span><h2>{cinematic.skill?arenaText(cinematic.skill):''}</h2><p>{cinematic.name}</p></div></>:<div className={`boss-banner ${cinematic.art==='christmas'?'winter-boss':''}`}><span>{cinematic.art==='christmas'?'겨울밤의 선물 · 장난꾸러기 보스':'AN ANCIENT LIGHT AWAKENS'}</span><h2>{cinematic.name}</h2><p>결계·광역·약화 패턴에 대비하세요</p></div>}</div>}
  </section>
  <section className="command-panel"><div className="party-hud" aria-label="아군 상태">{allies.map(u=><button key={u.id} data-preview={preview.some(t=>t.id===u.id)} className={`unit-hud ${u.hp<=0?'fallen':''} ${target===u.id?'targeted':''}`} onClick={()=>setTarget(u.id)} disabled={busy||u.hp<=0} aria-label={`${u.name} 아군 선택`}><b>{u.name}{u.stars?` ★${starsOf(u)}`:""}</b><span>{u.hp}<small> / {u.maxHp}</small></span><small className="status-tags">{u.statuses.slice(0,2).map(e=>({burn:'화상',poison:'독',bleed:'출혈',freeze:'빙결',stun:'기절',regen:'재생','attack-up':'공격↑','defense-up':'방어↑','speed-up':'속도↑','defense-down':'방어↓',slow:'감속',counter:'반격','evasion-down':'회피↓'}[e.type])+e.turns).join(' · ')}</small><i><em style={{width:`${u.hp/u.maxHp*100}%`}}/></i>{u.moonGrace&&<small className="grace-value">달빛의 가호 · 차단 1회</small>}{u.shield>0&&<small className="shield-value">보호 {u.shield}</small>}</button>)}</div>
   <div className="action-heading"><div><span className="eyebrow">{busy?'ACTION IN PROGRESS':hero?'YOUR TURN':'ENEMY TURN'}</span><h2>{actor?.name??'별빛의 친구들'}<small>{busy?'행동 중…':hero?'의 차례':'의 행동을 기다려요'}</small></h2></div><div className="energy" aria-label={`별빛 ${actor?.mp??0}개`}>{Array.from({length:3},(_,i)=><i key={i} className={i<(actor?.mp??0)?'lit':''}/>)}</div></div>
   <div className="skills" aria-label="전투 스킬">{(hero?.skills??HEROES[0].skills).map(k=>{const reason=hero?skillIssue(actor,k):'적의 차례';return <button key={k.id} data-testid={'skill-'+k.id} aria-pressed={selected?.id===k.id} className={`skill-button skill-${k.id}`} onClick={()=>setSelectedSkill(k.id)} disabled={busy||!hero||!!reason} title={`${hero?elementNames[hero.element]:""} · ${skillSummary(k)}`}><Icon name={reason?'lock':k.style==='heal'?'heart':k.style==='shield'?'shield':k.style==='command'?'star':'sword'} size={19}/><span><b>{arenaText(k.name)}</b><small><i className="scope-icon" aria-hidden="true">{k.target.startsWith("all-")?"全":k.targetCount??1}</i> {skillScope(k)} · {reason||`별빛 ${k.cost}`}</small></span>{!reason&&k.cost>0&&<em>{k.cost}</em>}</button>})}</div>
   <div className="skill-preview"><details><summary>{selected?`${elementNames[actor.element]} · ${skillScope(selected)} · ${preview.length}명 선택`:"적의 행동 중"}</summary>{selected&&<p>{arenaText(skillSummary(selected))} · {arenaText(selected.description)}{rules>=8&&actor?.heroId&&<><br/>{specialDescription(actor.heroId,actor.training)}</>}</p>}</details><button onClick={()=>selected&&useSkill(selected)} disabled={busy||!selected||!hero||!!skillIssue(actor,selected)||!preview.length}>선택한 스킬 사용</button></div>
   <div className="target-line"><span>대상 <b>{preview.map(u=>u.name).join(' · ')||aliveEnemies[0]?.name||'전투 종료'}</b></span><small>필드·아군을 눌러 선택</small></div>
  </section>
  <div className="enemy-hud" data-count={aliveEnemies.length} aria-label="적 약점과 상태">{aliveEnemies.map(u=><button key={u.id} data-preview={preview.some(t=>t.id===u.id)} disabled={busy} onClick={()=>setTarget(u.id)} aria-pressed={target===u.id}><b>{enemyNumbers.get(u.id)} · {u.name}</b><small>HP {u.hp}/{u.maxHp}</small><small className="enemy-weakness">약점 {u.weakness.map(e=>elementNames[e]).join('·')} · {u.broken?'BREAK':`${u.toughness}/${u.maxToughness}`}</small><small className="enemy-status">{u.statuses.map(statusLabel).join(' · ')}</small>{rules>=6&&<small className="enemy-intent">{intentForRules(rules,state,u).label}</small>}</button>)}</div>
  <div className="battle-log" role="log"><span>{arenaLog(state.log[0],state.units)}</span>{echoes.length>0&&<span data-testid="resonance-results">최근 속성 · {[...new Set(echoes.map(h=>h.element))].map(e=>`${resonanceName(e)} +${echoes.filter(h=>h.element===e).reduce((n,h)=>n+h.damage,0)}`).join(' · ')}</span>}</div>
  {error&&<div className="battle-error" role="alert">{error}<button onClick={back}>편성으로</button></div>}
  {state.phase!=='battle'&&!busy&&<div className="result-overlay"><div className="result-card"><span className="result-crest"><Icon name={state.phase==='victory'?'star':'shield'} size={46}/></span><span className="eyebrow">{state.phase==='victory'?'A LITTLE LIGHT, A GREAT ADVENTURE':'REST, AND TRY AGAIN'}</span><h2>{state.phase==='victory'?'다시 별빛이 반짝여요':'잠시 쉬어 가도 괜찮아요'}</h2><p>{state.phase==='victory'?'친구들의 작은 용기가 새로운 길을 열었어요.':'편성과 스킬을 바꾸어 다시 도전해 보세요.'}</p><div className="result-stats"><span>행동<b>{state.actions}</b></span><span>가한 피해<b>{state.totalDamage}</b></span><span>회복<b>{state.totalHeal}</b></span></div><button className="enter-button" onClick={back}>파티 다시 편성하기 <Icon name="arrow"/></button><button className="quiet-button" disabled={official&&(settling||state.phase==='victory'&&!receipt)} onClick={restart}>같은 파티로 다시 도전</button>{official?<section className="reward-receipt" role="status">{receipt?<><b>{receipt.capped?'오늘 코인 한도 · 지급된 상자와 진행은 보존돼요.':`${receipt.coins}코인 · 친구별 XP 최대 ${receipt.xp}${receipt.stones?' · 강화석 '+receipt.stones:''}`}</b><p>{receipt.first?'첫 클리어':'반복 클리어'}{receipt.treasure?' · 희귀 보물 획득':''}{receipt.chests?' · 보물상자 '+Object.values(receipt.chests).reduce((n,v)=>n+(v??0),0)+'개':''}</p></>:state.phase==='victory'?<><p>{rewardError||'서버가 전투 기록과 보상을 확인하고 있어요…'}</p>{rewardError&&<button className="quiet-button" onClick={retry}>같은 기록으로 보상 다시 확인</button>}</>:<p>클리어 보상 없이 안전하게 귀환해요.</p>}</section>:<small>연습 전투 · 코인·경험치·아이템 지급 없음</small>}</div></div>}
 </main>
}
export default function Arena({friends,close,cloud}:{friends:readonly ArenaFriend[];close:()=>void;cloud?:CloudGame}){
 const root=useRef<HTMLDivElement>(null),checkpoint=useRef<()=>void>(()=>{});const leave=()=>{checkpoint.current();close()}
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';root.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();leave()}if(e.key==='Tab'&&root.current){const controls=Array.from(root.current.querySelectorAll<HTMLElement>('button:not(:disabled),select,summary,a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length>0);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus()}},[close])
 return <div className="starlight-arena" role="dialog" aria-modal="true" aria-label="별빛 아레나" tabIndex={-1} ref={root}><div className="arena-exit"><span>별빛 아레나 시즌 2 · {STAGES.length} 스테이지</span><button onClick={leave} aria-label="별빛 아레나 닫기">거실로 돌아가기</button></div><App friends={friends} cloud={cloud} checkpoint={checkpoint}/></div>
}
