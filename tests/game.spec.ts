import { test, expect } from '@playwright/test'
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-15T03:00:00Z') })
  await page.goto('/')
})
test('four friends walk across the room, talk, respond to care and persist after reload', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await expect(page.getByRole('heading', { name: '오늘도 함께라서, 포근한 하루.' })).toBeVisible()
  const actors = page.locator('.room-friend')
  await expect(actors).toHaveCount(4)
  const before = await actors.evaluateAll(nodes => nodes.map(n => [n.getAttribute('data-x'), n.getAttribute('data-y')]))
  await page.clock.runFor(10000)
  const after = await actors.evaluateAll(nodes => nodes.map(n => [n.getAttribute('data-x'), n.getAttribute('data-y')]))
  after.forEach((p, i) => expect(p).not.toEqual(before[i]))
  await page.getByRole('button', { name: '코코 상태 확인' }).click()
  await expect(page.getByRole('complementary', { name: '코코 돌보기' })).toBeVisible()
  const affectionBefore = await page.locator('.affection strong').textContent()
  await page.getByRole('button', { name: /쓰다듬기/ }).click()
  await expect(page.getByTestId('room-coco').locator('.speech')).toContainText('따뜻해')
  await expect(page.locator('.affection strong')).not.toHaveText(affectionBefore!)
  const affection = await page.locator('.affection strong').textContent()
  await page.reload()
  await page.getByRole('button', { name: '코코 상태 확인' }).click()
  await expect(page.locator('.affection strong')).toHaveText(affection!)
  await page.clock.runFor(51000)
  const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('pocket-friends-v1')!))
  expect(raw.friends.every((f: { nextSpeech: number }) => f.nextSpeech > raw.savedAt && f.nextSpeech <= raw.savedAt + 50000)).toBe(true)
  // Persisted bubble text proves the automatic scheduler executed, even after the bubble fades.
  expect(raw.friends.every((f: { bubble: string }) => /[가-힣]/.test(f.bubble))).toBe(true)
  expect(errors).toEqual([])
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => document.documentElement.clientWidth))
})
test('uploads a character photo, crops it, stores it locally and restores it', async ({ page }) => {
  // A small image is drawn by Chromium to exercise the actual image decoding/canvas path.
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 120
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#e3b4a4'; ctx.fillRect(0, 0, 120, 120)
    ctx.fillStyle = '#76583e'; ctx.fillRect(35, 40, 10, 10); ctx.fillRect(75, 40, 10, 10)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles({ name: 'my-friend.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') })
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel('확대', { exact: true }).fill('1.5')
  await page.getByLabel('좌우 위치').fill('10')
  await page.getByRole('button', { name: '이 모습으로 등록하기' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByTestId('room-momo').getByRole('img', { name: '모모의 등록 사진' })).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('room-momo').getByRole('img', { name: '모모의 등록 사진' })).toBeVisible()
  const image = await page.getByTestId('room-momo').getByRole('img', { name: '모모의 등록 사진' }).getAttribute('src')
  expect(image).toMatch(/^data:image\/webp;base64,/)
  expect(image!.length).toBeLessThan(400000)
  await page.locator('.friend-card').nth(1).getByRole('button', { name: /내 사진으로 등록/ }).click()
  await page.locator('input[type=file]').setInputFiles({ name: 'second.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') })
  await page.getByRole('button', { name: '이 모습으로 등록하기' }).click()
  await expect(page.getByTestId('room-bibi').getByRole('img')).toBeVisible()
  await expect(page.getByTestId('room-momo').getByRole('img', { name: '모모의 등록 사진' })).toBeVisible()
})
test('rejects invalid photos and explains storage failures without crashing', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') })
  await expect(page.getByRole('status')).toContainText('JPG, PNG, WebP')
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError') } })
  await page.getByRole('button', { name: /먹이 주기/ }).click()
  await expect(page.getByRole('alert')).toContainText('저장하지 못했어요')
  await expect(page.locator('.room-friend')).toHaveCount(4)
})
test('registers two different parts of the same wide photo without losing its edges', async ({ page }) => {
  const source = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 120
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ff2222'; ctx.fillRect(0, 0, 200, 120)
    ctx.fillStyle = '#2222ff'; ctx.fillRect(200, 0, 200, 120)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const file = { name: 'two-friends.png', mimeType: 'image/png', buffer: Buffer.from(source, 'base64') }
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByLabel('좌우 위치').fill('100')
  await page.getByRole('button', { name: '이 모습으로 등록하기' }).click()
  await page.locator('.friend-card').nth(1).getByRole('button', { name: /내 사진으로 등록/ }).click()
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByLabel('좌우 위치').fill('-100')
  await page.getByRole('button', { name: '이 모습으로 등록하기' }).click()
  const colors = await page.evaluate(async () => {
    const saved = JSON.parse(localStorage.getItem('pocket-friends-v1')!)
    return Promise.all(saved.friends.slice(0, 2).map(async (f: {photo: string}) => {
      const img = new Image(); img.src = f.photo; await img.decode()
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
      const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0)
      return Array.from(ctx.getImageData(128, 128, 1, 1).data)
    }))
  })
  expect(colors[0][0]).toBeGreaterThan(200); expect(colors[0][2]).toBeLessThan(80)
  expect(colors[1][2]).toBeGreaterThan(200); expect(colors[1][0]).toBeLessThan(80)
})
