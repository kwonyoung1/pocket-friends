import { describe, it, expect } from 'vitest'
import { createFriends, parseSave, tick } from '../game'
import type { Save } from '../game'
import {
  world,
  acquire,
  startExpedition,
  growth,
  useItem,
} from '../progression/model'
import { grantSpecialFriends, normalFriendCount } from './model'
import { specialIds, humanLines } from './config'
import { humanPose } from './pose'
import { lifeCommand } from '../expansion/model'
import { reactionLine, beginGesture, endGesture } from '../interaction'
import { walkable } from '../navigation'
const noon = Date.parse('2026-10-15T03:00:00Z')
function game(): Save {
  const s: Save = {
    version: 2,
    savedAt: noon,
    friends: createFriends(noon),
    memories: [],
  }
  world(s, noon)
  return s
}
describe('special human friends preserve the existing household', () => {
  it('appends each gift once at no cost, preserving existing objects, snapshots and pending rewards', () => {
    const s = game(),
      w = world(s)
    w.coins = 9876
    acquire(w, 'plant', noon)
    s.friends[0].name = '소중한 모모'
    s.friends[0].photo = 'data:image/png;base64,AAAA'
    growth(s.friends[0]).xp = 12
    startExpedition(s, 'bibi', 'forest', noon, () => 0.999)
    const old = s.friends.slice(),
      snapshot = JSON.stringify(s)
    expect(grantSpecialFriends(s, noon)).toBe(2)
    expect(grantSpecialFriends(s, noon + 1)).toBe(0)
    old.forEach((f, i) => expect(s.friends[i]).toBe(f))
    expect(
      JSON.stringify({
        ...s,
        friends: s.friends.slice(0, 4),
        world: { ...w, specialFriendsVersion: undefined },
      }),
    ).toBe(snapshot)
    expect(w.coins).toBe(9876)
    expect(w.inventory.plant).toBe(1)
    expect(s.friends.map((f) => f.id).slice(4)).toEqual(specialIds)
  })
  it('adds two gifts beyond the normal eight-person cap, then round-trips all ten with names, photos and growth', () => {
    const s = game()
    world(s).coins = 40000
    for (const id of ['lulu', 'toto', 'byeol', 'mungchi'])
      lifeCommand(s, { type: 'adopt', id }, noon)
    grantSpecialFriends(s, noon)
    expect(s.friends).toHaveLength(10)
    expect(normalFriendCount(s)).toBe(8)
    expect(world(s).coins).toBe(0)
    const boy = s.friends.find((f) => f.id === 'special-boy')!
    growth(boy).xp = 17
    lifeCommand(
      s,
      { type: 'rename', friendId: boy.id, name: '우리 남자아이' },
      noon,
    )
    const restored = parseSave(JSON.stringify(s), noon)
    expect(restored.friends).toHaveLength(10)
    expect(grantSpecialFriends(restored, noon)).toBe(0)
    expect(restored.friends.find((f) => f.id === boy.id)?.name).toBe(
      '우리 남자아이',
    )
    expect(growth(restored.friends.find((f) => f.id === boy.id)!).xp).toBe(17)
  })
  it('does not consume adoption slots when the gifts arrive before paid friends', () => {
    const s = game()
    grantSpecialFriends(s, noon)
    world(s).coins = 40000
    for (const id of ['lulu', 'toto', 'byeol', 'mungchi'])
      lifeCommand(s, { type: 'adopt', id }, noon)
    expect(s.friends).toHaveLength(10)
    expect(s.world!.expansion!.adoptions).toHaveLength(4)
    expect(world(s).coins).toBe(0)
    expect(lifeCommand(s, { type: 'adopt', id: 'lulu' }, noon)).toContain(
      '이미',
    )
  })
  it('both humans independently walk on valid floor, speak and support pet/rename/food/expeditions', () => {
    const s = game()
    grantSpecialFriends(s, noon)
    const humans = s.friends.slice(4)
    const travel = [0, 0]
    for (let i = 1; i <= 600; i++) {
      const before = humans.map((f) => ({ x: f.x, y: f.y }))
      tick(s.friends, noon + i * 100, 0.1, () => {})
      humans.forEach((f, j) => {
        travel[j] += Math.hypot(f.x - before[j].x, f.y - before[j].y)
        expect(walkable(f)).toBe(true)
      })
    }
    travel.forEach((d) => expect(d).toBeGreaterThan(100))
    humans.forEach((f) => expect(f.bubble).toMatch(/[가-힣]/))
    const f = humans[0]
    delete f.interaction
    f.careAfter = 0
    const affection = f.stats.affection
    beginGesture(f, 1, { x: 0, y: 0 }, 'head', noon + 70000, 'touch')
    endGesture(f, 1, noon + 70100)
    expect(f.stats.affection).toBeGreaterThanOrEqual(affection)
    delete f.interaction
    acquire(world(s), 'bread', noon)
    expect(useItem(s, 'bread', f.id, noon + 80000)).toContain('먹었어요')
    expect(
      startExpedition(s, f.id, 'forest', noon + 90000, () => 0.999),
    ).toContain('출발')
  })
  it('selects visual states in priority order without inventing missing camera views', () => {
    const s = game()
    grantSpecialFriends(s, noon)
    const f = s.friends[4]
    f.restingUntil = 0
    expect(humanPose(f, 'normal', noon)).toBe('idle')
    f.moving = true
    expect(humanPose(f, 'normal', noon)).toBe('walk')
    f.interaction = {
      phase: 'bonding',
      startedAt: noon,
      effectUntil: noon + 2000,
      resumeAt: noon + 2000,
      zone: 'head',
      tilt: 0,
      rewardAttempted: true,
    }
    expect(humanPose(f, 'closed', noon)).toBe('happy')
    f.interaction.phase = 'dragging'
    expect(humanPose(f, 'normal', noon)).toBe('surprised')
    delete f.interaction
    f.moving = false
    f.furnitureUntil = noon + 1000
    f.furnitureActivity = '신나는 놀이'
    expect(humanPose(f, 'normal', noon)).toBe('play')
    expect(humanPose(f, 'normal', Date.parse('2026-10-15T16:00:00Z'))).toBe(
      'sleep',
    )
  })
  it('has at least twenty unique Korean lines each and never repeats consecutive pet lines', () => {
    const s = game()
    grantSpecialFriends(s, noon)
    for (const [kind, topics] of Object.entries(humanLines)) {
      const lines = Object.values(topics).flat()
      expect(new Set(lines).size).toBeGreaterThanOrEqual(20)
      lines.forEach((l) => expect(l).toMatch(/[가-힣]/))
      const f = s.friends.find((f) => f.kind === kind)!
      for (let i = 0; i < 50; i++) {
        const old = f.lastPetLine
        expect(reactionLine(f, i % 2 === 0)).not.toBe(old)
      }
    }
  })
})
it('the two human friends exchange their own short conversation when they meet', () => {
  const s = game()
  grantSpecialFriends(s, noon)
  const [boy, girl] = s.friends.slice(4)
  Object.assign(boy, {
    x: 400,
    y: 360,
    route: [{ x: 470, y: 360 }],
    meeting: girl.id,
    socialAfter: 0,
    restingUntil: 0,
  })
  Object.assign(girl, {
    x: 470,
    y: 360,
    route: [],
    socialAfter: 0,
    restingUntil: 0,
  })
  tick([boy, girl], noon, 0.1, () => {})
  expect(boy.bubble).toContain(girl.name)
  expect(girl.bubble).toBe('')
  tick([boy, girl], noon + 6600, 0.1, () => {})
  expect(girl.bubble).toContain(boy.name)
  expect(boy.bubblePriority).toBe(2)
  expect(girl.bubblePriority).toBe(2)
  expect(humanPose(boy, 'normal', noon)).toBe('smile')
})
