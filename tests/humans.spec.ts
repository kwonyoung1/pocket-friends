import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createFriends } from '../src/game'
import type { Save } from '../src/game'
import { world } from '../src/progression/model'
import { lifeCommand } from '../src/expansion/model'
import { grantSpecialFriends } from '../src/humans/model'
import { expectFriendsToWalk } from './movement'
const epoch = Date.parse('2026-10-15T03:00:00Z')
function fixture(): Save {
  const s: Save = {
    version: 2,
    savedAt: epoch,
    friends: createFriends(epoch),
    memories: [],
  }
  world(s, epoch)
  return s
}
async function seed(page: Page, s: Save, time = epoch) {
  await page.clock.install({ time: new Date(time) })
  await page.clock.pauseAt(new Date(time + 1000))
  await page.addInitScript((data) => {
    let seed = 42
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
    if (!sessionStorage.getItem('humans-seeded')) {
      localStorage.setItem('pocket-friends-v1', JSON.stringify(data))
      sessionStorage.setItem('humans-seeded', '1')
    }
  }, s)
  await page.goto('/')
  await expect(page.getByTestId('room-special-boy')).toBeVisible()
  await expect(page.getByTestId('room-special-girl')).toBeVisible()
}
async function data(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('pocket-friends-v1')!),
  )
}
test('legacy eight friends, pictures, inventory and progress remain; gifts arrive once and have separate PNGs with real alpha', async ({
  page,
}, info) => {
  const s = fixture()
  s.world!.coins = 40000
  s.world!.inventory.lunch = 3
  s.friends[0].stats.affection = 77
  for (const id of ['lulu', 'toto', 'byeol', 'mungchi'])
    lifeCommand(s, { type: 'adopt', id }, epoch)
  const raw = JSON.stringify(s)
  await seed(page, s)
  await expect(page.locator('.room-friend')).toHaveCount(10)
  const saved = await data(page)
  expect(saved.world.coins).toBe(0)
  expect(saved.world.inventory.lunch).toBe(3)
  expect(saved.friends[0].stats.affection).toBe(77)
  expect(saved.world.expansion.adoptions).toHaveLength(4)
  expect(
    await page.evaluate(() =>
      localStorage.getItem('pocket-friends-v1-before-humans'),
    ),
  ).toBe(raw)
  for (const kind of ['boy', 'girl']) {
    const img = page.getByTestId(`room-special-${kind}`).locator('.human-art')
    await expect(img).toBeVisible()
    await expect(img).toHaveAttribute('src', new RegExp(kind))
    const alpha = await img.evaluate(async (node) => {
      const img = node as HTMLImageElement
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const p = ctx.getImageData(0, 0, c.width, c.height).data
      let transparent = 0,
        opaque = 0,
        edgeOpaque = 0
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++) {
          const a = p[(y * c.width + x) * 4 + 3]
          if (a === 0) transparent++
          if (a > 128) {
            opaque++
            if (x === 0 || y === 0 || x === c.width - 1 || y === c.height - 1)
              edgeOpaque++
          }
        }
      return {
        transparent,
        opaque,
        edgeOpaque,
        width: c.width,
        height: c.height,
      }
    })
    expect(alpha.transparent).toBeGreaterThan(10000)
    expect(alpha.opaque).toBeGreaterThan(10000)
    expect(alpha.edgeOpaque).toBe(0)
    expect(alpha.width).toBe(alpha.height)
  }
  await page.reload()
  await expect(page.locator('.room-friend')).toHaveCount(10)
  expect((await data(page)).world.coins).toBe(0)
  await page.screenshot({
    path: `docs/screenshots/human-friends-${info.project.name}.png`,
    fullPage: true,
  })
})
test('both gifts independently walk, pause, and automatically speak Korean', async ({
  page,
}) => {
  await seed(page, fixture())
  await expectFriendsToWalk(page, ['special-boy', 'special-girl'])
  await page.clock.runFor(51000)
  const saved = await data(page)
  for (const id of ['special-boy', 'special-girl'])
    expect(
      saved.friends.find((f: { id: string }) => f.id === id).bubble,
    ).toMatch(/[가-힣]/)
  expect(
    await page.evaluate(() => document.body.scrollWidth > innerWidth),
  ).toBe(false)
})
test('short pet and special hold switch visual states without swapping size or charging coins', async ({
  page,
}) => {
  await seed(page, fixture())
  const boy = page.getByTestId('room-special-boy'),
    girl = page.getByTestId('room-special-girl')
  await boy.click()
  await page.clock.runFor(100)
  await expect(boy.locator('[data-human-pose]')).toHaveAttribute(
    'data-human-pose',
    'smile',
  )
  expect(
    (await data(page)).friends.find(
      (f: { id: string }) => f.id === 'special-boy',
    ).stats.affection,
  ).toBe(21)
  await girl.scrollIntoViewIfNeeded()
  const target = await girl.locator('.friend-figure').boundingBox(),
    size = await girl.locator('.human-sprite').evaluate(el=>({width:el.clientWidth,height:el.clientHeight}))
  await page.mouse.move(
    target!.x + target!.width / 2,
    target!.y + target!.height / 2,
  )
  await page.mouse.down()
  await page.clock.runFor(900)
  await expect(girl.locator('[data-human-pose]')).toHaveAttribute(
    'data-human-pose',
    'smile',
  )
  await page.clock.runFor(1200)
  await expect(girl.locator('[data-human-pose]')).toHaveAttribute(
    'data-human-pose',
    'happy',
  )
  expect(await girl.locator('.pet-heart').count()).toBeGreaterThanOrEqual(5)
  // Compare layout dimensions; the existing pet animation intentionally scales its parent by a few percent.
  const after = await girl.locator('.human-sprite').evaluate(el=>({width:el.clientWidth,height:el.clientHeight}))
  expect(after!.width).toBe(size!.width)
  expect(after!.height).toBe(size!.height)
  await page.mouse.up()
  expect((await data(page)).world.coins).toBe(300)
})
test('special friend rename and real pointer dragging persist, without replacing original friends', async ({
  page,
  isMobile,
}) => {
  await seed(page, fixture())
  await page.getByRole('button', { name: '남자아이 상태 확인' }).click()
  await page.getByRole('button', { name: '생활·입양', exact: true }).click()
  await page.getByLabel('새 이름').fill('다정한 소년')
  await page.getByRole('button', { name: '이름 저장' }).click()
  await page.getByRole('button', { name: '생활 메뉴 닫기' }).click()
  const actor = page.getByTestId('room-special-boy')
  await actor.scrollIntoViewIfNeeded()
  const p = await actor.locator('.friend-figure').boundingBox(),
    before = await actor.getAttribute('data-x')
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page)
    const x = p!.x + p!.width / 2,
      y = p!.y + p!.height / 2
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 9 }],
    })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + 35, y: y + 20, id: 9 }],
    })
    await page.clock.runFor(200)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await cdp.detach()
  } else {
    await page.mouse.move(p!.x + p!.width / 2, p!.y + p!.height / 2)
    await page.mouse.down()
    await page.mouse.move(p!.x + p!.width / 2 + 35, p!.y + p!.height / 2 + 20, {
      steps: 4,
    })
    await page.clock.runFor(200)
    await page.mouse.up()
  }
  expect(await actor.getAttribute('data-x')).not.toBe(before)
  await page.reload()
  await expect(
    page.getByRole('button', { name: '다정한 소년 상태 확인' }),
  ).toBeVisible()
  await expect(page.locator('.room-friend')).toHaveCount(6)
  const saved = await data(page)
  expect(saved.friends.slice(0, 4).map((f: { id: string }) => f.id)).toEqual([
    'momo',
    'bibi',
    'coco',
    'dudu',
  ])
  expect(
    saved.friends.filter((f: { id: string }) => f.id === 'special-boy'),
  ).toHaveLength(1)
})
test('sleep mode uses the same anchored artwork and wakes naturally without a pet reward', async ({
  page,
}) => {
  const time = Date.parse('2026-10-15T16:00:00Z'),
    s = fixture()
  s.savedAt = time
  grantSpecialFriends(s, time)
  await seed(page, s, time)
  const actor = page.getByTestId('room-special-girl')
  await expect(actor.locator('[data-human-pose]')).toHaveAttribute(
    'data-human-pose',
    'sleep',
  )
  await expect(actor.locator('.human-blanket')).toBeVisible()
  const src = await actor.locator('img').getAttribute('src')
  await actor.click()
  await page.clock.runFor(100)
  expect(
    (await data(page)).friends.find(
      (f: { id: string }) => f.id === 'special-girl',
    ).stats.affection,
  ).toBe(20)
  await page.clock.fastForward(6 * 3600000)
  await page.clock.runFor(5200)
  await expect(actor.locator('[data-human-pose]')).not.toHaveAttribute(
    'data-human-pose',
    'sleep',
  )
  expect(await actor.locator('img').getAttribute('src')).toBe(src)
})
