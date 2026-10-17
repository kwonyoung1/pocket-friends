import { expect } from '@playwright/test'
import { test } from './fixture'
import type { Page } from '@playwright/test'
import { freshWorld } from '../src/cloud/engine'
async function enter(page: Page, secret: string) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '포켓프렌즈', exact: true })).toBeVisible()
  await page.getByLabel('접속 비밀번호').fill(secret)
  await page.getByRole('button', { name: '입장하기' }).click()
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
}
async function fresh(page: Page, secret: string) {
  await enter(page, secret)
  await page.getByRole('button', { name: '새 공유 월드로 시작하기' }).click()
  await page.getByRole('button', { name: '확인하고 공유 월드 만들기' }).click()
  await page.getByRole('button', { name: '이 클라우드 월드 사용하기' }).click()
  await expect(page.getByTestId('room-momo')).toBeVisible()
}
async function menu(page: Page, name: string) { await page.getByRole('navigation', { name: '성장과 모험 메뉴' }).getByRole('button', { name, exact: true }).click() }
test('password gate rejects incorrect entry; importing preserves the original browser data and photo', async ({ page, backend }, info) => {
  const original = freshWorld(Date.now()); original.world!.coins = 777
  original.friends[0].photo = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 20; c.getContext('2d')!.fillRect(0, 0, 20, 20); return c.toDataURL('image/png') })
  const raw = JSON.stringify(original)
  await page.addInitScript(raw => localStorage.setItem('pocket-friends-v1', raw), raw)
  await page.goto('/')
  await expect(page.getByTestId('room-momo')).toHaveCount(0)
  await expect(page.getByLabel('접속 비밀번호')).toBeVisible()
  await page.screenshot({ path: `docs/screenshots/cloud-login-${info.project.name}.png`, fullPage: true })
  await page.getByLabel('접속 비밀번호').fill('incorrect')
  await page.getByRole('button', { name: '입장하기' }).click()
  await expect(page.getByRole('alert')).toContainText('맞지 않아요')
  await page.getByLabel('접속 비밀번호').fill(backend.secret)
  await page.getByRole('button', { name: '입장하기' }).click()
  await expect(page.getByRole('button', { name: '이 기기 데이터를 기준으로 가져오기' })).toBeEnabled()
  await page.screenshot({ path: `docs/screenshots/cloud-import-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: '이 기기 데이터를 기준으로 가져오기' }).click()
  await page.getByRole('button', { name: '확인하고 공유 월드 만들기' }).click()
  await page.getByRole('button', { name: '이 클라우드 월드 사용하기' }).click()
  await expect(page.getByRole('button', { name: '보유 코인 777' })).toBeVisible()
  await expect(page.getByTestId('room-momo').getByRole('img')).toBeVisible()
  await page.getByRole('button',{name:'모모 상태 확인'}).click()
  await page.getByRole('complementary').getByRole('button', { name: /쓰다듬기/ }).click()
  await expect.poll(() => backend.row().revision).toBeGreaterThan(1)
  expect(await page.evaluate(() => localStorage.getItem('pocket-friends-v1'))).toBe(raw)
  await page.reload()
  await page.getByRole('button', { name: '이 클라우드 월드 사용하기' }).click()
  await expect(page.getByTestId('room-momo').getByRole('img')).toBeVisible()
  await page.getByRole('button', { name: '로그아웃' }).click()
  await expect(page.getByLabel('접속 비밀번호')).toBeVisible()
  await expect(page.getByTestId('room-momo')).toHaveCount(0)
})
test('two devices share purchases; a committed response lost on the network retries without buying twice', async ({ page, backend, browser }) => {
  await fresh(page, backend.secret)
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await backend.attach(phone)
  const second = await phone.newPage(); await enter(second, backend.secret)
  await second.getByRole('button', { name: '이 클라우드 월드 사용하기' }).click()
  await menu(page, '상점'); backend.loseNextBuyResponse()
  await page.getByTestId('item-snack').getByRole('button', { name: '구매하기' }).click();await page.getByRole('button',{name:'구매 확정',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('동기화에 실패')
  expect(backend.row().data!.world!.coins).toBe(285)
  await page.getByRole('button', { name: '같은 작업 다시 시도' }).click()
  await expect(page.getByRole('button', { name: '보유 코인 285' })).toBeVisible()
  expect(backend.row().data!.world!.inventory.snack).toBe(1)
  await second.getByRole('button', { name: '새로 동기화', exact: true }).click()
  await expect(second.getByRole('button', { name: '보유 코인 285' })).toBeVisible()
  await menu(second, '인벤토리'); await expect(second.getByTestId('item-snack')).toContainText('보유 1개')
  await phone.close()
})
test('reload recovers an unacknowledged purchase through the gate without spending twice', async ({ page, backend }) => {
  await fresh(page, backend.secret)
  await menu(page, '상점'); backend.loseNextBuyResponse()
  await page.getByTestId('item-snack').getByRole('button', { name: '구매하기' }).click();await page.getByRole('button',{name:'구매 확정',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('동기화에 실패')
  expect(backend.row().data!.world!.coins).toBe(285)
  const pending = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pocket-friends-cloud-pending')!))
  expect(pending).toHaveLength(1)
  await page.reload()
  await expect(page.getByRole('button', { name: '이 클라우드 월드 사용하기' })).toBeDisabled()
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pocket-friends-cloud-pending')!))).toEqual(pending)
  await page.getByRole('button', { name: '앞선 작업 결과 다시 확인' }).click()
  await page.getByRole('button', { name: '이 클라우드 월드 사용하기' }).click()
  await expect(page.getByRole('button', { name: '보유 코인 285' })).toBeVisible()
  expect(backend.row().data!.world!.inventory.snack).toBe(1)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('pocket-friends-cloud-pending')!))).toEqual([])
  await page.reload()
  await page.getByRole('button', { name: '이 클라우드 월드 사용하기' }).click()
  await expect(page.getByRole('button', { name: '보유 코인 285' })).toBeVisible()
  expect(backend.row().data!.world!.inventory.snack).toBe(1)
})
test('two devices share six-hour pet limits and changing the device clock cannot reset them', async ({ page, backend, browser }) => {
  await fresh(page, backend.secret)
  await page.getByRole('button',{name:'모모 상태 확인'}).click()
  await expect(page.getByTestId('pet-reward-status')).toHaveText('쓰다듬기 보상 가능!')
  await page.getByRole('complementary').getByRole('button', {name:/쓰다듬기/}).click()
  await expect.poll(()=>backend.row().data!.friends[0].stats.affection).toBe(21)
  await expect(page.getByTestId('pet-reward-status')).toContainText('6시간 0분')
  const stamp = backend.row().data!.friends[0].lastPetRewardAt
  const phone = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  await backend.attach(phone)
  try {
    const second=await phone.newPage(); await enter(second,backend.secret)
    await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
    await second.getByRole('button',{name:'모모 상태 확인'}).click()
    await expect(second.getByTestId('pet-reward-status')).toContainText('6시간 0분')
    await second.evaluate(()=>{const original=Date.now;Date.now=()=>original()+86400000})
    await second.getByRole('complementary').getByRole('button',{name:/쓰다듬기/}).click()
    await expect(second.locator('.cloud-status')).not.toContainText('처리 중')
    expect(backend.row().data!.friends[0].stats.affection).toBe(21)
    expect(backend.row().data!.friends[0].growth!.xp).toBe(1)
    expect(backend.row().data!.friends[0].lastPetRewardAt).toBe(stamp)
    await second.reload();await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
    await second.getByRole('button',{name:'모모 상태 확인'}).click()
    await expect(second.getByTestId('pet-reward-status')).toContainText('6시간 0분')
  } finally { await phone.close() }
})
test('short tap, special hold and dragging keep server rewards separate from local animation', async ({ page, backend }) => {
  await fresh(page, backend.secret)
  const actor = page.getByTestId('room-momo')
  // Stop local movement only while choosing the starting point; pointer capture owns it afterward.
  await actor.scrollIntoViewIfNeeded()
  const p = await actor.locator('.friend-figure').boundingBox(); expect(p).not.toBeNull()
  await page.mouse.move(p!.x + p!.width / 2, p!.y + p!.height / 2); await page.mouse.down(); await page.mouse.up()
  await expect.poll(() => backend.row().data!.friends[0].stats.affection).toBe(21)
  await expect(page.locator('.cloud-status')).not.toContainText('처리 중')
  const bibi = page.getByTestId('room-bibi'); await bibi.scrollIntoViewIfNeeded()
  const q = await bibi.locator('.friend-figure').boundingBox()
  await page.mouse.move(q!.x + q!.width / 2, q!.y + q!.height / 2); await page.mouse.down()
  await expect(bibi).toHaveAttribute('data-phase', 'bonding', { timeout: 6000 })
  await expect.poll(() => backend.row().data!.friends[1].stats.affection).toBe(23)
  await page.mouse.up(); await expect(page.locator('.cloud-status')).not.toContainText('처리 중')
  const coco = page.getByTestId('room-coco'); await coco.scrollIntoViewIfNeeded()
  const r = await coco.locator('.friend-figure').boundingBox()
  await page.mouse.move(r!.x + r!.width / 2, r!.y + r!.height / 2); await page.mouse.down()
  await page.mouse.move(r!.x + r!.width / 2 + 35, r!.y + r!.height / 2 + 15, { steps: 4 })
  await page.mouse.up()
  await expect.poll(() => backend.row().holds.coco).toBeUndefined()
  expect(backend.row().data!.friends[2].stats.affection).toBe(20)
  expect(await page.evaluate(() => document.body.scrollWidth > innerWidth)).toBe(false)
})

test('storage failure blocks a new command before spending any cloud coins', async ({ page, backend }) => {
  await fresh(page, backend.secret)
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key: string, value: string) { if (key === 'pocket-friends-cloud-pending') throw Error('full'); original.call(this, key, value) }
  })
  await menu(page, '상점')
  await page.getByTestId('item-snack').getByRole('button', { name: '구매하기' }).click();await page.getByRole('button',{name:'구매 확정',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('요청을 보내지 않았어요')
  expect(backend.row().data!.world!.coins).toBe(300)
  expect(backend.row().data!.world!.inventory.snack).toBeUndefined()
})

test('a chosen backup can be the initial cloud source without replacing this device original', async ({ page, backend }) => {
  const local = freshWorld(Date.now()), source = freshWorld(Date.now())
  local.world!.coins = 321; source.world!.coins = 654
  const raw = JSON.stringify(local)
  await page.addInitScript(raw => localStorage.setItem('pocket-friends-v1', raw), raw)
  await enter(page, backend.secret)
  const input = page.getByLabel('클라우드 이전 원본 백업 선택')
  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') })
  await expect(page.getByRole('alert')).toContainText('백업을 읽지 못했어요')
  await input.setInputFiles({ name: 'chosen-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(source)) })
  await expect(page.getByText('선택한 백업 파일', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '이 기기 데이터를 기준으로 가져오기' }).click()
  await page.getByRole('button', { name: '확인하고 공유 월드 만들기' }).click()
  await page.getByRole('button', { name: '이 클라우드 월드 사용하기' }).click()
  await expect(page.getByRole('button', { name: '보유 코인 654' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('pocket-friends-v1'))).toBe(raw)
})

test('two native touch holds remain independent while cloud commands are serialized', async ({ page, backend }) => {
  await fresh(page, backend.secret)
  await page.locator('.room').scrollIntoViewIfNeeded()
  const points = []
  for (const id of ['momo', 'bibi']) {
    const r = await page.getByTestId(`room-${id}`).locator('.friend-figure').boundingBox()
    points.push({ x: r!.x + r!.width / 2, y: r!.y + r!.height / 2 })
  }
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 4 })
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }, { ...points[1], id: 2 }] })
  await expect(page.locator('.room-friend[data-phase=bonding]')).toHaveCount(2, { timeout: 8000 })
  await expect.poll(() => backend.row().data!.friends.slice(0, 2).map(f => f.stats.affection)).toEqual([23, 23])
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await expect(page.locator('.room-friend[data-phase=idle]')).toHaveCount(6)
  await session.detach()
})

test('two devices share new names, adoptees and furniture without modifying the imported original',async({page,backend,browser})=>{
 const original=freshWorld(Date.parse('2026-10-15T03:00:00Z'));original.world!.coins=20000;original.world!.inventory.plant=1
 const raw=JSON.stringify(original);await page.addInitScript(raw=>localStorage.setItem('pocket-friends-v1',raw),raw)
 await enter(page,backend.secret);await page.getByRole('button',{name:'이 기기 데이터를 기준으로 가져오기'}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기'}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
 const phone=await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true});await backend.attach(phone);const second=await phone.newPage();await enter(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
 await page.getByRole('button',{name:'생활·입양',exact:true}).click();await page.getByLabel('새 이름').fill('우리 친구');await page.getByRole('button',{name:'이름 저장'}).click();await expect.poll(()=>backend.row().data!.friends[0].name).toBe('우리 친구')
 await page.getByRole('button',{name:'입양',exact:true}).click();await page.getByRole('button',{name:'새 식구 맞이 · 10,000코인'}).first().click();await expect.poll(()=>backend.row().data!.friends.length).toBe(7);await page.getByRole('button',{name:'생활 메뉴 닫기'}).click()
 await second.getByRole('button',{name:'새로 동기화',exact:true}).click();await expect(second.getByTestId('room-lulu')).toBeVisible();await expect(second.getByRole('button',{name:'우리 친구 상태 확인'})).toBeVisible();await expect(second.getByRole('button',{name:'보유 코인 10000'})).toBeVisible()
 const lulu=page.getByTestId('room-lulu');await lulu.scrollIntoViewIfNeeded();const box=await lulu.locator('.friend-figure').boundingBox()
 await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();await page.mouse.move(box!.x+box!.width/2+35,box!.y+box!.height/2+15,{steps:4});await page.mouse.up()
 await expect.poll(()=>backend.row().holds.lulu).toBeUndefined()
 await expect.poll(()=>backend.row().data!.friends.find(f=>f.id==='lulu')!.x).not.toBe(530)
 await second.getByRole('button',{name:'새로 동기화',exact:true}).click()
 await expect.poll(async()=>Math.abs(Number(await second.getByTestId('room-lulu').getAttribute('data-x'))-backend.row().data!.friends.find(f=>f.id==='lulu')!.x)).toBeLessThan(12)
 await menu(second,'인벤토리');await second.getByTestId('item-plant').getByRole('button',{name:'방에 배치하기'}).click();await second.getByRole('button',{name:'여기에 놓기'}).click()
 await expect.poll(()=>backend.row().data!.world!.expansion!.placements.length).toBe(1)
 await page.getByRole('button',{name:'새로 동기화',exact:true}).click();await expect(page.getByRole('button',{name:'작은 화분 이동 또는 회수'})).toBeVisible()
 expect(await page.evaluate(()=>localStorage.getItem('pocket-friends-v1'))).toBe(raw);expect(backend.row().data!.world!.inventory.plant).toBe(0)
 await page.reload();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await expect(page.getByTestId('room-lulu')).toBeVisible();await phone.close()
})

test('free human gifts appear on both devices once and keep their names, individual affection and shared pictures',async({page,backend,browser})=>{
 await fresh(page,backend.secret)
 for(const kind of ['boy','girl'])await expect(page.getByTestId(`room-special-${kind}`).locator('.human-art')).toBeVisible()
 await expect.poll(()=>backend.row().data!.friends.length).toBe(6);expect(backend.row().data!.world!.coins).toBe(300)
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone);const second=await phone.newPage();await enter(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
 for(const kind of ['boy','girl']){const first=page.getByTestId(`room-special-${kind}`).locator('img'),other=second.getByTestId(`room-special-${kind}`).locator('img');await expect(other).toBeVisible();expect(await other.getAttribute('src')).toBe(await first.getAttribute('src'))}
 await page.getByRole('button',{name:'여자아이 상태 확인'}).click();await page.getByRole('button',{name:'생활·입양',exact:true}).click();await page.getByLabel('새 이름').fill('우리 소녀');await page.getByRole('button',{name:'이름 저장'}).click();await expect.poll(()=>backend.row().data!.friends.find(f=>f.id==='special-girl')!.name).toBe('우리 소녀');await page.getByRole('button',{name:'생활 메뉴 닫기'}).click()
 await second.getByRole('button',{name:'새로 동기화',exact:true}).click();await expect(second.getByRole('button',{name:'우리 소녀 상태 확인'})).toBeVisible()
 await second.getByTestId('room-special-boy').tap();await expect.poll(()=>backend.row().data!.friends.find(f=>f.id==='special-boy')!.stats.affection).toBe(21)
 // A server commit precedes its response. Reload only after the browser acknowledges it;
 // interrupted responses intentionally require replaying the saved operation at the gate.
 await expect.poll(()=>second.evaluate(()=>JSON.parse(sessionStorage.getItem('pocket-friends-cloud-pending')??'[]'))).toEqual([])
 await expect(second.locator('.cloud-status')).not.toContainText('처리 중')
 expect(backend.row().data!.friends.find(f=>f.id==='special-girl')!.stats.affection).toBe(20);expect(backend.row().data!.world!.coins).toBe(300)
 await second.reload();await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await expect(second.getByTestId('room-special-girl').locator('.human-art')).toBeVisible()
 expect(backend.row().data!.friends.filter(f=>f.id==='special-boy')).toHaveLength(1);expect(backend.row().data!.friends.filter(f=>f.id==='special-girl')).toHaveLength(1);await phone.close()
})

test('word expedition shares all thirty graded questions across devices and pays the result once',async({page,backend,browser})=>{
 test.setTimeout(120000)
 await fresh(page,backend.secret);await menu(page,'영단어 탐험');await page.getByRole('button',{name:'영단어 탐험 시작',exact:true}).click()
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone)
 try{
  const second=await phone.newPage();await enter(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
  const bank=await import('../src/words/bank')
  let active=page
  for(let i=0;i<30;i++){
   if(i===10){await expect(page.locator('.word-stage')).toContainText('11 / 30문제');await second.getByRole('button',{name:'새로 동기화',exact:true}).click();await menu(second,'영단어 탐험');active=second}
   await expect(active.locator('.word-stage')).toContainText(`${i+1} / 30문제`)
   const id=await active.getByTestId('word-play').getAttribute('data-word-id')
   await active.getByLabel('한국어 뜻',{exact:true}).fill(bank.wordById[id!].acceptedAnswers[0]);await active.getByRole('button',{name:'정답 확인',exact:true}).click()
   if(i===15){await expect(active.locator('.word-stage')).toContainText('17 / 30문제');await expect(active.locator('.cloud-status')).not.toContainText('처리 중');await active.reload();await active.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await menu(active,'영단어 탐험')}
  }
  await expect(active.getByTestId('word-reward')).toHaveText('300코인')
  expect(backend.row().data!.world!.coins).toBe(600)
  expect(backend.row().data!.world!.ledger.filter(e=>e.reason==='영단어 탐험 완료')).toHaveLength(1)
  await expect(active.locator('.cloud-status')).not.toContainText('처리 중');await active.reload();await active.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await menu(active,'영단어 탐험')
  await expect(active.getByTestId('word-reward')).toHaveText('300코인');await expect(active.getByRole('button',{name:'영단어 탐험 시작',exact:true})).toBeDisabled()
  expect(backend.row().data!.world!.coins).toBe(600)
  expect(await active.evaluate(()=>document.body.scrollWidth>innerWidth)).toBe(false)
 }finally{await phone.close()}
})

test('new favorite food and four-hour manual rest synchronize without changing the imported original',async({page,backend,browser})=>{
 const source=freshWorld(Date.parse('2026-10-15T03:00:00Z'));source.world!.coins=1000;source.friends[0].stats.hunger=0;source.friends[0].stats.happiness=0;source.friends[0].stats.energy=20
 const raw=JSON.stringify(source);await page.addInitScript(raw=>localStorage.setItem('pocket-friends-v1',raw),raw)
 await enter(page,backend.secret);await page.getByRole('button',{name:'이 기기 데이터를 기준으로 가져오기'}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기'}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
 await menu(page,'상점');await page.getByTestId('item-strawberry-milk').getByRole('button',{name:'구매하기'}).click();await page.getByRole('button',{name:'구매 확정',exact:true}).click();await expect(page.getByRole('button',{name:'보유 코인 940'})).toBeVisible();await page.getByRole('button',{name:'메뉴 닫기'}).click()
 await menu(page,'인벤토리');await page.getByTestId('item-strawberry-milk').getByRole('button',{name:'모모에게 주기'}).click();await expect.poll(()=>backend.row().data!.world!.inventory['strawberry-milk']).toBe(0);await page.getByRole('button',{name:'메뉴 닫기'}).click()
 await page.getByRole('button',{name:'모모 상태 확인'}).click();await page.getByRole('complementary').getByRole('button',{name:/쉬게 하기/}).click();await expect(page.getByTestId('rest-status')).toContainText('4시간 0분')
 await expect(page.getByTestId('room-momo')).toHaveClass(/furniture-relax/)
 expect(backend.row().data!.friends[0].stats.hunger).toBeCloseTo(15,0);expect(backend.row().data!.friends[0].stats.happiness).toBeCloseTo(23,0)
 const stamp=backend.row().data!.friends[0].lastRestRewardAt
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone)
 try{const second=await phone.newPage();await enter(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await second.getByRole('button',{name:'모모 상태 확인'}).click();await expect(second.getByTestId('rest-status')).toContainText('4시간 0분');await second.getByRole('complementary').getByRole('button',{name:/쉬게 하기/}).click();await expect(second.locator('.cloud-status')).not.toContainText('처리 중');expect(backend.row().data!.friends[0].lastRestRewardAt).toBe(stamp);expect(await page.evaluate(()=>localStorage.getItem('pocket-friends-v1'))).toBe(raw)}finally{await phone.close()}
})

test('bulk purchases and sales synchronize and a failed notebook deletion stays visible until its single retry commits',async({page,backend,browser})=>{
 test.setTimeout(90000)
 const source=freshWorld(Date.parse('2026-10-15T03:00:00Z'));source.world!.coins=2000;source.world!.inventory={leaf:15,'treasure-diamond':1}
 source.world!.words={version:1,nextStartAt:0,used:{},previous:[],mistakes:{'word-issue':{word:'issue',pos:'명사·동사',meanings:['문제','쟁점','발행하다','발행'],example:'We discussed the issue.',count:3,lastAt:source.savedAt}}}
 const raw=JSON.stringify(source);await page.addInitScript(raw=>localStorage.setItem('pocket-friends-v1',raw),raw)
 await enter(page,backend.secret);await page.getByRole('button',{name:'이 기기 데이터를 기준으로 가져오기'}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기'}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
 await menu(page,'상점');await page.getByTestId('item-snack').getByRole('button',{name:'구매하기'}).click();await page.getByLabel('구매 수량',{exact:true}).fill('10');await page.getByRole('button',{name:'구매 확정',exact:true}).click();await expect(page.getByRole('button',{name:'보유 코인 1850'})).toBeVisible();await page.getByRole('button',{name:'메뉴 닫기'}).click()
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone)
 try{
  const second=await phone.newPage();await enter(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await menu(second,'인벤토리');await expect(second.getByTestId('item-snack')).toContainText('보유 10개')
  await second.getByRole('button',{name:'일괄 판매',exact:true}).click();const list=second.locator('.bulk-sale-list');await list.getByRole('checkbox',{name:/행운의 나뭇잎/}).check();await second.getByLabel('행운의 나뭇잎 판매 수량',{exact:true}).fill('10');await list.getByRole('checkbox',{name:/다이아몬드/}).check();await second.getByRole('button',{name:'선택한 아이템 판매',exact:true}).click();await second.getByRole('button',{name:'확인하고 일괄 판매',exact:true}).click();await expect(second.getByRole('button',{name:'보유 코인 4950'})).toBeVisible();expect(backend.row().data!.world!.inventory.leaf).toBe(5)
  await menu(page,'영단어 탐험');await page.getByRole('button',{name:'오답 노트 (1)',exact:true}).click()
  await page.route('**/functions/v1/game',async route=>{if(route.request().postDataJSON()?.command?.type==='word-delete')await route.abort('failed');else await route.fallback()})
  await page.getByRole('button',{name:'issue 삭제',exact:true}).click();await page.getByRole('button',{name:'확인하고 삭제',exact:true}).click();await expect(page.getByRole('alert')).toContainText('동기화에 실패');await expect(page.locator('.wrong-notes article')).toHaveCount(1);expect(backend.row().data!.world!.words!.mistakes['word-issue']).toBeTruthy()
  await page.unroute('**/functions/v1/game');await page.getByRole('button',{name:'같은 작업 다시 시도',exact:true}).click();await expect.poll(()=>Object.keys(backend.row().data!.world!.words!.mistakes).length).toBe(0)
  await second.getByRole('button',{name:'메뉴 닫기'}).click();await second.getByRole('button',{name:'새로 동기화',exact:true}).click();await menu(second,'영단어 탐험');await second.getByRole('button',{name:'오답 노트 (0)',exact:true}).click();await expect(second.locator('.wrong-notes article')).toHaveCount(0)
  expect(backend.row().data!.world!.coins).toBe(4950);expect(backend.row().data!.world!.trades).toHaveLength(2);expect(backend.row().data!.world!.words!.removals).toHaveLength(1);expect(await page.evaluate(()=>localStorage.getItem('pocket-friends-v1'))).toBe(raw)
 }finally{await phone.close()}
})

test('Sichuan exploration board and hints sync between devices, competition stays independent, old browser data stays intact',async({page,backend,browser})=>{
 const original=JSON.stringify(freshWorld(Date.now()));await page.addInitScript(raw=>localStorage.setItem('pocket-friends-v1',raw),original)
 await fresh(page,backend.secret);await menu(page,'사천성');await page.getByRole('button',{name:'사천성 탐험 시작'}).click()
 await expect(page.locator('.sichuan-board button')).toHaveCount(18);await expect(page.getByRole('button',{name:'힌트 (3/3)'})).toBeEnabled()
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone);const second=await phone.newPage();await enter(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await menu(second,'사천성')
 await expect(second.locator('.sichuan-board button')).toHaveCount(18)
 expect(await second.locator('.sichuan-board button').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-tile')))).toEqual(backend.row().data!.world!.sichuan!.adventure!.board.tiles.map(String))
 await second.getByRole('button',{name:'힌트 (3/3)'}).click();await expect(second.locator('.sichuan-board .hint')).toHaveCount(2)
 await page.getByRole('button',{name:'사천성 닫기'}).click();await page.getByRole('button',{name:'새로 동기화',exact:true}).click();await menu(page,'사천성');await expect(page.locator('.sichuan-board .hint')).toHaveCount(2)
 await second.getByRole('button',{name:'경쟁모드',exact:true}).click();await second.getByRole('button',{name:'경쟁 시작',exact:true}).click();await expect(second.locator('.sichuan-board button')).toHaveCount(64)
 await page.getByRole('button',{name:'그만하기',exact:true}).click();await page.getByRole('button',{name:'종료 확정'}).click();await expect(page.getByTestId('sichuan-reward')).toContainText('0코인');await expect(page.getByRole('button',{name:'사천성 탐험 시작'})).toBeDisabled()
 await second.getByRole('button',{name:'새 보드로 다시 시작'}).click();await second.getByRole('button',{name:'종료 확정'}).click();await expect(second.locator('.sichuan-board button')).toHaveCount(64)
 await page.reload();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await menu(page,'사천성');await expect(page.getByRole('button',{name:'사천성 탐험 시작'})).toBeDisabled()
 expect(await page.evaluate(()=>localStorage.getItem('pocket-friends-v1'))).toBe(original);expect(backend.row().data!.world!.coins).toBe(300);await phone.close()
})

test('Sichuan competition verifies every move on the server and shares one frozen TOP 5 record',async({page,backend})=>{
 test.setTimeout(90000)
 const {pair}=await import('../src/sichuan/board')
 await fresh(page,backend.secret);await menu(page,'사천성');await page.getByRole('button',{name:'경쟁모드',exact:true}).click();await page.getByLabel('사천성 닉네임').fill('정원친구');await page.getByRole('button',{name:'경쟁 시작',exact:true}).click()
 for(let i=0;i<32;i++){
  const r=Object.values(backend.row().data!.world!.sichuan!.competitions)[0],found=pair(r.board)!
  const a=page.locator(`.sichuan-board button[data-index="${found[0]}"]`),b=page.locator(`.sichuan-board button[data-index="${found[1]}"]`)
  await expect(a).toBeEnabled();await a.click();await b.click()
  await expect.poll(()=>Object.values(backend.row().data!.world!.sichuan!.competitions)[0].board.tiles.filter(Boolean).length).toBe(64-(i+1)*2)
 }
 await expect(page.getByText('🎉 경쟁모드 완료!')).toBeVisible();const records=backend.row().data!.world!.sichuan!.bests
 expect(records).toHaveLength(1);expect(records[0].nickname).toBe('정원친구');expect(records[0].elapsedMs).toBeGreaterThan(0);expect(backend.row().data!.world!.coins).toBe(300)
 await page.reload();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await menu(page,'사천성');await expect(page.getByRole('region',{name:'사천성 TOP 5'})).toContainText('정원친구');expect(backend.row().data!.world!.sichuan!.bests).toEqual(records)
})

test('fourth bath and its cooldown sync across authenticated devices while preserving the original photo and wallet',async({page,backend,browser})=>{
 const s=freshWorld(Date.parse('2026-10-15T03:00:00Z')),{life}=await import('../src/expansion/model');life(s.friends[0],s.savedAt).bathCount=3;s.world!.coins=777
 s.friends[0].photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;return c.toDataURL('image/png')})
 const raw=JSON.stringify(s);await page.addInitScript(raw=>localStorage.setItem('pocket-friends-v1',raw),raw)
 await enter(page,backend.secret);await page.getByRole('button',{name:'이 기기 데이터를 기준으로 가져오기'}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기'}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
 await page.getByRole('button',{name:'생활·입양'}).click();const panel=page.getByRole('dialog',{name:'생활과 새 식구'});await panel.getByRole('button',{name:'씻기 (3/4)',exact:true}).click();await expect(panel.getByRole('button',{name:'씻기 (4/4)',exact:true})).toBeDisabled()
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone);const second=await phone.newPage();await enter(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await second.getByRole('button',{name:'생활·입양'}).click()
 await expect(second.getByRole('dialog').getByRole('button',{name:'씻기 (4/4)',exact:true})).toBeDisabled();await expect(second.getByRole('dialog')).toContainText('오늘은 충분히 씻었어요! 내일 다시 씻겨 주세요 🛁')
 expect(backend.row().data!.friends[0].life!.bathCount).toBe(4);expect(backend.row().data!.friends[0].photo).toBe(s.friends[0].photo);expect(backend.row().data!.world!.coins).toBe(777)
 expect(await page.evaluate(()=>localStorage.getItem('pocket-friends-v1'))).toBe(raw);await phone.close()
})

test('one manual competition shuffle persists through reload and a verified match has a real transient path',async({page,backend})=>{
 await fresh(page,backend.secret);await menu(page,'사천성');await page.getByRole('button',{name:'경쟁모드',exact:true}).click();await page.getByRole('button',{name:'경쟁 시작',exact:true}).click();await page.getByRole('button',{name:'섞기 (1/1)'}).click()
 await expect(page.getByRole('button',{name:'섞기 (0/1)'})).toBeDisabled();await page.reload();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await menu(page,'사천성');await page.getByRole('button',{name:'경쟁모드',exact:true}).click();await expect(page.getByRole('button',{name:'섞기 (0/1)'})).toBeDisabled()
 const {pair,path}=await import('../src/sichuan/board'),r=Object.values(backend.row().data!.world!.sichuan!.competitions)[0],found=pair(r.board)!
 await page.locator(`.sichuan-board button[data-index="${found[0]}"]`).click();await page.locator(`.sichuan-board button[data-index="${found[1]}"]`).click()
 await expect(page.getByTestId('match-overlay')).toBeVisible();expect(JSON.parse((await page.getByTestId('match-overlay').getAttribute('data-grid-path'))!)).toEqual(path(r.board,...found))
 await expect.poll(()=>Object.values(backend.row().data!.world!.sichuan!.competitions)[0].board.tiles.filter(Boolean).length).toBe(62)
 await expect(page.getByTestId('match-overlay')).toHaveCount(0);expect(backend.row().data!.world!.coins).toBe(300);expect(backend.row().data!.world!.sichuan!.bests).toEqual([])
})

test('server-synced clock and daily ranking ignore the browser clock while preserving yesterday records',async({page,backend,browser})=>{
 await fresh(page,backend.secret)
 backend.setTime(Date.parse('2026-10-15T14:59:30Z'));backend.seedRanking()
 await page.getByRole('button',{name:'새로 동기화',exact:true}).click();await menu(page,'사천성');await expect(page.getByRole('region',{name:'사천성 TOP 5'})).toContainText('오늘친구')
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone)
 try{
  const second=await phone.newPage();await enter(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
  await second.evaluate(()=>{Date.now=()=>Date.parse('2038-01-01T00:00:00Z')})
  backend.setTime(Date.parse('2026-10-15T15:00:05Z'));await second.getByRole('button',{name:'새로 동기화',exact:true}).click()
  await expect(second.getByRole('timer',{name:'한국 시간 시계'})).toContainText('2026년 10월 16일 금요일')
  await menu(second,'사천성');await expect(second.getByTestId('ranking-day')).toContainText('2026-10-16');await expect(second.getByRole('region',{name:'사천성 TOP 5'})).not.toContainText('오늘친구')
  // A read is deliberately non-mutating. A real game command persists the additive migration.
  await second.getByRole('button',{name:'경쟁모드',exact:true}).click();await second.getByRole('button',{name:'경쟁 시작',exact:true}).click();await expect(second.getByTestId('sichuan-board')).toBeVisible()
  await expect.poll(()=>backend.row().data!.world!.sichuan!.dailyBests?.length).toBe(1)
  expect(backend.row().data!.world!.sichuan!.bests[0].nickname).toBe('오늘친구')
  expect(new Date(Object.values(backend.row().data!.world!.sichuan!.competitions)[0].startedAt).getUTCFullYear()).toBe(2026)
 }finally{await phone.close()}
})
