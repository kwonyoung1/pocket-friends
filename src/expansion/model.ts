import {withinPlacementFloor} from '../room/placement.ts'
import {isGem} from '../adventure/gems.ts'
import {decorativeFurniture} from './config.ts'
import {naturalChange,legacyChange,statusBalance} from '../status/balance.ts'
import {roomScale,scaledPoint} from '../room/config.ts'
import { normalFriendCount } from '../humans/model.ts'
import type { Friend, Save, Point } from '../game.ts'
import { createFriends } from '../game.ts'
import {
  announce,
  dailyKey,
  growth,
  transact,
  world,
} from '../progression/model.ts'
import { speak } from '../interaction.ts'
import { itemById } from '../progression/config.ts'
import {
  cells,
  findRoute,
  segmentWalkable,
  validPosition,
  walkable,
} from '../navigation.ts'
import type { Obstacle } from '../navigation.ts'
import {
  furnitureActivities,
  furnitureSizes,
  adoptionCatalog,
  lifeBalance as B,
  sleepSchedules,
} from './config.ts'
export type Life = {
  bathDay: string
  bathCount: number
  bath?: { startedAt: number; endsAt: number }
  lastRenameAt?: number
  names: { name: string; at: number }[]
  coldAt?: number
  lastSettledAt: number
}
export type Placement = { id: string; itemId: string; x: number; y: number; layer?:number; collision?:'decoration'|'obstacle'; w?:number; h?:number }
export type Hamster = {
  id: string
  foundAt: number
  regionId: string
  deployed: boolean
  x: number
  y: number
}
export type Expansion = {
  version: 1
  placements: Placement[]
  hamsters: Hamster[]
  adoptions: { id: string; at: number }[]
  events: { id: string; eventId: string; friendId: string; at: number }[]
  seen: string[]
}
export type LifeCommand =
  | { type: 'bath' | 'medicine'; friendId: string }
  | { type: 'rename'; friendId: string; name: string }
  | { type: 'adopt'; id: string }
  | {
      type: 'place'
      itemId: string
      x: number
      y: number
      placementId?: string
    }
  | { type: 'recover-furniture'; id: string }
  | { type: 'layer'; id:string; direction:'front'|'back'|'forward'|'backward' }
  | { type: 'hamster'; id: string; deployed: boolean }
  | { type: 'seen-discoveries' }
export function life(f: Friend, now = Date.now()): Life {
  return (f.life ??= {
    bathDay: dailyKey(now),
    bathCount: 0,
    names: [],
    lastSettledAt: now,
  })
}
export function expansion(s: Save): Expansion {
  return (world(s).expansion ??= {
    version: 1,
    placements: [],
    hamsters: [],
    adoptions: [],
    events: [],
    seen: [],
  })
}
export function sleeping(f: Friend, now = Date.now()) {
  if (f.growth?.awayJobId || f.life?.bath) return false
  const day = Math.floor((now + 9 * 3600000) / 86400000),
    minute = (now + 9 * 3600000 - day * 86400000) / 60000
  const [bed, wake] = sleepSchedules[f.id] ?? [0, 360]
  return bed < 0
    ? minute >= 1440 + bed || minute < wake
    : minute >= bed && minute < wake
}
export function busyLife(f: Friend, now = Date.now()) {
  return !!f.life?.bath || sleeping(f, now)
}
export function sleepLabel(f: Friend) {
  const [b, w] = sleepSchedules[f.id] ?? [0, 360]
  const fmt = (m: number) =>
    `${String(Math.floor(((m + 1440) % 1440) / 60)).padStart(2, '0')}:${String(m % 60 < 0 ? (m % 60) + 60 : m % 60).padStart(2, '0')}`
  return `${fmt(b)} ~ ${fmt(w)} (한국 시간)`
}
// The only live natural-stat settlement path. Advance both clocks together before any next command/save.
export function settleLife(s: Save, now = Date.now()) {
  const legacy=s.world?.statusBalanceVersion!==statusBalance.version
  expansion(s)
  const previousSave=s.savedAt
  for (const f of s.friends) {
    const l = life(f, Math.min(s.savedAt, now)),
      previous = Math.max(l.lastSettledAt, now - 8 * 3600000)
    if (l.bathDay !== dailyKey(now)) {
      l.bathDay = dailyKey(now)
      l.bathCount = 0
    }
    const from=Math.min(now,Math.max(previousSave,l.lastSettledAt))
    const bathEnd=l.bath?.endsAt
    if(legacy)f.stats=legacyChange(f.stats,now-previousSave)
    else f.stats=naturalChange(f.stats,Math.max(0,(bathEnd!==undefined&&bathEnd<=now?Math.max(from,bathEnd):now)-from))
    // Integrate fixed KST windows, never recover the same elapsed interval twice.
    const [bed, wake] = sleepSchedules[f.id] ?? [0, 360]
    let sleepMs = 0
    for (
      let day = Math.floor((previous + 9 * 3600000) / 86400000) - 1;
      day <= Math.floor((now + 9 * 3600000) / 86400000);
      day++
    ) {
      const start = day * 86400000 - 9 * 3600000 + bed * 60000,
        end = day * 86400000 - 9 * 3600000 + wake * 60000
      const a = Math.max(previous, start),
        b = Math.min(now, end)
      if (b <= a) continue
      const blocked = [
        ...(f.growth?.awayJobId
          ? s
              .world!.jobs.filter((j) => j.id === f.growth!.awayJobId)
              .map((j) => [j.startedAt, j.endsAt])
          : []),
        ...(l.bath ? [[l.bath.startedAt, l.bath.endsAt]] : []),
      ]
      let available = b - a
      for (const [x, y] of blocked)
        available -= Math.max(0, Math.min(b, y) - Math.max(a, x))
      sleepMs += Math.max(0, available)
    }
    f.stats.energy = Math.min(
      100,
      f.stats.energy +
        (sleepMs / 3600000) *
          ((legacy?9.6:0) + B.sleepRecoveryPerHour * (l.coldAt ? 0.5 : 1)),
    )
    if (l.bath && now >= l.bath.endsAt) {
      const sinceEnd = Math.min(8 * 3600000, Math.max(0, now - l.bath.endsAt))
      delete l.bath
      f.stats.hygiene = legacy?Math.max(0, 100 - (sinceEnd / 60000) * 0.3):100
      f.stats.happiness = Math.min(100, f.stats.happiness + 4)
      if(!legacy)f.stats=naturalChange(f.stats,Math.max(0,now-Math.max(from,bathEnd!)))
      announce(f, '개운하다! 보송보송~ 목욕 끝!')
      f.restingUntil = now + 1500
    }
    if (sleepMs > 0 && !sleeping(f, now) && f.stats.energy > 30 && previous < now) {
      const wakeHour = ((now + 9 * 3600000) % 86400000) / 60000
      if (wakeHour >= wake && previous < Math.floor((now + 9 * 3600000) / 86400000) * 86400000 - 9 * 3600000 + wake * 60000) announce(f, '푹 쉬었어! 기운이 돌아왔어~')
    }
    l.lastSettledAt = Math.max(l.lastSettledAt, now)
  }
  if(legacy){s.world!.statusBalanceVersion=statusBalance.version;s.world!.statusBalanceSince=now}
  s.savedAt=Math.max(previousSave,now)
}
export function placementCollision(p:Placement){return isGem(p.itemId)?'decoration':p.collision??(decorativeFurniture.has(p.itemId)?'decoration':'obstacle')}
export function orderedPlacements(s:Save){return [...(s.world?.expansion?.placements??[])].sort((a,b)=>(a.layer??s.world!.expansion!.placements.indexOf(a))-(b.layer??s.world!.expansion!.placements.indexOf(b)))}
export function furnitureObstacle(p: Placement): Obstacle {
  const base = furnitureSizes[p.itemId] ?? { w: 60, h: 40 },size={w:(p.w??base.w)*roomScale*(isGem(p.itemId)?.5:1),h:(p.h??base.h)*roomScale*(isGem(p.itemId)?.5:1)}
  return { x: p.x - size.w / 2, y: p.y - size.h * 0.6, ...size }
}
export function furnitureObstacles(s: Save) {
  return s.world?.expansion?.placements.filter(p=>placementCollision(p)==='obstacle').map(furnitureObstacle) ?? []
}
export function validLayout(s: Save, itemId: string, p: Point, exclude?: string) {
  const placed = expansion(s).placements.filter((x) => x.id !== exclude),
    o = furnitureObstacle({ id: '', itemId, ...p })
  const old=s.world?.expansion?.placements.find(x=>x.id===exclude)
  if(!withinPlacementFloor(itemId,p,old))return false
  if(isGem(itemId)||decorativeFurniture.has(itemId))return true
  const extra = [...placed.filter(p=>placementCollision(p)==='obstacle').map(furnitureObstacle), o],
    floor = cells.filter((c) => walkable(c, extra))
  if (floor.length < 90) return false
  // Every remaining grid cell must remain reachable: no sealed-off walking pockets.
  const visited = new Set<string>(),
    queue = [floor[0]],
    key = (p: Point) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]
    if (visited.has(key(c))) continue
    visited.add(key(c))
    for (const d of [
      [40, 0],
      [-40, 0],
      [0, 40],
      [0, -40],
    ]) {
      const n = { x: c.x + d[0], y: c.y + d[1] }
      if (
        floor.some((p) => p.x === n.x && p.y === n.y) &&
        !visited.has(key(n)) &&
        segmentWalkable(c, n, extra)
      )
        queue.push(n)
    }
  }
  return visited.size === floor.length
}
export function makeAdoptee(id: string, now: number): Friend {
  const d = adoptionCatalog.find((d) => d.id === id)
  if (!d) throw Error('알 수 없는 입양 친구예요.')
  const spawn = [
    { x: 530, y: 390 },
    { x: 400, y: 330 },
    { x: 610, y: 540 },
    { x: 870, y: 490 },
  ][adoptionCatalog.findIndex((a) => a.id === id)]
  const f = {
    ...createFriends(now)[0],
    ...d,
    ...scaledPoint(spawn),
    stats: {
      hunger: 78,
      happiness: 85,
      energy: 90,
      hygiene: 82,
      affection: 20,
    },
  }
  growth(f, now).traits[d.trait] = 50
  life(f, now)
  return f
}
export function lifeCommand(s: Save, c: LifeCommand, now = Date.now()): string {
  const e = expansion(s),
    w = world(s),
    f = 'friendId' in c ? s.friends.find((f) => f.id === c.friendId) : undefined
  if ('friendId' in c && !f) throw Error('친구를 찾을 수 없어요.')
  if (c.type === 'bath') {
    settleLife(s, now)
    const l = life(f!, now)
    if (f!.growth?.awayJobId || busyLife(f!, now) || f!.interaction?.gesture)
      return '탐험·수면·목욕·교감 중에는 목욕을 시작할 수 없어요.'
    if (l.bathCount >= B.bathsPerDay)
      return '오늘은 충분히 씻었어요! 내일 다시 씻겨 주세요 🛁'
    l.bathCount++
    l.bath = { startedAt: now, endsAt: now + B.bathMs }
    f!.route = []
    f!.moving = false
    announce(f!, '뽀글뽀글~ 따뜻한 목욕 시간이야!')
    return '30분 동안 목욕해요. 창을 닫아도 시간이 흘러요.'
  }
  if (c.type === 'rename') {
    const name = c.name.trim(),
      l = life(f!, now)
    if (!name || [...name].length > 12 || /[\p{Cc}\p{Cf}]/u.test(name))
      return '이름은 제어 문자를 제외한 1~12글자로 지어 주세요.'
    if (l.lastRenameAt !== undefined && now - l.lastRenameAt < B.renameMs)
      return '이름은 변경 후 168시간이 지나야 다시 바꿀 수 있어요.'
    if (f!.name === name) return '현재 이름과 같아요.'
    l.names.push({ name: f!.name, at: now })
    l.lastRenameAt = now
    f!.name = name
    return `이제 ${name}(이)라고 불러 주세요!`
  }
  if (c.type === 'medicine') {
    if (!life(f!, now).coldAt)
      return '감기에 걸린 친구에게만 약을 줄 수 있어요.'
    if (f!.growth?.awayJobId || busyLife(f!, now) || f!.interaction?.gesture)
      return '탐험·목욕·수면·교감이 끝나면 약을 줄 수 있어요.'
    if (!(w.inventory.medicine > 0))
      return '감기약이 없어요! 상점에서 구매해 주세요.'
    if (now < w.useAfter) return '잠깐만 기다려 주세요.'
    w.inventory.medicine--
    w.useAfter = now + 1500
    f!.recoveryUntil = now + 2000
    delete life(f!, now).coldAt
    announce(f!, '에취… 이제 훨씬 좋아졌어! 고마워~')
    return '감기약으로 바로 나았어요!'
  }
  if (c.type === 'adopt') {
    if (!adoptionCatalog.some((d) => d.id === c.id))
      return '입양할 친구를 선택해 주세요.'
    if (
      s.friends.some((f) => f.id === c.id) ||
      normalFriendCount(s) >= B.maxFriends
    )
      return '이미 함께 살거나 우리 집이 가득 찼어요.'
    if (!transact(w, -B.adoptionPrice, '새 친구 입양', now))
      return '입양에는 10,000코인이 필요해요.'
    const newFriend = makeAdoptee(c.id, now)
    s.friends.push(newFriend)
    announce(newFriend, '안녕! 새 가족이 되어서 행복해! 잘 부탁해 ♡')
    newFriend.furnitureUntil = now + 6000
    newFriend.furnitureActivity = '✧ 새로운 가족을 환영해요 ✧'
    e.adoptions.push({ id: c.id, at: now })
    return '새 식구가 왔어요! 반갑게 인사해 주세요 ♡'
  }
  if (c.type === 'place') {
    const old = c.placementId
        ? e.placements.find((p) => p.id === c.placementId)
        : undefined,
      item = itemById[c.itemId]
    if (
      !item ||
      (item.category !== 'decor' && !isGem(c.itemId)) ||
      (c.placementId && !old) ||
      (old && old.itemId !== c.itemId)
    )
      return '배치할 가구를 확인해 주세요.'
    if (
      !old &&
      (!(w.inventory[c.itemId] > 0) || e.placements.length >= B.maxFurniture)
    )
      return '보유한 가구만 최대 18개 배치할 수 있어요.'
    if (!validLayout(s, c.itemId, c, c.placementId))
      return '방 안의 바닥에 놓아 주세요. 친구들이 걸을 통로도 남겨 주세요.'
    if (old) {
      old.x = c.x
      old.y = c.y
    } else {
      w.inventory[c.itemId]--
      e.placements.push({
        id: crypto.randomUUID(),
        itemId: c.itemId,
        x: c.x,
        y: c.y,
        layer:e.placements.reduce((n,p)=>Math.max(n,p.layer??e.placements.indexOf(p)),-1)+1,
        collision:isGem(c.itemId)||decorativeFurniture.has(c.itemId)?'decoration':'obstacle',
      })
    }
    const extra = furnitureObstacles(s)
    for (const f of s.friends) {
      Object.assign(f, validPosition(f, extra))
      f.route = []
    }
    return '가구를 놓았어요! 친구들의 산책길도 확인했어요.'
  }
  if(c.type==='layer'){
    const ordered=orderedPlacements(s),index=ordered.findIndex(p=>p.id===c.id)
    if(index<0)throw Error('배치한 아이템을 선택해 주세요.')
    const [p]=ordered.splice(index,1),target=c.direction==='front'?ordered.length:c.direction==='back'?0:c.direction==='forward'?Math.min(ordered.length,index+1):Math.max(0,index-1)
    ordered.splice(target,0,p);ordered.forEach((p,i)=>p.layer=i)
    return '배치 순서를 바꿨어요.'
  }
  if (c.type === 'recover-furniture') {
    const p = e.placements.find((p) => p.id === c.id)
    if (!p) return '이미 회수한 가구예요.'
    w.inventory[p.itemId] = (w.inventory[p.itemId] ?? 0) + 1
    e.placements = e.placements.filter((p) => p.id !== c.id)
    return '가구를 인벤토리에 돌려놓았어요.'
  }
  if (c.type === 'hamster') {
    const h = e.hamsters.find((h) => h.id === c.id)
    if (!h) return '햄스터를 찾을 수 없어요.'
    if (
      c.deployed &&
      !h.deployed &&
      e.hamsters.filter((h) => h.deployed).length >= B.maxHamsters
    )
      return '방에는 햄스터 세 마리까지 함께할 수 있어요.'
    h.deployed = c.deployed
    return c.deployed
      ? '작은 햄스터가 놀러 나왔어요!'
      : '햄스터가 안전하게 인벤토리에서 쉬어요.'
  }
  if (c.type === 'seen-discoveries') {
    e.seen = Object.keys(w.book).concat(e.hamsters.map((h) => h.id))
    return '새로운 발견을 도감에 간직했어요.'
  }
  return '변경했어요.'
}
export function attachNavigation(s: Save) {
  const extra = furnitureObstacles(s)
  for (const f of s.friends) {
    f.navObstacles = extra
    if (!walkable(f, extra)) {
      Object.assign(f, validPosition(f, extra))
      f.route = []
    }
    if (f.route.some((p) => !walkable(p, extra))) f.route = []
  }
}
// New decorations become calm visual destinations; this never creates server rewards.
export function furnitureDestination(f: Friend, s: Save, now: number) {
  const e = s.world?.expansion
  if (!e || f.interaction?.gesture) return
  if (
    !f.route.length &&
    !busyLife(f, now) &&
    !f.growth?.awayJobId &&
    now >= f.restingUntil &&
    Math.random() < 0.2
  ) {
    const p = e.placements[Math.floor(Math.random() * e.placements.length)],
      h = e.hamsters.find((h) => h.deployed)
    if (h && Math.random() < 0.3) {
      f.route = findRoute(f, h, f.navObstacles)
      f.furnitureUntil = now + 4000
      f.furnitureActivity = '햄스터 구경 · 살금살금'
      speak(
        f,
        [
          '햄스터 너무 귀엽다!',
          '쪼그만 친구가 생겼네!',
          '어디 가는 거야?',
          '작은 친구랑 놀고 싶어!',
        ][Math.floor(Math.random() * 4)],
        now,
        2,
      )
    } else if (p) {
      const target = validPosition({ x: p.x - 60, y: p.y + 20 }, f.navObstacles)
      f.route = findRoute(f, target, f.navObstacles)
      f.furnitureUntil = now + 6000
      f.furnitureActivity =
        furnitureActivities[p.itemId] ?? '꽃과 예쁜 장식 구경'
    }
  }
}

// Read-only projection: crossing midnight changes the displayed daily quota,
// while an existing 30-minute bath continues to its original deadline.
export function bathStatus(f:Friend,now:number){
 const used=f.life?.bathDay===dailyKey(now)?f.life.bathCount:0
 const remaining=Math.max(0,(f.life?.bath?.endsAt??0)-now)
 return {used,remaining,full:used>=B.bathsPerDay,label:`씻기 (${used}/${B.bathsPerDay})`,time:`${Math.floor(Math.ceil(remaining/1000)/60)}분 ${String(Math.ceil(remaining/1000)%60).padStart(2,'0')}초`}
}
