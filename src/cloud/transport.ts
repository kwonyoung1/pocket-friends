import type { WorldRow } from './protocol.ts'

// Transport-only: never accepts balances, state patches or timestamps as commands.
export const syncProtocol = 'delta-v1'
export type Change = { path: string[]; value?: unknown; remove?: true }
export type WorldDelta = { id: string; baseRevision: number; revision: number; updated_at: string; changes: Change[] }
export type WorldPayload = { row: WorldRow } | { delta: WorldDelta } | { unchanged: true; revision: number }
const unsafe = new Set(['__proto__', 'prototype', 'constructor'])
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object'
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export function worldPayload(row: WorldRow, base?: WorldRow): WorldPayload {
  if (!base || base.id !== row.id || base.revision > row.revision) return { row }
  if (base.revision === row.revision) return { unchanged: true, revision: row.revision }
  const changes: Change[] = []
  const diff = (before: unknown, after: unknown, path: string[]) => {
    if (Object.is(before, after)) return
    if (record(before) && record(after) && Array.isArray(before) === Array.isArray(after) && (!Array.isArray(before) || before.length === after.length)) {
      const start = changes.length
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (unsafe.has(key)) throw Error('Unsafe delta path')
        if (!(key in after)) changes.push({ path: [...path, key], remove: true })
        else diff(before[key], after[key], [...path, key])
      }
      // Replace a small changed subtree (e.g. five stats) when cheaper than repeating
      // its path for each leaf. Large unchanged photos remain out of routine deltas.
      const replacement: Change = { path, value: after }
      if (changes.length - start > 1 && JSON.stringify(replacement).length < JSON.stringify(changes.slice(start)).length) changes.splice(start, changes.length - start, replacement)
    } else changes.push({ path, value: after })
  }
  try { diff(clean(base.data), clean(row.data), []) } catch { return { row } }
  const delta: WorldDelta = { id: row.id, baseRevision: base.revision, revision: row.revision, updated_at: row.updated_at, changes }
  // A large replacement, import or photo update can be cheaper as a full row.
  return changes.length <= 2048 && JSON.stringify({ delta }).length < JSON.stringify({ row }).length ? { delta } : { row }
}

export function applyWorldDelta(base: WorldRow, delta: WorldDelta): WorldRow {
  if (base.id !== delta.id || base.revision !== delta.baseRevision || !Number.isSafeInteger(delta.revision) || delta.revision <= base.revision || !Array.isArray(delta.changes) || delta.changes.length > 2048) throw Error('Delta base mismatch')
  let data: unknown = structuredClone(base.data)
  for (const change of delta.changes) {
    const path = change.path
    if (!Array.isArray(path) || path.length > 80 || path.some(key => typeof key !== 'string' || unsafe.has(key))) throw Error('Invalid delta path')
    if (!path.length) { if (change.remove) throw Error('Cannot remove world'); data = structuredClone(change.value); continue }
    let target = data
    for (const key of path.slice(0, -1)) {
      if (!record(target) || !Object.hasOwn(target, key)) throw Error('Missing delta parent')
      target = target[key]
    }
    if (!record(target)) throw Error('Invalid delta target')
    const key = path[path.length - 1]
    if (Array.isArray(target) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= target.length || change.remove)) throw Error('Invalid array delta')
    if (change.remove) delete target[key]
    else Object.defineProperty(target, key, { value: structuredClone(change.value), enumerable: true, writable: true, configurable: true })
  }
  if (data !== null && !record(data)) throw Error('Invalid world data')
  return { id: delta.id, revision: delta.revision, updated_at: delta.updated_at, data: data as WorldRow['data'] }
}
