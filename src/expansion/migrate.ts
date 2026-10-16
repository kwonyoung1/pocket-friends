import {room} from '../room/config.ts'
import type { Life, Expansion } from './model.ts'
import { itemById } from '../progression/config.ts'
import { adoptionCatalog, tripEvents } from './config.ts'
const obj = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw Error('생활 데이터가 올바르지 않아요.')
  return v as Record<string, unknown>
}
const num = (v: unknown, max = 8e15) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max)
    throw Error('생활 데이터 수치가 올바르지 않아요.')
  return v
}
const text = (v: unknown, max = 200) => {
  if (typeof v !== 'string' || v.length > max)
    throw Error('생활 기록이 올바르지 않아요.')
  return v
}
const arr = (v: unknown, max = 10000): unknown[] => {
  if (!Array.isArray(v) || v.length > max)
    throw Error('생활 목록이 올바르지 않아요.')
  return v
}
export function migrateLife(raw: unknown): Life | undefined {
  if (raw === undefined) return undefined
  const r = obj(raw),
    l: Life = {
      bathDay: text(r.bathDay, 10),
      bathCount: num(r.bathCount, 2),
      names: arr(r.names).map((v) => {
        const x = obj(v)
        return { name: text(x.name, 100), at: num(x.at) }
      }),
      lastSettledAt: num(r.lastSettledAt),
    }
  if (r.lastRenameAt !== undefined) l.lastRenameAt = num(r.lastRenameAt)
  if (r.coldAt !== undefined) l.coldAt = num(r.coldAt)
  if (r.bath !== undefined) {
    const b = obj(r.bath)
    l.bath = { startedAt: num(b.startedAt), endsAt: num(b.endsAt) }
    if (
      l.bath.endsAt < l.bath.startedAt ||
      l.bath.endsAt - l.bath.startedAt > 1800000
    )
      throw Error('목욕 시간이 올바르지 않아요.')
  }
  return l
}
export function migrateExpansion(raw: unknown): Expansion | undefined {
  if (raw === undefined) return undefined
  const r = obj(raw)
  if (r.version !== 1)
    throw Error('새로운 버전의 생활 데이터예요. 최신 게임을 열어 주세요.')
  const e: Expansion = {
    version: 1,
    placements: arr(r.placements, 18).map((v) => {
      const p = obj(v),
        itemId = text(p.itemId)
      if (itemById[itemId]?.category !== 'decor')
        throw Error('알 수 없는 가구예요.')
      return { id: text(p.id), itemId, x: num(p.x, room.width), y: num(p.y, room.height) }
    }),
    hamsters: arr(r.hamsters).map((v) => {
      const h = obj(v)
      if (typeof h.deployed !== 'boolean')
        throw Error('햄스터 상태가 올바르지 않아요.')
      return {
        id: text(h.id),
        foundAt: num(h.foundAt),
        regionId: text(h.regionId),
        deployed: h.deployed,
        x: num(h.x, room.width),
        y: num(h.y, room.height),
      }
    }),
    adoptions: arr(r.adoptions, 4).map((v) => {
      const a = obj(v),
        id = text(a.id)
      if (!adoptionCatalog.some((d) => d.id === id))
        throw Error('입양 기록이 올바르지 않아요.')
      return { id, at: num(a.at) }
    }),
    events: arr(r.events).map((v) => {
      const a = obj(v),
        eventId = text(a.eventId)
      if (!tripEvents.some((e) => e.id === eventId))
        throw Error('탐험 이벤트 기록이 올바르지 않아요.')
      return {
        id: text(a.id),
        eventId,
        friendId: text(a.friendId),
        at: num(a.at),
      }
    }),
    seen: arr(r.seen).map((v) => text(v)),
  }
  for (const a of [e.placements, e.hamsters, e.adoptions])
    if (new Set(a.map((p) => p.id)).size !== a.length)
      throw Error('생활 기록이 중복돼요.')
  if (e.hamsters.filter((h) => h.deployed).length > 3)
    throw Error('햄스터는 세 마리까지 함께할 수 있어요.')
  return e
}
