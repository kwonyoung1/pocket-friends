import React,{useEffect,useRef,useState} from 'react'
import {HEROES,heroById,scale,partyErrors,current,act,enemyAction,skillIssue} from './model'
import type{State,Action,Skill}from './model'
import {BattleView}from './Battle'
import type{Cinematic}from './Battle'
import {ASSETS}from './assets'
import {arenaRoster,defaultParty,rosterBattle} from './integration'
import type {ArenaFriend} from './integration'
import './styles.css'
function Icon({name,size=18}:{name:string;size?:number}){const paths:Record<string,string>={star:'m12 2 2.8 6.2 6.7.8-5 4.5 1.4 6.7L12 17l-5.9 3.2 1.4-6.7-5-4.5 6.7-.8Z',arrow:'m9 5 7 7-7 7',back:'m15 5-7 7 7 7',sword:'m4 20 4-4m-2-3 5 5m-2-5L19 3l2 2-10 10',lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z',shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z',heart:'M12 20 4 12C-3 3 8-2 12 6 16-2 27 3 20 12z',check:'m5 12 4 4L20 5',settings:'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-8 0v6'};return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]??paths.star}/></svg>}
function App({friends}:{friends:readonly ArenaFriend[]}){const[roster]=useState(()=>arenaRoster(friends));const[ids,setIds]=useState<string[]>(()=>defaultParty(roster)),[level,setLevel]=useState<number|null>(null),[battle,setBattle]=useState<State|null>(null),[serial,setSerial]=useState(0),[detail,setDetail]=useState<string|null>(null)
 const errors=partyErrors(ids),cost=ids.reduce((n,id)=>n+heroById(id).cost,0)
 function start(boss=false){if(errors.length)return;setBattle(rosterBattle(ids,roster,level,boss));setSerial(n=>n+1)}
 if(battle)return <Combat key={serial} initial={battle} back={()=>setBattle(null)} restart={()=>start(battle.wave===2)}/>
 return <main className="shell party-view">
  <header className="brand"><div className="brand-mark"><Icon name="star" size={25}/></div><div><span className="eyebrow">POCKET FRIENDS · STARLIGHT ARENA</span><h1>별빛 아레나</h1></div><span className="version-badge">연습 전투</span></header>
  <section className="stage-card" aria-label="달빛 숲 스테이지"><img src={ASSETS.forest} alt="폭포와 달빛이 비치는 숲 전투 지역"/><div className="stage-shade"/><div className="stage-copy"><span className="eyebrow">CHAPTER 01 · MOONLIT WOODS</span><h2>달빛 숲</h2><p>작은 빛을 모아, 잠든 숲을 깨우세요.</p><span className="stage-pill">일반 몬스터 2종 · 숲의 수호자</span></div><div className="stage-number">01</div></section>
  <section className="party-heading"><div><span className="eyebrow">YOUR CONSTELLATION</span><h2>함께할 친구를 골라주세요</h2><p>영이 또는 찬미를 포함해 최대 4명</p></div><label className="level-control">전투 레벨<select aria-label="전투 레벨" value={level??'owned'} onChange={e=>setLevel(e.target.value==='owned'?null:Number(e.target.value))}><option value="owned">친구 실제 레벨</option>{[1,10,20,29,30,35,40,50].map(n=><option key={n} value={n}>연습 Lv.{n}</option>)}</select></label></section>
  <div className="cost-line"><span>PARTY <b>{ids.length}</b><small> / 4</small></span><span className={cost>10?'over':''}>COST <b>{cost}</b><small> / 10</small></span><div className="cost-dots" aria-hidden="true">{Array.from({length:10},(_,i)=><i key={i} className={i<cost?'filled':''}/>)}</div></div>
  <section className="roster" aria-label="파티 후보">{HEROES.map(h=>{const owned=roster.find(f=>f.id===h.id),chosen=ids.includes(h.id),heroLevel=level??owned?.level??1,f=scale(heroLevel),displayName=owned?.name??h.name;return <article key={h.id} className={`hero-card ${chosen?'chosen':''}`} style={{'--hero-color':h.color}as React.CSSProperties}>
   <button className="hero-select" disabled={!owned} aria-label={`${displayName} ${chosen?'편성 해제':'편성'}`} aria-pressed={chosen} onClick={()=>setIds(previous=>chosen?previous.filter(id=>id!==h.id):previous.concat(h.id))}>
    <div className="portrait"><span className="hero-level">Lv.{heroLevel}</span><span className="hero-cost">{h.cost}<small>COST</small></span><img src={ASSETS['card-'+h.art]} alt={`${displayName} ${h.title} 전신 일러스트`} loading="eager"/><span className="select-dot">{chosen&&<Icon name="check" size={14}/>}</span></div>
    <div className="hero-info"><span className="hero-title">{h.title}</span><h3>{displayName}<span>{owned?h.role:'우리 집에 없는 친구'}</span></h3><div className="stats">{[['HP',h.hp],['ATK',h.atk],['DEF',h.def*(h.id==='coco'&&heroLevel>=20?1.15:1)*(h.id==='coco'&&heroLevel>=40?1.2:1)],['SPD',h.spd]].map(([name,n])=><span key={name}><small>{name}</small><b>{Math.round(Number(n)*(name==='SPD'?1:f))}</b></span>)}</div></div>
   </button><button className="skill-detail" onClick={()=>setDetail(detail===h.id?null:h.id)} aria-expanded={detail===h.id}>스킬 · 해금 정보 <Icon name="arrow" size={12}/></button>
   {detail===h.id&&<div className="skill-list">{h.skills.map(k=><p key={k.id} className={heroLevel<k.unlock?'locked':''}><b>{k.name}</b><small>Lv.{k.unlock} · {k.description}</small></p>)}<p><b>Lv.10 / Lv.20 패시브</b><small>{h.id==='coco'?'Lv.10 기본 공격 +15% / Lv.20 방어 +15%':h.id==='bibi'?'Lv.10 기본 공격 +15% / Lv.20 회피율 15%':'Lv.10 기본 공격 피해 +15%'}</small></p><p><b>Lv.40 마스터리</b><small>{h.mastery}</small></p></div>}
  </article>})}</section>
  <aside className="prototype-note"><Icon name="shield"/><p>{level===null?'우리 친구의 현재 레벨로 출전해요.':'연습 레벨은 실제 성장에 반영되지 않아요.'}<br/>연습 전투 · 코인·경험치·아이템 지급 없음</p></aside>
  <div className="party-footer">{errors.length>0&&<p className="party-error" role="alert">{errors[0]}</p>}<div className="party-footer-row"><button className="boss-shortcut" disabled={!!errors.length} onClick={()=>start(true)}>보스전<br/><b>바로 체험</b></button><button className="enter-button" disabled={!!errors.length} onClick={()=>start()}><Icon name="star"/> 달빛 숲으로 출발 <Icon name="arrow"/></button></div><p>Lv.30 첫 스킬 · Lv.35 두 번째 스킬 · Lv.50 필살기</p></div>
 </main>
}
function Combat({initial,back,restart}:{initial:State;back:()=>void;restart:()=>void}){
 const[state,setState]=useState(initial),[busy,setBusy]=useState(true),[target,setTarget]=useState(initial.units.find(u=>u.side==='enemy')!.id),[cinematic,setCinematic]=useState<Cinematic>(null),[speed,setSpeed]=useState(1),[quality,setQuality]=useState(true),[short,setShort]=useState(false),[settings,setSettings]=useState(false),[error,setError]=useState('')
 const host=useRef<HTMLDivElement>(null),view=useRef<BattleView|null>(null),latest=useRef(state),locked=useRef(true),live=useRef(true);latest.current=state
 function options(){if(view.current){view.current.speed=speed;view.current.quality=quality;view.current.shortCutin=short}}
 useEffect(()=>{options()},[speed,quality,short])
 useEffect(()=>{live.current=true;const v=new BattleView(host.current!,id=>{if(!locked.current)setTarget(id)},setCinematic);view.current=v
  void v.init(initial).then(()=>{if(!live.current)return;return v.intro(initial.wave===2)}).then(()=>{if(live.current){locked.current=false;setBusy(false)}}).catch(e=>{if(live.current){setError('전투 화면을 준비하지 못했어요. WebGL을 지원하는 최신 브라우저에서 다시 열어주세요.');console.error(e)}})
  return()=>{live.current=false;v.destroy();view.current=null}
 },[])
 useEffect(()=>{view.current?.choose(target)},[target])
 async function perform(action:Action){
  if(locked.current||!view.current)return;locked.current=true;setBusy(true);setError('')
  const v=view.current,previous=latest.current,waveChange=action.next.wave!==previous.wave
  try{
   await v.play(action,()=>{if(live.current&&!waveChange){latest.current=action.next;setState(action.next);v.sync(action.next)}})
   if(!live.current)return
   latest.current=action.next;setState(action.next);v.sync(action.next)
   if(waveChange){setTarget(action.next.units.find(u=>u.side==='enemy')!.id);await v.intro(true)}
   if(action.next.phase==='victory')v.victory()
  }catch(e){if(live.current)setError('연출을 마치지 못했어요. 편성 화면에서 다시 시작해 주세요.');console.error(e)}
  finally{if(live.current){locked.current=false;setBusy(false)}}
 }
 useEffect(()=>{if(busy||state.phase!=='battle'||current(state).side!=='enemy')return;const timer=setTimeout(()=>{if(!locked.current)void perform(enemyAction(latest.current))},200);return()=>clearTimeout(timer)},[state,busy])
 const actor=current(state),allies=state.units.filter(u=>u.side==='ally'),aliveEnemies=state.units.filter(u=>u.side==='enemy'&&u.hp>0),hero=actor?.heroId?heroById(actor.heroId):null,order=state.order.slice(state.cursor).concat(state.order.slice(0,state.cursor)).map(id=>state.units.find(u=>u.id===id)!).filter(u=>u.hp>0).slice(0,7)
 function useSkill(k:Skill){if(busy||locked.current||!hero)return;const friendly=k.target==='ally'||k.target==='all-allies',valid=state.units.filter(u=>u.hp>0&&u.side===(friendly?'ally':'enemy')),chosen=valid.find(u=>u.id===target)??(friendly?valid.reduce((a,b)=>a.hp/a.maxHp<b.hp/b.maxHp?a:b):valid[0]);try{void perform(act(latest.current,k.id,chosen?.id))}catch(e){setError((e as Error).message)}}
 return <main className="shell battle-view" data-phase={state.phase} data-busy={busy} data-wave={state.wave} data-actor={actor?.id} data-side={actor?.side}>
  <header className="battle-header"><button className="icon-button" aria-label="편성으로 돌아가기" onClick={back} disabled={busy}><Icon name="back"/></button><div><span className="eyebrow">MOONLIT WOODS</span><h1>달빛 숲 <small>{state.wave===1?'숲의 길':'수호자의 터'}</small></h1></div><button className={`speed-button ${speed===2?'active':''}`} onClick={()=>setSpeed(n=>n===1?2:1)} aria-label="전투 속도">{speed}×</button><button className="icon-button" aria-label="전투 연출 설정" onClick={()=>setSettings(!settings)}><Icon name="settings"/></button></header>
  {settings&&<section className="battle-settings"><label><input type="checkbox" checked={quality} onChange={e=>setQuality(e.target.checked)}/> 풍부한 이펙트</label><label><input type="checkbox" checked={short} onChange={e=>setShort(e.target.checked)}/> 필살기 연출 단축</label><button disabled={busy} onClick={()=>{if(view.current&&allies[0]){setSettings(false);locked.current=true;setBusy(true);void view.current.previewCutin(allies[0],heroById(allies[0].heroId!).skills[3].name).finally(()=>{if(live.current){locked.current=false;setBusy(false)}})}}}>컷인 미리보기 <small>연출만 · 피해 없음</small></button></section>}
  <div className="turn-order" aria-label="행동 순서"><span className="round-label">ROUND<br/><b>{state.round}</b></span>{order.map((u,i)=><span key={u.id} className={`turn-chip ${u.side} ${i===0?'now':''}`}><i/>{u.name}</span>)}</div>
  <section className="field-shell" aria-label="전투 필드" data-cinematic={cinematic?.type??'none'}><div className="battle-canvas" ref={host}/><div className="field-topline"><span>WAVE {state.wave} / 2</span><span>{state.wave===2?'BOSS · FOREST GUARDIAN':'달빛이 머무는 숲'}</span></div>
   {cinematic&&<div className={`cinematic ${cinematic.type}`} role="status">{cinematic.type==='cutin'?<><img src={ASSETS['card-'+cinematic.art]} alt={`${cinematic.name} 필살기 일러스트`}/><div className="cutin-copy"><span>STARLIGHT FINISH</span><h2>{cinematic.skill}</h2><p>{cinematic.name}</p></div></>:<div className="boss-banner"><span>AN ANCIENT LIGHT AWAKENS</span><h2>{cinematic.name}</h2><p>다가오는 세 번째 행동: 뿌리의 격노</p></div>}</div>}
  </section>
  <section className="command-panel"><div className="party-hud" aria-label="아군 상태">{allies.map(u=><button key={u.id} className={`unit-hud ${u.hp<=0?'fallen':''} ${target===u.id?'targeted':''}`} onClick={()=>setTarget(u.id)} disabled={busy||u.hp<=0} aria-label={`${u.name} 아군 선택`}><b>{u.name}</b><span>{u.hp}<small> / {u.maxHp}</small></span><i><em style={{width:`${u.hp/u.maxHp*100}%`}}/></i>{u.shield>0&&<small className="shield-value">보호 {u.shield}</small>}</button>)}</div>
   <div className="action-heading"><div><span className="eyebrow">{busy?'ACTION IN PROGRESS':hero?'YOUR TURN':'ENEMY TURN'}</span><h2>{actor?.name??'별빛의 친구들'}<small>{busy?'행동 중…':hero?'의 차례':'의 행동을 기다려요'}</small></h2></div><div className="energy" aria-label={`별빛 ${actor?.mp??0}개`}>{Array.from({length:3},(_,i)=><i key={i} className={i<(actor?.mp??0)?'lit':''}/>)}</div></div>
   <div className="skills" aria-label="전투 스킬">{(hero?.skills??HEROES[0].skills).map(k=>{const reason=hero?skillIssue(actor,k):'적의 차례';return <button key={k.id} data-testid={'skill-'+k.id} className={`skill-button skill-${k.id}`} onClick={()=>useSkill(k)} disabled={busy||!hero||!!reason} title={k.description}><Icon name={reason?'lock':k.style==='heal'?'heart':k.style==='shield'?'shield':k.style==='command'?'star':'sword'} size={19}/><span><b>{k.name}</b><small>{reason||k.description}</small></span>{!reason&&k.cost>0&&<em>{k.cost}</em>}</button>})}</div>
   <div className="target-line"><span>대상 <b>{state.units.find(u=>u.id===target)?.name??aliveEnemies[0]?.name??'전투 종료'}</b></span><small>필드·아군을 눌러 선택</small></div>
  </section>
  <div className="battle-log" role="log">{state.log[0]}</div>
  {error&&<div className="battle-error" role="alert">{error}<button onClick={back}>편성으로</button></div>}
  {state.phase!=='battle'&&!busy&&<div className="result-overlay"><div className="result-card"><span className="result-crest"><Icon name={state.phase==='victory'?'star':'shield'} size={46}/></span><span className="eyebrow">{state.phase==='victory'?'A LITTLE LIGHT, A GREAT ADVENTURE':'REST, AND TRY AGAIN'}</span><h2>{state.phase==='victory'?'숲에 별빛이 돌아왔어요':'잠시 쉬어 가도 괜찮아요'}</h2><p>{state.phase==='victory'?'친구들의 작은 용기가 숲을 지켜냈어요.':'편성과 스킬을 바꾸어 다시 도전해 보세요.'}</p><div className="result-stats"><span>행동<b>{state.actions}</b></span><span>가한 피해<b>{state.totalDamage}</b></span><span>회복<b>{state.totalHeal}</b></span></div><button className="enter-button" onClick={back}>파티 다시 편성하기 <Icon name="arrow"/></button><button className="quiet-button" onClick={restart}>같은 파티로 다시 도전</button><small>연습 전투 · 코인·경험치·아이템 지급 없음</small></div></div>}
 </main>
}
export default function Arena({friends,close}:{friends:readonly ArenaFriend[];close:()=>void}){
 const root=useRef<HTMLDivElement>(null)
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';root.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'&&root.current){const controls=Array.from(root.current.querySelectorAll<HTMLElement>('button:not(:disabled),select,a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length>0);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===root.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus()}},[close])
 return <div className="starlight-arena" role="dialog" aria-modal="true" aria-label="별빛 아레나" tabIndex={-1} ref={root}><div className="arena-exit"><span>별빛 아레나 · 연습 전투</span><button onClick={close} aria-label="별빛 아레나 닫기">거실로 돌아가기</button></div><App friends={friends}/></div>
}
