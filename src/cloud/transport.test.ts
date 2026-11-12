import { describe, expect, it } from 'vitest'
import { applyWorldDelta, worldPayload } from './transport'
import { freshWorld } from './engine'
import type { WorldRow } from './protocol'
const row = (): WorldRow => ({ id: 'home', revision: 4, updated_at: 'before', data: freshWorld(1000) })
describe('revision-bound lossless wire transport', () => {
  it('round-trips stats, array edits, nested additions/deletions and untouched private photos without mutating the base', () => {
    const before = row(); before.data!.friends[0].bubblePriority = 3; before.data!.friends[0].photo = 'data:image/png;base64,' + 'A'.repeat(55000)
    const original = structuredClone(before), next = structuredClone(before); next.revision++; next.updated_at = 'after'
    next.data!.world!.coins += 25; next.data!.friends[0].stats.happiness -= .125
    next.data!.memories.push({id:'m',text:'kept',at:1001}); delete next.data!.friends[0].bubblePriority
    const wire = worldPayload(next, before)
    expect('delta' in wire).toBe(true)
    if (!('delta' in wire)) throw Error('Expected delta')
    expect(applyWorldDelta(before, wire.delta)).toEqual(JSON.parse(JSON.stringify(next)))
    expect(before).toEqual(original); expect(JSON.stringify(wire)).not.toContain('AAAAA')
    expect(JSON.stringify(wire).length).toBeLessThan(JSON.stringify(next).length / 20)
  })
  it('unchanged versions omit the world; missing bases and large changes use a full row', () => {
    const before = row()
    expect(worldPayload(before, before)).toEqual({unchanged:true,revision:4})
    expect(worldPayload(before)).toEqual({row:before})
    const next = {...before, revision:5, data:null}
    expect(worldPayload(next, before)).toEqual({row:next})
  })
  it('rejects stale bases, invalid arrays and prototype pollution atomically', () => {
    const before = row(), original = structuredClone(before)
    const delta = {id:'home',baseRevision:3,revision:5,updated_at:'next',changes:[]}
    expect(() => applyWorldDelta(before,delta)).toThrow()
    for (const path of [['__proto__','polluted'],['friends','999999'],['friends','length']]) {
      expect(() => applyWorldDelta(before,{...delta,baseRevision:4,changes:[{path,value:true}]})).toThrow()
    }
    expect(({} as {polluted?:boolean}).polluted).toBeUndefined(); expect(before).toEqual(original)
  })
  it('reconstructs randomized mixed JSON edits and preserves fractional precision', () => {
    for(let i=0;i<60;i++) {
      const before=row(), next=structuredClone(before);next.revision++
      next.data!.friends[i%next.data!.friends.length].stats.energy=100/((i%17)+1)
      next.data!.world!.inventory['test-item']=i
      if(i%3===0)next.data!.memories=[]
      const payload=worldPayload(next,before)
      expect('delta' in payload?applyWorldDelta(before,payload.delta):'row' in payload?payload.row:before).toEqual(JSON.parse(JSON.stringify(next)))
    }
  })
})
