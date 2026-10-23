import {placementVisualSize,placementFloor,clampPlacement,roomPointer} from '../room/placement'
import {EquipmentPanel} from '../equipment/UI'
import {isGem,gemById} from '../adventure/gems'
import {TreasureArt} from '../adventure/TreasureArt'
import {orderedPlacements} from './model'
import {createPortal} from 'react-dom'
import type {ReactNode} from 'react'
import {room,leftPercent,topPercent} from '../room/config'
import {defaultTaste} from '../adventure/catalog'
import { normalFriendCount } from '../humans/model'
import { FurnitureArt } from './FurnitureArt'
export { FurnitureArt } from './FurnitureArt'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Save, Friend, Point } from '../game'
import type { GameCommand } from '../cloud/protocol'
import { itemById } from '../progression/config'
import { buy, world } from '../progression/model'
import {
  adoptionCatalog,
  lifeBalance as B,
  regionWeights,
  tripEvents,
} from './config'
import { expansion, life, lifeCommand, sleepLabel, sleeping, bathStatus } from './model'
import type { LifeCommand, Placement, Hamster } from './model'
import { Character } from '../Character'
import { findRoute, validPosition } from '../navigation'
import { furnitureObstacles } from './model'
export type Draft = {
  itemId: string
  x: number
  y: number
  placementId?: string
}
const date = (n: number) =>
  new Date(n).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
export function LifePanel({
  save,
  friend: f,
  close,
  changed,
  notify,
  command,
  busy,
  now,
}: {
  save: Save
  friend: Friend
  close: () => void
  changed: () => void
  notify: (s: string) => void
  command?: (c: GameCommand) => Promise<void>
  busy?: boolean
  now?:()=>number
}) {
  const at=now?.()??Date.now(),bath=bathStatus(f,at)
  const [, refresh] = useState(0)
  const [name, setName] = useState(f.name),
    l = life(f),
    e = expansion(save),
    [tab, setTab] = useState('life'),
    dialog = useRef<HTMLDivElement>(null)
  const run = (c: LifeCommand | { type: 'buy'; id: string }) => {
    if (busy) return
    if (command) {
      void command(c)
      return
    }
    notify(c.type === 'buy' ? buy(save, c.id) : lifeCommand(save, c))
    changed()
    refresh((n) => n + 1)
  }
  useEffect(()=>{const timer=setInterval(()=>refresh(n=>n+1),1000);return()=>clearInterval(timer)},[])
  useEffect(() => {
    const old = document.activeElement as HTMLElement
    dialog.current?.focus()
    return () => old?.focus()
  }, [])
  return (
    <div
      className="modal-backdrop"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) close()
      }}
    >
      <div
        className="game-menu life-menu"
        role="dialog"
        aria-modal="true"
        aria-label="생활과 새 식구"
        tabIndex={-1}
        ref={dialog}
        onKeyDown={(ev) => {
          if (ev.key === 'Escape') close()
          if (ev.key === 'Tab') {
            const a = dialog.current!.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input',
            )
            if (
              ev.shiftKey &&
              (document.activeElement === a[0] ||
                document.activeElement === dialog.current)
            ) {
              ev.preventDefault()
              a[a.length - 1]?.focus()
            } else if (
              !ev.shiftKey &&
              document.activeElement === a[a.length - 1]
            ) {
              ev.preventDefault()
              a[0]?.focus()
            }
          }
        }}
      >
        <div className="menu-heading">
          <h2>생활과 새 식구</h2>
          <button
            className="icon-button"
            aria-label="생활 메뉴 닫기"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="filter-tabs">
          {[
            ['life', '친구 생활'],
            ['equipment','장비'],
            ['adopt', '입양'],
            ['hamsters', '햄스터'],
            ['events', '탐험 추억'],
          ].map(([id, t]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'life' && (
          <>
            <div className="life-profile">
              <Character friend={f} mini />
              <div>
                <h3>{f.name}의 하루</h3>
                <p>좋아하는 음식 (1.5배): {itemById[(f.foodTaste??defaultTaste(f.id)).like]?.name}</p>
                <p>수면 {sleepLabel(f)}</p>
                <p>
                  {f.growth?.awayJobId
                    ? '🧭 탐험 중'
                    : l.bath
                      ? '🫧 목욕 중'
                      : sleeping(f,at)
                        ? '🌙 새근새근 수면 중'
                        : '☀️ 함께 놀 준비가 됐어요'}
                </p>
              </div>
            </div>
            <section className="life-card">
              <h3>🫧 따뜻한 목욕</h3>
              <p>하루 네 번 · 한 번에 30분 · 한국 시간 자정 초기화</p>
              <p>
                {l.bath
                  ? `끝나는 시간: ${date(l.bath.endsAt)} · 남은 시간 ${bath.time}`
                  : `오늘 시작 ${bath.used} / ${B.bathsPerDay}회`}
              </p>
              <button
                className="small-primary"
                disabled={
                  busy ||
                  !!l.bath ||
                  sleeping(f,at) ||
                  !!f.growth?.awayJobId ||
                  bath.full
                }
                onClick={() => run({ type: 'bath', friendId: f.id })}
              >
                {bath.label}
              </button>
              {bath.full&&<p role="status">오늘은 충분히 씻었어요! 내일 다시 씻겨 주세요 🛁</p>}
            </section>
            <section className="life-card">
              <h3>💌 이름 지어 주기</h3>
              <p>첫 변경은 바로 · 이후 168시간에 한 번 · 1~12글자</p>
              <form
                onSubmit={(ev) => {
                  ev.preventDefault()
                  run({ type: 'rename', friendId: f.id, name })
                }}
              >
                <label>
                  새 이름
                  <input
                    aria-label="새 이름"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                    maxLength={24}
                  />
                </label>
                <button
                  className="small-primary"
                  disabled={
                    busy ||
                    !!(
                      l.lastRenameAt && Date.now() - l.lastRenameAt < B.renameMs
                    )
                  }
                >
                  이름 저장
                </button>
              </form>
              {l.lastRenameAt !== undefined && (
                <small>다음 변경: {date(l.lastRenameAt + B.renameMs)}</small>
              )}
              <details>
                <summary>이름의 추억 {l.names.length}개</summary>
                {l.names.map((n, i) => (
                  <p key={i}>
                    {n.name} · {date(n.at)}
                  </p>
                ))}
              </details>
            </section>
            <section className="life-card">
              <h3>{l.coldAt ? '🤧 감기에 걸렸어요' : '🌿 건강하게 지내요'}</h3>
              <p>
                감기 중에는 천천히 걷고 회복하며, 탐험은 잠시 쉬어요. 상점에서
                약을 구매해 보관할 수 있어요.
              </p>
              <button
                className="small-primary"
                disabled={
                  busy ||
                  world(save).coins < B.medicinePrice ||
                  Date.now() < world(save).buyAfter
                }
                onClick={() => run({ type: 'buy', id: 'medicine' })}
              >
                감기약 구매 · 100코인
              </button>
              <button
                className="small-primary"
                disabled={
                  busy || !l.coldAt || !(world(save).inventory.medicine > 0)
                }
                onClick={() => run({ type: 'medicine', friendId: f.id })}
              >
                감기약 사용 · 보유 {world(save).inventory.medicine ?? 0}개
              </button>
            </section>
          </>
        )}
        {tab==='equipment'&&<EquipmentPanel save={save} friend={f} command={command} busy={busy} changed={changed} notify={notify}/>}
        {tab === 'adopt' && (
          <>
            <p className="menu-note">
              각 친구 10,000코인 · 종류별 한 번 · 일반 친구 최대 8명 (현재{' '}
              {normalFriendCount(save)}명 + 특별 친구 2명)
            </p>
            <div className="item-grid">
              {adoptionCatalog.map((d) => {
                const adopted = save.friends.some((f) => f.id === d.id)
                return (
                  <article key={d.id} className="item-card">
                    <div className="adopt-avatar">
                      <Character friend={d} />
                    </div>
                    <h3>{d.name}</h3>
                    <p>{d.description}</p>
                    <button
                      className="small-primary"
                      disabled={
                        busy ||
                        adopted ||
                        world(save).coins < B.adoptionPrice ||
                        normalFriendCount(save) >= 8
                      }
                      onClick={() => run({ type: 'adopt', id: d.id })}
                    >
                      {adopted
                        ? '함께 살고 있어요'
                        : '새 식구 맞이 · 10,000코인'}
                    </button>
                  </article>
                )
              })}
            </div>
          </>
        )}
        {tab === 'hamsters' && (
          <>
            <p className="menu-note">
              탐험 한 번당 독립 확률 0.5% · 발견 기록은 영구 보관 · 방에는 최대
              3마리 · 판매하거나 버리지 않아요.
            </p>
            <p>
              총 발견 {e.hamsters.length}마리 · 방에서 산책{' '}
              {e.hamsters.filter((h) => h.deployed).length}마리
            </p>
            <div className="item-grid">
              {e.hamsters.map((h, i) => (
                <article className="item-card" key={h.id}>
                  <HamsterArt />
                  <h3>작은 햄스터 #{i + 1}</h3>
                  <p>
                    {date(h.foundAt)} · {h.regionId}
                  </p>
                  <button
                    className="small-primary"
                    disabled={
                      busy ||
                      (!h.deployed &&
                        e.hamsters.filter((h) => h.deployed).length >= 3)
                    }
                    onClick={() =>
                      run({ type: 'hamster', id: h.id, deployed: !h.deployed })
                    }
                  >
                    {h.deployed ? '인벤토리에서 쉬게 하기' : '방에 꺼내 주기'}
                  </button>
                </article>
              ))}
            </div>
            {!e.hamsters.length && (
              <p className="menu-empty">
                탐험 길에서 만날 작은 인연을 기다려요 🐹
              </p>
            )}
          </>
        )}
        {tab === 'events' && (
          <>
            <p>
              한 탐험에서 보너스 아이템·감기·햄스터는 서로 독립적으로 추첨돼요.
            </p>
            {tripEvents.map((ev) => (
              <p key={ev.id}>
                {ev.name} · {ev.chance * 100}%
                {ev.coins ? ` · ${ev.coins}코인` : ''}
              </p>
            ))}
            <h3>우리의 탐험 추억</h3>
            {[...e.events]
              .reverse()
              .slice(0, 100)
              .map((ev) => (
                <p key={ev.id}>
                  ✦ {tripEvents.find((t) => t.id === ev.eventId)?.name} ·{' '}
                  {save.friends.find((f) => f.id === ev.friendId)?.name} ·{' '}
                  {date(ev.at)}
                </p>
              ))}
            <h3>지역별 보물 확률</h3>
            {Object.entries(regionWeights).map(([id, r]) => (
              <p key={id}>
                {id} · 일반 {r.common}% / 고급 {r.uncommon}% / 희귀 {r.rare}% /
                전설 {r.legendary}%
              </p>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
function HamsterArt() {
  return (
    <svg viewBox="0 0 100 110" className="hamster-art" aria-hidden="true">
      <ellipse cx="50" cy="92" rx="30" ry="7" fill="#77614a" opacity=".14" />
      <circle cx="28" cy="37" r="13" fill="#dbb38a" />
      <circle cx="72" cy="37" r="13" fill="#dbb38a" />
      <ellipse cx="50" cy="68" rx="34" ry="31" fill="#e6c39a" />
      <ellipse cx="50" cy="77" rx="25" ry="19" fill="#fff4df" />
      <circle cx="36" cy="59" r="4" fill="#695244" />
      <circle cx="64" cy="59" r="4" fill="#695244" />
      <path d="m46 69 4 4 4-4" fill="#bb7e7e" />
      <ellipse cx="24" cy="72" rx="8" ry="7" fill="#f4d4b0" />
      <ellipse cx="76" cy="72" rx="8" ry="7" fill="#f4d4b0" />
      <path
        d="M40 91h-8m28 0h8"
        stroke="#ba9470"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  )
}
function HamsterActor({ hamster: h, save }: { hamster: Hamster; save: Save }) {
  const state = useRef({
      x: h.x,
      y: h.y,
      route: [] as Point[],
      until: 0,
      action: '둘러보기',
      facing: 1,
    }),
    [, redraw] = useState(0)
  useEffect(() => {
    let frame = 0,
      last = performance.now(),
      paint = 0
    const loop = (t: number) => {
      const s = state.current,
        dt = Math.min(0.1, (t - last) / 1000),
        now = Date.now()
      last = t
      const safe = validPosition(s, furnitureObstacles(save))
      if (safe.x !== s.x || safe.y !== s.y) {
        s.x = safe.x
        s.y = safe.y
        s.route = []
      }
      if (now > s.until) {
        s.action = [
          '둘러보기',
          '고개 갸웃',
          '그루밍',
          '오물오물 간식',
          '새근새근',
          '쪼르르 산책',
          '친구 따라가기',
        ][Math.floor(Math.random() * 7)]
        s.until = now + 2500 + Math.random() * 5000
        if (s.action.includes('산책') || s.action.includes('따라')) {
          const peer = save.friends.find((f) => !f.growth?.awayJobId),
            p =
              s.action.includes('따라') && peer
                ? peer
                : {
                    x: room.minX + Math.random() * (room.maxX-room.minX),
                    y: room.minY + Math.random() * (room.maxY-room.minY),
                  }
          s.route = findRoute(
            s,
            validPosition(p, furnitureObstacles(save)),
            furnitureObstacles(save),
          )
        } else s.route = []
      }
      const p = s.route[0]
      if (p) {
        const dx = p.x - s.x,
          dy = p.y - s.y,
          d = Math.hypot(dx, dy),
          step = dt * (s.action.includes('산책') ? 65 : 36)
        if (d < step) {
          s.x = p.x
          s.y = p.y
          s.route.shift()
        } else {
          s.x += (dx / d) * step
          s.y += (dy / d) * step
          s.facing = dx < 0 ? -1 : 1
        }
      }
      if (t - paint > 90) {
        paint = t
        redraw((n) => n + 1)
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [save, h.id])
  const s = state.current
  return (
    <span
      className={`room-hamster ${s.route.length ? 'hamster-walking' : ''} ${s.action === '새근새근' ? 'hamster-sleeping' : ''}`}
      style={
        {
          left: leftPercent(s.x),
          top: topPercent(s.y),
          zIndex: Math.round(s.y),
          '--hamster-facing': s.facing,
        } as CSSProperties
      }
      aria-label={`햄스터 · ${s.action}`}
    >
      <HamsterArt />
      {s.action === '새근새근' && <small>z z z</small>}
    </span>
  )
}
function roomTools(node:ReactNode){const container=document.getElementById('room-placement-tools');return container?createPortal(node,container):node}
export function RoomExtras({
  save,
  draft,
  setDraft,
  changed,
  notify,
  command,
  busy,
}: {
  save: Save
  draft: Draft | null
  setDraft: (d: Draft | null) => void
  changed: () => void
  notify: (s: string) => void
  command?: (c: GameCommand) => Promise<void>
  busy?: boolean
}) {
  const [, refresh] = useState(0)
  const [editing, setEditing] = useState(false)
  const e = expansion(save),
    [selection, setSelected] = useState<Placement | null>(null)
  const selected=e.placements.find(p=>p.id===selection?.id)??null
  const run = (c: LifeCommand) => {
    if (command) {
      void command(c)
    } else {
      notify(lifeCommand(save, c))
      changed()
      refresh((n) => n + 1)
    }
  }
  return (
    <>
      <button
        className="room-edit-toggle"
        aria-pressed={editing}
        onClick={() => {
          setEditing((v) => !v)
          setSelected(null)
        }}
      >
        {editing ? '편집 끝내기' : '가구 편집'}
      </button>
      {orderedPlacements(save).map((p,index) => (
        <button
          data-item={p.itemId}
          className={`placed-furniture ${isGem(p.itemId)?'placed-gem':''} ${isGem(p.itemId)&&itemById[p.itemId].rarity==='legendary'?'gem-aura':''}`}
          data-placement-id={p.id}
          key={p.id}
          aria-label={`${itemById[p.itemId].name} 이동 또는 회수`}
          style={{
            left: leftPercent(p.x),
            top: topPercent(p.y),
            zIndex: (editing?2000:300)+index,
            '--gem-color':gemById[p.itemId]?.color,
            width:leftPercent(placementVisualSize(p.itemId,p).w),
            height:topPercent(placementVisualSize(p.itemId,p).h),
          } as CSSProperties}
          onClick={() => setSelected(p)}
          onContextMenu={(ev) => ev.preventDefault()}
        >
          {isGem(p.itemId)?<TreasureArt id={p.itemId} worldSize={placementVisualSize(p.itemId,p)}/>:<FurnitureArt itemId={p.itemId} worldSize={placementVisualSize(p.itemId,p)}/>}
          {isGem(p.itemId)&&itemById[p.itemId].rarity==='legendary'&&<span className="gem-sparkles" aria-hidden="true">✧ · ✦</span>}
        </button>
      ))}
      {e.hamsters
        .filter((h) => h.deployed)
        .map((h) => (
          <HamsterActor key={h.id} hamster={h} save={save} />
        ))}
      {editing&&roomTools(<div className="placement-list"><label>배치 아이템 선택<select aria-label="배치 아이템 선택" value={selected?.id??''} onChange={ev=>setSelected(e.placements.find(p=>p.id===ev.target.value)??null)}><option value="">겹친 아이템을 목록에서 선택하세요</option>{orderedPlacements(save).map((p,i)=><option key={p.id} value={p.id}>{i+1}. {itemById[p.itemId].name} · {p.id.slice(0,6)}</option>)}</select></label></div>)}
      {selected && !draft && (roomTools(
        <div className="furniture-controls">
          <strong>{itemById[selected.itemId].name}</strong>
          {(['front','back','forward','backward'] as const).map((direction,i)=><button disabled={busy} key={direction} onClick={()=>run({type:'layer',id:selected.id,direction})}>{['맨 앞으로 가져오기','맨 뒤로 보내기','한 단계 앞으로','한 단계 뒤로'][i]}</button>)}
          <button
            disabled={busy}
            onClick={() => {
              setDraft({ ...selected, placementId: selected.id })
              setSelected(null)
            }}
          >
            이동하기
          </button>
          <button
            disabled={busy}
            onClick={() => {
              run({ type: 'recover-furniture', id: selected.id })
              setSelected(null)
            }}
          >
            회수하기
          </button>
          <button onClick={() => setSelected(null)}>닫기</button>
        </div>
      ))}
      {draft && (
        <div
          className="placement-editor"
          onPointerDown={(ev) => {
            if ((ev.target as HTMLElement).closest('button')) return
            ev.preventDefault()
            ev.currentTarget.setPointerCapture(ev.pointerId)
            const r = ev.currentTarget.getBoundingClientRect()
            setDraft({
              ...draft,
              ...clampPlacement(draft.itemId,roomPointer(ev.clientX,ev.clientY,r),e.placements.find(p=>p.id===draft.placementId)),
            })
          }}
          onPointerMove={(ev) => {
            if (!ev.currentTarget.hasPointerCapture(ev.pointerId)) return
            const r = ev.currentTarget.getBoundingClientRect()
            setDraft({
              ...draft,
              ...clampPlacement(draft.itemId,roomPointer(ev.clientX,ev.clientY,r),e.placements.find(p=>p.id===draft.placementId)),
            })
          }}
          onPointerUp={(ev) => {
            if (ev.currentTarget.hasPointerCapture(ev.pointerId))
              ev.currentTarget.releasePointerCapture(ev.pointerId)
          }}
          onContextMenu={(ev) => ev.preventDefault()}
        >
          <div className="placement-safe-area" data-testid="placement-floor" style={{left:leftPercent(placementFloor.left),top:topPercent(placementFloor.top),width:leftPercent(placementFloor.right-placementFloor.left),height:topPercent(placementFloor.bottom-placementFloor.top)}}/>
          <div
            data-item={draft.itemId}
            className={`furniture-preview ${isGem(draft.itemId)?'placed-gem':''} ${isGem(draft.itemId)&&itemById[draft.itemId].rarity==='legendary'?'gem-aura':''}`}
            data-testid="placement-preview"
            data-map-x={draft.x} data-map-y={draft.y}
            style={{ left: leftPercent(draft.x), top: topPercent(draft.y),width:leftPercent(placementVisualSize(draft.itemId,e.placements.find(p=>p.id===draft.placementId)).w),height:topPercent(placementVisualSize(draft.itemId,e.placements.find(p=>p.id===draft.placementId)).h) }}
          >
            {isGem(draft.itemId)?<TreasureArt id={draft.itemId} worldSize={placementVisualSize(draft.itemId,e.placements.find(p=>p.id===draft.placementId))}/>:<FurnitureArt itemId={draft.itemId} worldSize={placementVisualSize(draft.itemId,e.placements.find(p=>p.id===draft.placementId))}/>}
          </div>
          {roomTools(<div className="furniture-controls">
            <span className="draft-thumbnail" aria-label="손가락에 가리지 않는 배치 미리보기">{isGem(draft.itemId)?<TreasureArt id={draft.itemId}/>:<FurnitureArt itemId={draft.itemId}/>}</span><span>바닥을 누르거나 끌어서 위치 선택 · 가장자리는 크기에 맞춰 조절해요</span>
            <button
              disabled={busy}
              onClick={() => {
                run({ type: 'place', ...draft })
                setDraft(null)
              }}
            >
              여기에 놓기
            </button>
            <button onClick={() => setDraft(null)}>취소</button>
          </div>)}
        </div>
      )}
    </>
  )
}
export function DiscoveryNotice({
  save,
  changed,
  command,
}: {
  save: Save
  changed: () => void
  command?: (c: GameCommand) => Promise<void>
}) {
  const e = expansion(save),
    ids = Object.keys(world(save).book).concat(e.hamsters.map((h) => h.id)),
    fresh = ids.filter((id) => !e.seen.includes(id)),
    [dismissed, setDismissed] = useState('')
  const key = fresh.join(',')
  if (!fresh.length || dismissed === key) return null
  return (
    <div className="discovery-notice" role="status">
      <span aria-hidden="true">✧</span> 새로운 발견 {fresh.length}개! 도감과
      생활 메뉴에서 만나 보세요.
      <button
        aria-label="새 발견 알림 닫기"
        onClick={() => {
          setDismissed(key)
          if (command) void command({ type: 'seen-discoveries' })
          else {
            lifeCommand(save, { type: 'seen-discoveries' })
            changed()
          }
        }}
      >
        확인 ♡
      </button>
    </div>
  )
}
