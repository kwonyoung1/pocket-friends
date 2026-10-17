import {SichuanPanel} from './sichuan/Panel'
import {room,leftPercent,topPercent} from './room/config'
import {upgradeRoom} from './room/migrate'
import {defaultTaste} from './adventure/catalog'
import { specialIds } from './humans/config'
import { grantSpecialFriends } from './humans/model'
import { itemById } from './progression/config'
import { LifePanel, RoomExtras, DiscoveryNotice } from './expansion/UI'
import type { Draft } from './expansion/UI'
import { settleLife, attachNavigation, furnitureDestination } from './expansion/model'
import type { CloudGame } from './cloud/protocol'
import { careNeeds, needLabels, isSpecialCharacter } from './careNeeds'
import { normalPet, petRewardLabel } from './interaction'
import { initialSnapshot, saveSnapshot, storageWarning, beforeRestore, rawBackup } from './storage'
import { completeExpeditions, growth, world } from './progression/model'
import { GameMenu, GrowthBar, LegendaryNotice, menus, remaining } from './progression/Menu'
import type { MenuTab } from './progression/Menu'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowDownToLine, ArrowUpRight, Bath, Camera, Check, ChevronRight, Cloud, Coins, Heart, House, ImagePlus, Leaf, Moon, PawPrint, Sparkles, Sun, Utensils, Volume2, VolumeX, X, Zap } from 'lucide-react'
import { Character } from './Character'
import { RoomArt } from './Room'
import { InteractiveFriend } from './InteractiveFriend'
import { interactionBalance } from './balance'
import { care, clamp, createFriends, decay, parseSave, tick, restLabel } from './game'
import type { Care, Friend, Memory, Save, Stats } from './game'

function load() {
  try {
    const raw = initialSnapshot()
    if (raw) return { data: parseSave(raw), warning: storageWarning }
  } catch { return { data: fresh(), warning: '저장 데이터를 읽지 못했어요. 브라우저의 저장 공간 설정을 확인해 주세요.' } }
  return { data: fresh(), warning: storageWarning }
}
function fresh(): Save { const save: Save = { version: 2, savedAt: Date.now(), friends: createFriends(), memories: [] }; world(save); upgradeRoom(save); return save }
const statInfo: { key: keyof Stats; name: string; color: string; icon: typeof Heart }[] = [
  { key: 'hunger', name: '포만감', color: '#d8a473', icon: Utensils },
  { key: 'happiness', name: '행복도', color: '#df9d9e', icon: Sun },
  { key: 'energy', name: '체력', color: '#a1b496', icon: Zap },
  { key: 'hygiene', name: '청결도', color: '#9bbac7', icon: Bath },
]
const careInfo: { action: Care; label: string; hint: string; icon: typeof Heart }[] = [
  { action: 'feed', label: '먹이 주기', hint: '보유한 음식 고르기', icon: Utensils },
  { action: 'pet', label: '쓰다듬기', hint: `행복 +${interactionBalance.normal.happiness} · 친밀 +${interactionBalance.normal.affection}`, icon: Heart },
  { action: 'wash', label: '씻겨 주기', hint: '30분 · 하루 두 번', icon: Bath },
  { action: 'rest', label: '쉬게 하기', hint: '체력 +20', icon: Moon },
]
const time = (at: number) => new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
function mood(f: Friend) {
  if (f.stats.hunger < 30) return '간식이 필요해요'
  if (f.stats.energy < 30) return '조금 피곤해요'
  if (f.stats.hygiene < 30) return '씻고 싶어요'
  if (f.stats.happiness < 30) return '관심이 필요해요'
  return '기분이 좋아요'
}
type Crop = { src: string; target: string; ratio: number; zoom: number; x: number; y: number }
const cropBounds = (crop: Crop, zoom = crop.zoom) => ({ x: Math.floor((Math.max(1, crop.ratio) * zoom - 1) * 50), y: Math.floor((Math.max(1, 1 / crop.ratio) * zoom - 1) * 50) })
function App({ cloud }: { cloud?: CloudGame }) {
  const [initial] = useState(() => {if(!cloud?.row.data)return load();const data=structuredClone(cloud.row.data);upgradeRoom(data);return{data,warning:''}})
  const claimedSpecial=useRef(false)
  const cloudRef = useRef(cloud); cloudRef.current = cloud
  const model = useRef(initial.data)
  const serverPositions=useRef(new Map<string,{x:number;y:number}>())
  const seenEvents = useRef(new Set<string>())
  const [, render] = useState(0)
  const [selected, setSelected] = useState('momo')
  const [notice, setNotice] = useState(initial.warning)
  const [sichuanOpen,setSichuanOpen]=useState(false)
  const [lifeOpen,setLifeOpen]=useState(false)
  const [careOpen,setCareOpen]=useState(false)
  const [draft,setDraft]=useState<Draft|null>(null)
  const [menu, setMenu] = useState<MenuTab | null>(null)
  const [restore, setRestore] = useState<Save | null>(null)
  const [restoring, setRestoring] = useState(false)
  const restoreRef = useRef<HTMLInputElement>(null)
  const [storageError, setStorageError] = useState(!!rawBackup())
  const [savedAt, setSavedAt] = useState(initial.data.savedAt)
  const [sound, setSound] = useState(false)
  const [crop, setCrop] = useState<Crop | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const roomCamera=useRef<HTMLDivElement>(null)
  const uploadTarget = useRef('momo')
  const audio = useRef<AudioContext | null>(null)
  const friends = model.current.friends
  if(!cloud) {upgradeRoom(model.current);world(model.current).adventureVersion=1; for(const f of friends)f.foodTaste??=defaultTaste(f.id)}
  const friend = friends.find(f => f.id === selected)!
  const notify = useCallback((message: string) => setNotice(message), [])
  const persist = useCallback(() => {
    if (cloudRef.current) return // Local saves are never overwritten with cloud state.
    model.current.savedAt = Date.now()
    saveSnapshot(JSON.stringify(model.current), (local, indexed) => {
      setStorageError(!local || !indexed)
      if (local || indexed) setSavedAt(model.current.savedAt)
    })
  }, [])
  useEffect(()=>{if(claimedSpecial.current)return;claimedSpecial.current=true;if(cloudRef.current){if(!specialIds.every(id=>model.current.friends.some(f=>f.id===id)))void cloudRef.current.send({type:'claim-special-friends'})}else{grantSpecialFriends(model.current);persist();render(v=>v+1)}},[persist])
  const remember = useCallback((text: string) => {
    const entry: Memory = { id: crypto.randomUUID(), text, at: Date.now() }
    model.current.memories = [entry, ...model.current.memories].slice(0, 20)
  }, [])
  const bonded = useCallback((f: Friend) => {
    if (cloudRef.current) { if (f.remoteHoldId) void cloudRef.current.send({ type: 'pet-special', friendId: f.id, holdId: f.remoteHoldId }); return }
    remember(`${f.name}와 오래 마음을 나눴어요 ♡`); persist()
  }, [remember, persist])
  useEffect(() => {
    if (!cloud?.row.data) return
    const snapshot = structuredClone(cloud.row.data)
    upgradeRoom(snapshot)
    // Keep the same friend objects so captured pointers and local motion survive sync.
    for (const old of model.current.friends) {
      const server = snapshot.friends.find(f => f.id === old.id)
      if (!server) continue
      const pose = { x: old.x, y: old.y, route: old.route, facing: old.facing, interaction: old.interaction, remoteHoldId: old.remoteHoldId, bubble: old.bubble, bubbleUntil: old.bubbleUntil, bubblePriority: old.bubblePriority, nextSpeech: old.nextSpeech, socialUntil: old.socialUntil, restingUntil: old.restingUntil }
      if (server.growth) server.growth.events = server.growth.events.filter(text => { const key = `${old.id}:${text}`; if (seenEvents.current.has(key)) return false; seenEvents.current.add(key); return true })
      const previous=serverPositions.current.get(server.id),moved=previous&&(previous.x!==server.x||previous.y!==server.y)
      const manualRest = server.lastRestRewardAt !== old.lastRestRewardAt && (server.restingUntil ?? 0) > cloud.now()
      Object.assign(old, server, pose, manualRest ? { restingUntil: server.restingUntil, route: [], moving: false } : {}, moved&&!old.interaction?.gesture?{x:server.x,y:server.y,route:[]}: {}, { remoteAuthoritative: true })
      serverPositions.current.set(server.id,{x:server.x,y:server.y})
      if (server.growth?.awayJobId) { old.interaction = undefined; old.route = [] }
    }
    for(const added of snapshot.friends.filter(f=>!model.current.friends.some(old=>old.id===f.id))){
      model.current.friends.push({...added,remoteAuthoritative:true})
      serverPositions.current.set(added.id,{x:added.x,y:added.y})
    }
    model.current.world = snapshot.world; model.current.memories = snapshot.memories; model.current.savedAt = snapshot.savedAt
    setSavedAt(snapshot.savedAt); render(v => v + 1)
  }, [cloud?.row.revision])
  useEffect(() => {
    let frame = 0, previous = performance.now(), lastRender = 0, hiddenAt = 0, lastWorldCheck = -1000
    const loop = (stamp: number) => {
      const dt = Math.min(Math.max((stamp - previous) / 1000, 0), .15)
      previous = stamp
      if (stamp - lastWorldCheck >= 1000) {
        lastWorldCheck = stamp
        if(!cloudRef.current)settleLife(model.current)
        attachNavigation(model.current)
        model.current.friends.forEach(f=>furnitureDestination(f,model.current,Date.now()))
        const returns = cloudRef.current ? [] : completeExpeditions(model.current)
        if (returns.length) { returns.forEach(remember); setNotice(returns.join(' · ')); persist() }
      }
      tick(model.current.friends, Date.now(), dt, cloudRef.current ? () => {} : remember, bonded, !!cloudRef.current)
      if (model.current.friends.some(f => f.interaction?.gesture) || stamp - lastRender > 80) { render(v => v + 1); lastRender = stamp }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    const interval = window.setInterval(persist, 5000)
    const visibility = () => {
      if (document.hidden) { hiddenAt = Date.now(); persist() }
      else {
        if (hiddenAt && !cloudRef.current) for (const f of model.current.friends) f.stats = decay(f.stats, Date.now() - hiddenAt)
        hiddenAt = 0; previous = performance.now()
      }
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', persist)
    return () => { cancelAnimationFrame(frame); clearInterval(interval); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', persist) }
  }, [persist, remember, bonded])
  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(''), 5500)
    return () => clearTimeout(id)
  }, [notice])
  const chime = () => {
    if (!sound) return
    try {
      const ctx = audio.current ??= new AudioContext()
      void ctx.resume()
      const oscillator = ctx.createOscillator(), gain = ctx.createGain()
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(660, ctx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + .12)
      gain.gain.setValueAtTime(.06, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .3)
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + .3)
    } catch { /* Audio is optional; care actions remain available. */ }
  }
  const doCare = (action: Care) => {
    if(action==='feed'){if(!Object.entries(world(model.current).inventory).some(([id,n])=>n>0&&itemById[id]?.category==='food'))notify('먹이가 없어요! 상점에서 구매해 주세요.');setMenu('inventory');return}
    if(action==='wash'){setLifeOpen(true);return}
    if (cloud) { if (action === 'pet') normalPet(friend, Date.now()); void cloud.send({ type: 'care', action, friendId: friend.id }); return }
    const line = care(friend, action)
    if (!line) { notify('친구가 마음을 느끼고 있어요. 잠깐만 기다려 주세요 ♡'); return }
    const labels = { feed: '에게 맛있는 간식을 주었어요', pet: '를 다정하게 쓰다듬었어요', wash: '를 보송하게 씻겨 주었어요', rest: '가 포근하게 쉬고 있어요' }
    remember(friend.name + labels[action]); chime(); persist(); render(v => v + 1)
    notify(`${friend.name}: ${line}`)
  }
  const beginUpload = (id: string) => { uploadTarget.current = id; fileRef.current?.click() }
  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { notify('JPG, PNG, WebP 사진을 선택해 주세요.'); return }
    if (file.size > 12 * 1024 * 1024) { notify('사진은 12MB 이하로 등록해 주세요.'); return }
    setImageBusy(true)
    const url = URL.createObjectURL(file)
    try {
      const img = new Image(); img.src = url; await img.decode()
      const canvas = document.createElement('canvas')
      const resize = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight))
      canvas.width = Math.max(1, Math.round(img.naturalWidth * resize)); canvas.height = Math.max(1, Math.round(img.naturalHeight * resize))
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      setCrop({ src: canvas.toDataURL('image/webp', .9), target: uploadTarget.current, ratio: canvas.width / canvas.height, zoom: 1, x: 0, y: 0 })
    } catch { notify('사진을 열 수 없어요. 다른 사진으로 다시 시도해 주세요.') }
    finally { URL.revokeObjectURL(url); setImageBusy(false) }
  }
  const savePhoto = async () => {
    if (!crop) return
    setImageBusy(true)
    try {
      const img = new Image(); img.src = crop.src; await img.decode()
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
      const context = canvas.getContext('2d')!
      const width = 256 * Math.max(1, crop.ratio) * crop.zoom, height = 256 * Math.max(1, 1 / crop.ratio) * crop.zoom
      context.drawImage(img, (256 - width) / 2 + crop.x / 100 * 256, (256 - height) / 2 + crop.y / 100 * 256, width, height)
      const target = friends.find(f => f.id === crop.target)!
      const photo = canvas.toDataURL('image/webp', .85)
      if (cloud) { await cloud.send({ type: 'photo', friendId: target.id, photo }); setCrop(null); return }
      target.photo = photo
      remember(`${target.name}에게 새로운 모습을 선물했어요`)
      persist(); setCrop(null); notify('우리 친구의 새 모습이 등록되었어요!')
    } catch { notify('사진 등록에 실패했어요. 다시 시도해 주세요.') }
    finally { setImageBusy(false) }
  }
  const exportSave = () => {
    persist()
    const url = URL.createObjectURL(new Blob([(cloud ? JSON.stringify(model.current, null, 2) : rawBackup() ?? JSON.stringify(model.current, null, 2))], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'pocket-friends-backup.json'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('친구들의 추억을 파일로 보관했어요.')
  }
  const chooseBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    if (cloud) { notify('클라우드 월드는 브라우저 백업으로 덮어쓰지 않아요. 기존 기기 원본도 그대로 보관돼요.'); event.target.value = ''; return }
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { notify('백업 파일은 8MB 이하로 선택해 주세요.'); return }
    try { setRestore(parseSave(await file.text())) } catch (error) { notify(`복원하지 못했어요: ${error instanceof Error ? error.message : '올바른 JSON 백업을 선택해 주세요.'}`) }
  }
  const confirmRestore = async () => {
    if (cloud) return
    if (!restore || restoring) return
    setRestoring(true)
    try {
      await beforeRestore(rawBackup() ?? JSON.stringify(model.current))
      grantSpecialFriends(restore)
      model.current = restore
      completeExpeditions(model.current)
      setRestore(null); setMenu(null); persist(); render(v => v + 1); notify('기존 게임을 백업하고 추억을 복원했어요!')
    } catch (error) { notify(error instanceof Error ? error.message : '복원에 실패했어요.') }
    finally { setRestoring(false) }
  }
  return <div className="app-shell">
    <header className="header">
      <a className="brand" href="#home" aria-label="포켓프렌즈 홈"><span className="brand-icon"><PawPrint size={24} strokeWidth={1.8} /></span><span>포켓프렌즈<small>POCKET FRIENDS</small></span></a>
      <div className="header-center"><House size={15} /> 우리의 작은 집</div>
      <div className="header-tools"><button className="coin-badge" aria-label={`보유 코인 ${world(model.current).coins}`} onClick={() => setMenu('shop')}><Coins size={16} />{world(model.current).coins.toLocaleString()}</button><span className={`save-indicator ${storageError ? 'error' : ''}`} title={storageError ? '저장 공간을 확인해 주세요' : `${time(savedAt)} 저장됨`}><Cloud size={16} /><span>{cloud ? '클라우드 연결' : storageError ? '저장 실패' : '자동 저장 중'}</span></span><span className="tool-divider" /><button className="icon-button" aria-label={sound ? '효과음 끄기' : '효과음 켜기'} title={sound ? '효과음 끄기' : '효과음 켜기'} onClick={() => setSound(v => !v)}>{sound ? <Volume2 size={19} /> : <VolumeX size={19} />}</button></div>
    </header>
    <main id="home">
      <section className="intro"><div><div className="eyebrow"><span /> LITTLE FRIENDS, LITTLE HAPPINESS</div><h1>오늘도 함께라서, <span>포근한 하루.</span></h1><p>작은 친구들의 일상에 당신의 다정함을 더해 주세요.</p></div><div className="today"><Sun size={29} strokeWidth={1.4} /><div><strong>{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</strong><span>우리 집은 언제나 맑음</span></div></div></section>
      {storageError && <div className="storage-warning" role="alert">일부 저장소에 저장하지 못했어요. 저장 공간과 사이트 권한을 확인하고, 아래 ‘추억 보관’으로 데이터를 백업해 주세요.</div>}
      <nav className="adventure-nav" aria-label="성장과 모험 메뉴">{menus.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} onClick={() => { setMenu(id); }}><Icon size={17} /><span>{label}</span>{id === 'inventory' && <small>{Object.values(world(model.current).inventory).reduce((s, n) => s + n, 0)}</small>}</button>)}<button onClick={()=>setSichuanOpen(true)}>사천성</button><button className="life-nav-button" onClick={()=>setLifeOpen(true)}>생활·입양</button></nav>
      <div className="game-layout">
        <section className="room-panel" aria-label="친구들이 생활하는 방"><div className="room-toolbar"><div><span className="live-dot" /><strong>우리의 거실</strong><span className="room-caption">작은 발걸음으로 채워지는 공간</span></div><span className="friend-count"><PawPrint size={14} /> {friends.length}명의 친구</span></div>
          <div className="room-viewport" ref={roomCamera} role="region" aria-label="확장된 방 카메라" tabIndex={0}><div className="room" data-world-width={room.width} data-world-height={room.height} data-night={(Date.now()/3600000+9)%24>=20||(Date.now()/3600000+9)%24<6}><RoomArt /><RoomExtras save={model.current} draft={draft} setDraft={setDraft} changed={persist} notify={notify} command={cloud?.send} busy={cloud?.busy}/><div className="room-label"><Sun size={13} /> 햇살 가득한 오후</div>
            {friends.filter(f => { const j = world(model.current).jobs.find(j => j.id === f.growth?.awayJobId); return j && Date.now() - j.startedAt < 1800 }).map(f => <div key={`leaving-${f.id}`} className="room-friend departing-friend" style={{ left: leftPercent(f.x), top: topPercent(f.y), zIndex: Math.round(f.y) }} aria-label={`${f.name} 탐험 출발`}><span className="speech" role="status">다녀올게~! 오늘은 어떤 보물을 찾을까?</span><span className="friend-figure"><Character friend={f} /></span><span className="friend-name">{f.name} · 외출</span></div>)}
            {friends.filter(f => !f.growth?.awayJobId).map(f => <InteractiveFriend key={f.id} friend={f} selected={selected === f.id} select={() => {setSelected(f.id);setCareOpen(true)}} changed={persist} bonded={bonded} remote={cloud ? { busy: cloud.busy, send: cloud.send } : undefined} />)}
          </div></div>
          {draft&&<div className="camera-controls" role="group" aria-label="가구 배치 카메라 이동">{[{label:'왼쪽',x:-180,y:0,text:'← 왼쪽'},{label:'위',x:0,y:-140,text:'↑ 위'},{label:'아래',x:0,y:140,text:'↓ 아래'},{label:'오른쪽',x:180,y:0,text:'오른쪽 →'}].map(d=><button key={d.label} aria-label={`배치 카메라 ${d.label} 보기`} onClick={()=>roomCamera.current?.scrollBy({left:d.x,top:d.y,behavior:'instant'})}>{d.text}</button>)}</div>}
          <div id="room-placement-tools"/>
          <div className="room-footer" id="interaction-help"><span><Sparkles size={15} /> 톡 쓰다듬기 · 2초 꾹 교감 · 끌어서 이동</span><span className="room-footer-note">방 안을 밀어 넓은 공간 둘러보기</span></div>
        </section>
        <aside className={`care-panel ${careOpen?'':'mobile-collapsed'}`} aria-label={`${friend.name} 돌보기`}><button className="mobile-care-summary" onClick={()=>setCareOpen(v=>!v)}>{friend.name} 상태·돌보기 {careOpen?'접기 ▴':'펼치기 ▾'}</button><div className="panel-heading"><span>MY LITTLE FRIEND</span><span className="small-heart"><Heart size={15} /></span></div>
          <div className="selected-profile"><div className="profile-portrait" style={{ background: `${friend.color}35` }}><Character friend={friend} mini /><span className="profile-sparkle">✧</span></div><div><div className="profile-title"><h2>{friend.name}</h2><span>Lv.{growth(friend).level}</span></div><p>{friend.description}</p><span className="mood"><span />{mood(friend)}</span></div></div>
          {isSpecialCharacter(friend) && <span className="special-badge">✦ 특별 친구</span>}
          <p className="pet-reward-status" data-testid="pet-reward-status">{petRewardLabel(friend, cloud ? cloud.now() : Date.now())}</p>
          <p className="rest-status" data-testid="rest-status">{restLabel(friend,cloud?cloud.now():Date.now())}</p>
          <p className="food-taste">좋아해요: {itemById[(friend.foodTaste??defaultTaste(friend.id)).like]?.name} · 아쉬워요: {itemById[(friend.foodTaste??defaultTaste(friend.id)).dislike]?.name}</p>
          <p className="care-needs" data-testid="care-needs">{careNeeds(friend).map(n => needLabels[n]).join(' · ') || '지금은 편안하게 지내고 있어요'}</p>
          <GrowthBar friend={friend} />
          {growth(friend).awayJobId && <div className="away-notice">🧭 탐험 중 · 귀환하면 다시 돌볼 수 있어요.</div>}
          <div className="affection"><div><Heart size={14} /><span>우리의 친밀도</span><strong>{Math.round(friend.stats.affection)}<small> / 100</small></strong></div><div className="affection-track"><span style={{ width: `${friend.stats.affection}%` }} /></div><p>{friend.stats.affection < 40 ? '조금씩 서로를 알아가는 중이에요' : friend.stats.affection < 75 ? '당신의 손길이 익숙해졌어요 ♡' : '누구보다 소중한 단짝이 되었어요 ♡'}</p></div>
          <div className="stats">{statInfo.map(({ key, name, color, icon: Icon }) => <div className="stat" key={key}><div><span><Icon size={14} />{name}</span><strong>{Math.round(friend.stats[key])}<small> / 100</small></strong></div><div className="stat-track" role="progressbar" aria-label={name} aria-valuenow={Math.round(friend.stats[key])} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${clamp(friend.stats[key])}%`, background: color }} /></div></div>)}</div>
          <div className="care-title">다정한 마음을 전해요 <Heart size={12} /></div><div className="care-actions">{careInfo.map(({ action, label, hint, icon: Icon }) => <button key={action} disabled={!!growth(friend).awayJobId || !!cloud?.busy} onClick={() => doCare(action)} className={`care-button ${action}`}><Icon size={21} strokeWidth={1.6} /><strong>{label}</strong><small>{hint}</small></button>)}</div><p className="care-note">교감 보상은 친구마다 6시간에 한 번 · {interactionBalance.bondMs / 1000}초 꾹 누르면 특별 교감</p>
        </aside>
      </div>
      {world(model.current).jobs.some(j => j.claimedAt === undefined) && <div className="away-strip">{world(model.current).jobs.filter(j => j.claimedAt === undefined).map(j => <button key={j.id} onClick={() => { setSelected(j.friendId); setMenu('explore') }}>🧭 {friends.find(f => f.id === j.friendId)?.name}의 탐험 · {remaining(j.endsAt)} <ChevronRight size={13} /></button>)}</div>}
      <section className="friends-section"><div className="section-heading"><div><h2>우리 집 친구들 <span>{String(friends.length).padStart(2,'0')}</span></h2><p>서로 다른 성격, 함께 자라는 작은 가족</p></div><span><Leaf size={15} /> 천천히, 함께 자라요</span></div>
        <div className="friend-cards">{friends.map((f, index) => <article key={f.id} className={`friend-card ${selected === f.id ? 'active' : ''}`}><button className="friend-card-select" aria-label={`${f.name} 상태 확인`} aria-pressed={selected === f.id} onClick={() => {setSelected(f.id);setCareOpen(true)}}><span className="card-avatar" style={{ background: `${f.color}30` }}><Character friend={f} mini /></span><span className="card-info"><strong>{f.name}<span>Lv.{growth(f).level}</span></strong><small>{f.growth?.awayJobId ? '🧭 탐험 중' : f.moving ? '사뿐사뿐 산책 중' : Date.now() < f.restingUntil ? '잠깐 쉬어 가는 중' : '오늘도 평화로운 하루'}</small></span>{selected === f.id ? <span className="card-selected"><Check size={13} /></span> : <ChevronRight size={16} className="card-arrow" />}</button>{index < 2 ? <button className="upload-button" onClick={() => beginUpload(f.id)} disabled={imageBusy}><Camera size={13} />{f.photo ? '사진 바꾸기' : '내 사진으로 등록'}<ArrowUpRight size={12} /></button> : <div className="default-label"><Sparkles size={12} /> 소중한 우리 집 가족</div>}</article>)}</div>
      </section>
      <div className="bottom-grid"><section className="memories"><div className="section-heading"><h2><Heart size={16} /> 오늘의 작은 추억</h2><span>우리만의 이야기</span></div>{model.current.memories.length ? <ul>{model.current.memories.slice(0, 4).map(m => <li key={m.id}><span className="memory-dot" /><span>{m.text}</span><time>{time(m.at)}</time></li>)}</ul> : <div className="empty-memory"><span>♡</span><p>아직은 조용한 우리 집.<br />친구에게 첫 번째 다정함을 건네 볼까요?</p></div>}</section><section className="photo-tip"><div className="tip-icon"><ImagePlus size={26} strokeWidth={1.4} /></div><div><span className="eyebrow">MAKE IT YOURS</span><h3>익숙한 얼굴이라면, 더 특별하니까.</h3><p>모모와 비비를 좋아하는 사진으로 바꿔 보세요.<br />{cloud ? '사진은 인증된 기기들과 클라우드로 공유돼요.' : '사진은 기기에만 저장되고 외부로 전송되지 않아요.'}</p><button onClick={() => beginUpload(selected === 'bibi' ? 'bibi' : 'momo')}>나만의 친구 만들기 <ArrowUpRight size={14} /></button></div></section></div>
      <footer className="footer"><span><PawPrint size={14} /> 작은 순간들이 모여, 우리만의 이야기.</span><button onClick={exportSave}><ArrowDownToLine size={14} /> 추억 보관</button><button disabled={!!cloud} onClick={() => restoreRef.current?.click()}>추억 불러오기</button><span className="footer-version">POCKET FRIENDS · CHAPTER 02</span></footer>
    </main>
    <input className="sr-only" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="캐릭터 사진 선택" onChange={chooseFile} />
    <input className="sr-only" ref={restoreRef} type="file" accept="application/json,.json" aria-label="게임 백업 선택" onChange={chooseBackup} />
    {notice && <div className="toast" role="status"><Heart size={16} />{notice}<button aria-label="알림 닫기" onClick={() => setNotice('')}><X size={14} /></button></div>}
    {sichuanOpen&&<SichuanPanel save={model.current} cloud={cloud} changed={persist} close={()=>setSichuanOpen(false)}/>}
    {menu && <GameMenu now={cloud?.now} onPlace={itemId=>{setDraft({itemId,x:530,y:390});setMenu(null);document.querySelector('.room')?.scrollIntoView({block:'center',behavior:'smooth'})}} key={menu} save={model.current} tab={menu} close={() => setMenu(null)} selected={selected} select={setSelected} changed={persist} notify={notify} command={cloud?.send} busy={cloud?.busy} />}
    {restore && <div className="modal-backdrop restore-backdrop"><div className="photo-modal" role="dialog" aria-modal="true" aria-label="백업 복원 확인"><h2>이 추억으로 돌아갈까요?</h2><p>친구 {restore.friends.length}명 · {world(restore).coins}코인<br />현재 게임을 별도로 백업한 다음 이 파일로 바꿔요.</p><button className="primary-button" disabled={restoring} onClick={confirmRestore}>{restoring ? '백업하고 복원하는 중…' : '현재 게임 백업 후 복원'}</button><button className="restore-cancel" disabled={restoring} onClick={() => setRestore(null)}>취소</button></div></div>}
    {lifeOpen&&<LifePanel key={friend.id} save={model.current} friend={friend} close={()=>setLifeOpen(false)} changed={persist} notify={notify} command={cloud?.send} busy={cloud?.busy}/>}
    {!lifeOpen&&!menu&&<DiscoveryNotice save={model.current} changed={persist} command={cloud?.send}/>}
    <LegendaryNotice sound={sound} save={model.current} changed={persist} command={cloud?.send} />
    {crop && <PhotoDialog shared={!!cloud} crop={crop} setCrop={setCrop} busy={imageBusy} save={savePhoto} />}
  </div>
}
function PhotoDialog({ shared, crop, setCrop, busy, save }: { shared: boolean; crop: Crop; setCrop: (value: Crop | null) => void; busy: boolean; save: () => void }) {
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    return () => previous?.focus()
  }, [])
  const bounds = cropBounds(crop)
  return <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !busy) setCrop(null) }}><div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="photo-title" className="photo-modal" onKeyDown={e => {
    if (e.key === 'Escape' && !busy) setCrop(null)
    if (e.key === 'Tab') {
      const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
      if (!nodes?.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }}><div className="modal-title"><span><Camera size={18} /><h2 id="photo-title">우리 친구의 새로운 모습</h2></span><button className="icon-button" aria-label="사진 편집 닫기" disabled={busy} onClick={() => setCrop(null)}><X size={20} /></button></div><p>사진에서 원하는 친구가 보이도록 맞춰 주세요.<br />같은 사진으로 모모와 비비를 각각 등록할 수도 있어요.</p><div className="crop-preview"><img src={crop.src} alt="등록할 캐릭터 미리보기" style={{ width: `${Math.max(1, crop.ratio) * 100}%`, height: `${Math.max(1, 1 / crop.ratio) * 100}%`, left: `${50 + crop.x}%`, top: `${50 + crop.y}%`, transform: `translate(-50%, -50%) scale(${crop.zoom})` }} /></div><label className="crop-control">확대<input type="range" min="1" max="4" step="0.05" value={crop.zoom} onChange={e => { const zoom = Number(e.target.value), bound = cropBounds(crop, zoom); setCrop({ ...crop, zoom, x: Math.max(-bound.x, Math.min(bound.x, crop.x)), y: Math.max(-bound.y, Math.min(bound.y, crop.y)) }) }} /></label><label className="crop-control">좌우 위치<input type="range" min={-bounds.x || -1} max={bounds.x || 1} disabled={!bounds.x} step="1" value={crop.x} onChange={e => setCrop({ ...crop, x: Number(e.target.value) })} /></label><label className="crop-control">상하 위치<input type="range" min={-bounds.y || -1} max={bounds.y || 1} disabled={!bounds.y} step="1" value={crop.y} onChange={e => setCrop({ ...crop, y: Number(e.target.value) })} /></label><p className="photo-privacy">{shared ? '등록한 사진은 인증된 기기들과 클라우드로 공유돼요' : '사진은 이 브라우저에만 보관돼요'} · 자동 배경 제거는 지원하지 않아요</p><button className="primary-button" disabled={busy} onClick={save}>{busy ? '등록하는 중…' : '이 모습으로 등록하기'}<Check size={17} /></button></div></div>
}
export default App
