import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createFriends } from '../src/game'
import type { Save } from '../src/game'
import { world, growth } from '../src/progression/model'
import { expansion } from '../src/expansion/model'
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
    if (!sessionStorage.getItem('expansion-seeded')) {
      localStorage.setItem('pocket-friends-v1', JSON.stringify(data))
      sessionStorage.setItem('expansion-seeded', '1')
    }
  }, s)
  await page.addInitScript(() => {
    let seed = 42
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
  })
  await page.goto('/')
  await expect(page.getByTestId('room-momo')).toBeVisible()
}
async function data(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('pocket-friends-v1')!),
  )
}
async function life(page: Page) {
  await page.getByRole('button', { name: '생활·입양', exact: true }).click()
}
async function closeLife(page: Page) {
  await page.getByRole('button', { name: '생활 메뉴 닫기' }).click()
}
async function menu(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: '성장과 모험 메뉴' })
    .getByRole('button', { name, exact: true })
    .click()
}
test('owned food, favorites, rename and a real-time bath survive reload without resetting the wallet or photo', async ({
  page,
}) => {
  const s = fixture()
  s.world!.inventory.lunch = 2
  s.friends[0].stats.hunger = 10
  s.friends[0].photo =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1kAAAAASUVORK5CYII='
  await seed(page, s)
  await page.getByRole('button', { name: '모모 상태 확인' }).click()
  await page.getByRole('button', { name: /먹이 주기/ }).click()
  await page
    .getByTestId('item-lunch')
    .getByRole('button', { name: '모모에게 주기' })
    .click()
  expect((await data(page)).world.inventory.lunch).toBe(1)
  expect((await data(page)).friends[0].stats.hunger).toBeGreaterThan(44)
  await page.getByRole('button', { name: '메뉴 닫기' }).click()
  await life(page)
  await page.getByLabel('새 이름').fill('우리 모모')
  await page.getByRole('button', { name: '이름 저장' }).click()
  await expect(page.getByRole('button', { name: '이름 저장' })).toBeDisabled()
  await page.getByRole('button', { name: '목욕 시작' }).click()
  await expect(page.getByRole('dialog')).toContainText('끝나는 시간')
  await closeLife(page)
  await expect(page.getByTestId('room-momo')).toHaveClass(/life-bath/)
  const before = await page.getByTestId('room-momo').getAttribute('data-x')
  await page.clock.runFor(5000)
  expect(await page.getByTestId('room-momo').getAttribute('data-x')).toBe(
    before,
  )
  const end = (await data(page)).friends[0].life.bath.endsAt
  await page.clock.fastForward(end - (epoch + 6000) + 2000)
  await page.clock.runFor(1200)
  await expect(page.getByTestId('room-momo')).not.toHaveClass(/life-bath/)
  await page.reload()
  await expect(
    page.getByRole('button', { name: '우리 모모 상태 확인' }),
  ).toBeVisible()
  const saved = await data(page)
  expect(saved.world.coins).toBe(300)
  expect(saved.world.inventory.lunch).toBe(1)
  expect(saved.friends[0].photo).toBe(s.friends[0].photo)
  expect(saved.friends[0].life.bathCount).toBe(1)
  expect(saved.friends[0].stats.hygiene).toBeGreaterThan(99)
})
test('four adoptees join the original family, can be touched independently and persist after reload', async ({
  page,
  isMobile,
}) => {
  const s = fixture()
  s.world!.coins = 40000
  await seed(page, s)
  await life(page)
  await page.getByRole('button', { name: '입양', exact: true }).click()
  for (let i = 0; i < 4; i++)
    await page
      .getByRole('button', { name: '새 식구 맞이 · 10,000코인', exact: true })
      .first()
      .click()
  expect((await data(page)).friends).toHaveLength(10)
  expect((await data(page)).world.coins).toBe(0)
  await closeLife(page)
  await expect(page.locator('.room-friend')).toHaveCount(10)
  for (const id of ['lulu', 'toto', 'byeol', 'mungchi']) {
    const actor = page.getByTestId(`room-${id}`)
    // A visible adoption toast has an interactive close button; dismiss it before tapping the actor underneath.
    const toast=page.getByRole('button',{name:'알림 닫기',exact:true})
    if(await toast.isVisible())await toast.click()
    await actor.scrollIntoViewIfNeeded()
    const b = await actor.locator('.friend-figure').boundingBox()

    if (isMobile)
      await page.touchscreen.tap(b!.x + b!.width / 2, b!.y + b!.height / 2)
    else await actor.click()
    await page.clock.runFor(100)
    expect(
      (await data(page)).friends.find((f: { id: string }) => f.id === id).stats
        .affection,
      id,
    ).toBe(21)
    await page.clock.runFor(1800)
  }
  await page.reload()
  await expect(page.locator('.room-friend')).toHaveCount(10)
  expect(
    (await data(page)).friends.slice(0, 4).map((f: { id: string }) => f.id),
  ).toEqual(['momo', 'bibi', 'coco', 'dudu'])
})
test('room placement uses real pointer coordinates, conserves inventory and recovers furniture', async ({
  page,
}) => {
  const s = fixture()
  s.world!.inventory.plant = 1
  await seed(page, s)
  await menu(page, '인벤토리')
  await page
    .getByTestId('item-plant')
    .getByRole('button', { name: '방에 배치하기' })
    .click()
  const r = await page.locator('.placement-editor').boundingBox()
  await page.mouse.click(r!.x + r!.width * 0.53, r!.y + r!.height * 0.61)
  await page.getByRole('button', { name: '여기에 놓기' }).click()
  expect((await data(page)).world.expansion.placements).toHaveLength(1)
  expect((await data(page)).world.inventory.plant).toBe(0)
  await expect(
    page.getByRole('button', { name: '작은 화분 이동 또는 회수' }),
  ).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '가구 편집', exact: true }).click()
  await page.getByRole('button', { name: '작은 화분 이동 또는 회수' }).click()
  await page.getByRole('button', { name: '회수하기', exact: true }).click()
  const after = await data(page)
  expect(after.world.inventory.plant).toBe(1)
  expect(after.world.expansion.placements).toHaveLength(0)
})
test('three silent hamsters roam independently; recovery preserves the full discovery record', async ({
  page,
}, info) => {
  const s = fixture(),
    e = expansion(s)
  for (let i = 0; i < 4; i++)
    e.hamsters.push({
      id: `hamster-${i}`,
      foundAt: epoch,
      regionId: 'forest',
      deployed: i < 3,
      x: 530 + i * 45,
      y: 390,
    })
  await seed(page, s)
  await expect(page.locator('.room-hamster')).toHaveCount(3)
  await page.clock.runFor(12000)
  await expect(page.locator('.room-hamster .speech')).toHaveCount(0)
  await life(page)
  await page.getByRole('button', { name: '햄스터', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '방에 꺼내 주기' }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: '인벤토리에서 쉬게 하기' })
    .first()
    .click()
  await page.getByRole('button', { name: '방에 꺼내 주기' }).last().click()
  await closeLife(page)
  await expect(page.locator('.room-hamster')).toHaveCount(3)
  await page.reload()
  expect((await data(page)).world.expansion.hamsters).toHaveLength(4)
  await page.screenshot({
    path: `docs/screenshots/life-expansion-${info.project.name}.png`,
    fullPage: true,
  })
  expect(
    await page.evaluate(() => document.body.scrollWidth > innerWidth),
  ).toBe(false)
})
test('Korean night sleep closes eyes, blocks rewards and wakes without losing saved affection', async ({
  page,
}) => {
  const time = Date.parse('2026-10-15T16:00:00Z'),
    s = fixture()
  s.savedAt = time
  s.friends.forEach((f) => {
    f.stats.energy = 10
    growth(f, time)
  })
  await seed(page, s, time)
  await expect(page.getByTestId('room-momo')).toHaveClass(/life-sleep/)
  await expect(
    page.getByTestId('room-momo').locator('[data-expression="closed"]'),
  ).toHaveCount(1)
  const affection = (await data(page)).friends[0].stats.affection
  await page.getByTestId('room-momo').click()
  await page.clock.runFor(100)
  expect((await data(page)).friends[0].stats.affection).toBe(affection)
  await page.clock.fastForward(6 * 3600000)
  await page.clock.runFor(5200)
  await expect(page.getByTestId('room-momo')).not.toHaveClass(/life-sleep/)
  expect((await data(page)).friends[0].stats.energy).toBeGreaterThan(10)
})

test('medicine can be stored before illness and consumes once only on a sick friend', async ({
  page,
}) => {
  const s = fixture()
  s.friends[0].life = {
    bathDay: '2026-10-15',
    bathCount: 0,
    names: [],
    coldAt: epoch,
    lastSettledAt: epoch,
  }
  await seed(page, s)
  await menu(page, '상점')
  await page
    .getByTestId('item-medicine')
    .getByRole('button', { name: '구매하기' })
    .click()
  await page.getByRole('button',{name:'구매 확정',exact:true}).click()
  expect((await data(page)).world.coins).toBe(200)
  await page.getByRole('button', { name: '메뉴 닫기' }).click()
  await menu(page, '인벤토리')
  await page.getByLabel('메뉴 캐릭터 선택').selectOption('bibi')
  await expect(
    page
      .getByTestId('item-medicine')
      .getByRole('button', { name: '비비에게 주기' }),
  ).toBeDisabled()
  expect((await data(page)).world.inventory.medicine).toBe(1)
  await page.getByLabel('메뉴 캐릭터 선택').selectOption('momo')
  await page
    .getByTestId('item-medicine')
    .getByRole('button', { name: '모모에게 주기' })
    .click()
  const after = await data(page)
  expect(after.world.inventory.medicine).toBe(0)
  expect(after.friends[0].life.coldAt).toBeUndefined()
  expect(after.world.coins).toBe(200)
})
