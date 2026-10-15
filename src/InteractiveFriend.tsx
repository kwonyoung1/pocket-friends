import { sleeping } from './expansion/model'
import { useCallback, useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Heart } from 'lucide-react'
import { Character } from './Character'
import type { Friend } from './game'
import { affinity, beginGesture, bodyZone, endGesture, normalPet, moveGesture } from './interaction'
import type { GameCommand } from './cloud/protocol'
import { interactionBalance } from './balance'

type Props = { friend: Friend; selected: boolean; select: () => void; changed: () => void; bonded: (friend: Friend) => void; remote?: { busy: boolean; send: (c: GameCommand) => Promise<void> } }
export function InteractiveFriend({ friend: f, selected, select, changed, bonded, remote }: Props) {
  const button = useRef<HTMLButtonElement>(null)
  const finish = useCallback((pointerId: number, cancel = false) => {
    if (f.interaction?.gesture?.pointerId !== pointerId) return
    const phase = f.interaction.phase, holdId = f.remoteHoldId
    endGesture(f, pointerId, Date.now(), cancel, () => bonded(f))
    if (remote && holdId) {
      const command: GameCommand = !cancel && phase === 'dragging' ? { type: 'drop', friendId: f.id, holdId, x: f.x, y: f.y } : !cancel && phase === 'pressing' ? { type: 'pet', friendId: f.id, holdId } : { type: 'hold-cancel', friendId: f.id, holdId }
      void remote.send(command)
    }
    if (button.current?.hasPointerCapture(pointerId)) button.current.releasePointerCapture(pointerId)
    changed()
  }, [f, changed, bonded, remote?.send])
  useEffect(() => {
    const cancel = () => { const id = f.interaction?.gesture?.pointerId; if (id !== undefined) finish(id, true) }
    const visibility = () => { if (document.hidden) cancel() }
    const leaveWindow = (e: PointerEvent) => { if (!e.relatedTarget && f.interaction?.gesture?.pointerId === e.pointerId) cancel() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel() }
    window.addEventListener('blur', cancel)
    window.addEventListener('pagehide', cancel)
    window.addEventListener('resize', cancel)
    window.addEventListener('pointerout', leaveWindow)
    window.addEventListener('keydown', key)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('blur', cancel); window.removeEventListener('pagehide', cancel)
      window.removeEventListener('resize', cancel); window.removeEventListener('pointerout', leaveWindow)
      window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', visibility)
      // Unmount must never leave simulation state captured.
      const id = f.interaction?.gesture?.pointerId
      if (id !== undefined) endGesture(f, id, Date.now(), true)
    }
  }, [f, finish])
  const onDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.querySelector('.friend-figure')!.getBoundingClientRect()
    const zone = bodyZone(f, Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)))
    if (!beginGesture(f, e.pointerId, { x: e.clientX, y: e.clientY }, zone, Date.now(), e.pointerType)) return
    if (remote) { f.remoteHoldId = crypto.randomUUID(); void remote.send({ type: 'hold-start', friendId: f.id, holdId: f.remoteHoldId }) }
    e.preventDefault(); e.currentTarget.focus({ preventScroll: true }); select()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { finish(e.pointerId, true) }
  }
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const gesture = f.interaction?.gesture
    if (!gesture || gesture.pointerId !== e.pointerId) return
    e.preventDefault()
    const rect = e.currentTarget.closest('.room')!.getBoundingClientRect()
    moveGesture(f, e.pointerId, { x: e.clientX, y: e.clientY }, { x: (e.clientX - gesture.start.x) / rect.width * 1000, y: (e.clientY - gesture.start.y) / rect.height * 640 }, Date.now())
  }
  const phase = f.interaction?.phase ?? 'idle'
  const held = phase === 'petting' || phase === 'bonding'
  const asleep=sleeping(f),bathing=!!f.life?.bath
  const happy = held || phase === 'delighted' || phase === 'settling'
  const head = f.interaction?.zone === 'head'
  const close = affinity(f) === 'close'
  const intensity = (head ? 1.2 : 1) * (close ? 1.2 : 1)
  const recovering=(f.recoveryUntil??0)>Date.now()
  const effect = held || phase === 'delighted' || recovering
  const hearts = phase === 'bonding' ? (head ? 7 : 5) + (close ? 2 : 0) : head ? 2 : 1
  const elapsed = Date.now() - (f.interaction?.startedAt ?? Date.now())
  return <button ref={button}
    className={`room-friend ${!f.moving&&(f.furnitureUntil??0)>Date.now()&&/휴식|쉬기|햄스터/.test(f.furnitureActivity??'')?'furniture-relax':''} ${(f.eatingUntil??0)>Date.now()?'eating':''} ${asleep?'life-sleep':''} ${bathing?'life-bath':''} ${f.life?.coldAt?'life-cold':''} ${selected ? 'selected' : ''} ${f.moving ? 'walking' : ''} interaction-${phase} ${head ? 'head-pet' : ''} ${close ? 'close-friend' : ''} ${(f.growth?.specialUntil ?? 0) > Date.now() ? 'personality-action' : ''}`}
    aria-label={`${f.name} 쓰다듬기 또는 끌어서 이동`} aria-pressed={selected} aria-describedby="interaction-help"
    data-testid={`room-${f.id}`} data-x={f.x.toFixed(1)} data-y={f.y.toFixed(1)} data-moving={f.moving}
    data-phase={phase} data-zone={f.interaction?.zone ?? 'body'} data-affinity={affinity(f)}
    style={{ left: `${f.x / 10}%`, top: `${f.y / 6.4}%`, zIndex: f.interaction?.gesture ? 1500 : Math.round(f.y), '--reaction-scale': intensity } as CSSProperties}
    onPointerDown={onDown} onPointerMove={onMove}
    onPointerUp={e => { e.preventDefault(); finish(e.pointerId) }}
    onPointerCancel={e => finish(e.pointerId, true)} onLostPointerCapture={e => finish(e.pointerId, true)}
    onPointerLeave={e => { if (e.buttons === 0) finish(e.pointerId, true) }}
    onContextMenu={e => e.preventDefault()} onDragStart={e => e.preventDefault()}
    onClick={e => {
      // Pointer taps commit on pointerup; only keyboard/assistive clicks commit here.
      if (e.detail === 0 && !f.interaction?.gesture) { select(); normalPet(f, Date.now()); if (remote) void remote.send({ type: 'care', action: 'pet', friendId: f.id }); changed() }
    }}>
    {f.bubbleUntil > Date.now() && <span className="speech" role="status" style={f.x < 200 ? { left: 0, transform: 'none' } : f.x > 800 ? { left: 'auto', right: 0, transform: 'none' } : undefined}>{f.bubble}</span>}
    <span className="interaction-shadow" aria-hidden="true" />
    <span className="friend-lift" style={phase === 'dragging' ? { transform: `translateY(-16%) rotate(${f.interaction?.tilt ?? 0}deg)` } : undefined}>
      <span className="friend-emotion"><span className="friend-figure" style={{ transform: `scaleX(${f.facing})` }}><Character friend={f} emotion={held || asleep || f.life?.coldAt ? 'closed' : happy || recovering ? 'smile' : 'normal'} /></span></span>
    </span>
    {(f.growth?.levelUpUntil ?? 0) > Date.now() && <span className="level-up-effect" role="status">✦ LEVEL UP · Lv.{f.growth?.level} ✦</span>}
    {effect && <span className={`pet-particles ${phase === 'bonding' ? 'many-hearts' : ''}`} aria-hidden="true">
      {Array.from({ length: hearts }, (_, i) => <span className="pet-heart" key={i} style={{ '--i': i, '--drift': `${(i % 2 ? 1 : -1) * (18 + i * 6)}px` } as CSSProperties}>♥</span>)}
      <span className="pet-sparkle one">✧</span><span className="pet-sparkle two">✦</span>{phase === 'bonding' && <span className="pet-sparkle three">✧</span>}
    </span>}
    {(phase === 'pressing' || phase === 'petting') && <span className="hold-progress" aria-label="교감까지 길게 누르는 중" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(elapsed / interactionBalance.bondMs * 100))}><svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11" /><circle className="progress-fill" cx="14" cy="14" r="11" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - Math.min(100, elapsed / interactionBalance.bondMs * 100)} /></svg><Heart size={11} fill="currentColor" /></span>}
    {(asleep||bathing)&&<span className="life-symbol" aria-label={asleep?'수면 중':'목욕 중'}>{asleep?'z z z':'🫧 🫧'}</span>}
    {(f.furnitureUntil??0)>Date.now()&&<span className="friend-activity">{f.furnitureActivity}</span>}
    <span className="friend-name">{selected && <Heart size={10} fill="currentColor" aria-hidden="true" />} {f.name}</span>
  </button>
}
