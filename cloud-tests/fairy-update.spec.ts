import {test} from './fixture'
import {expect} from '@playwright/test'
import type {Page} from '@playwright/test'
test.skip(({isMobile})=>!isMobile,'Touch-first portrait coverage')
async function login(page:Page,secret:string){await page.goto('/');await page.getByLabel('접속 비밀번호').fill(secret);await page.getByRole('button',{name:'입장하기',exact:true}).click();await page.getByRole('button',{name:'새 공유 월드로 시작하기',exact:true}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기',exact:true}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기',exact:true}).click();await page.getByRole('button',{name:'별빛 아레나',exact:true}).tap()}
async function reopen(page:Page){await page.reload();await page.getByRole('button',{name:'이 클라우드 월드 사용하기',exact:true}).click();await page.getByRole('button',{name:'별빛 아레나',exact:true}).tap()}
async function choose(page:Page){while(await page.locator('.hero-select[aria-pressed=true]').count())await page.locator('.hero-select[aria-pressed=true]').first().tap();for(const name of ['비비','찬미','모모'])await page.getByRole('button',{name:`${name} 편성`,exact:true}).tap()}
test('ordered last official party survives leaving, reload, relogin, another phone and event entry without extra debits',async({page,backend,browser})=>{
 test.setTimeout(150000);await login(page,backend.secret)
 await expect.poll(()=>backend.row().data?.world?.arena?.season).toBe(2)
 await choose(page);const ids=['bibi','special-girl','momo'];const before=backend.row().data!
 await page.getByRole('button',{name:'달빛 숲으로 출발',exact:true}).tap()
 await expect.poll(()=>Object.values(backend.row().data!.world!.arena!.accounts!)[0].lastParty?.ids).toEqual(ids)
 await page.getByRole('button',{name:'별빛 아레나 닫기',exact:true}).tap();await page.getByRole('button',{name:'별빛 아레나',exact:true}).tap()
 await expect(page.getByLabel('출전 파티 기억')).toContainText('1. 비비 · 2. 찬미 · 3. 모모')
 await reopen(page);await expect(page.getByLabel('출전 파티 기억')).toContainText('마지막 출전 파티')
 await page.getByRole('button',{name:'진행 중 전투 포기',exact:true}).tap()
 await expect.poll(()=>Object.values(backend.row().data!.world!.arena!.tickets)[0].status).toBe('abandoned')
 await page.getByRole('button',{name:'별빛 아레나 닫기',exact:true}).tap();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByLabel('접속 비밀번호').fill(backend.secret);await page.getByRole('button',{name:'입장하기',exact:true}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기',exact:true}).click();await page.getByRole('button',{name:'별빛 아레나',exact:true}).tap()
 await expect(page.getByLabel('출전 파티 기억')).toContainText('1. 비비 · 2. 찬미 · 3. 모모')
 const peer=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
 try{await backend.attach(peer);const other=await peer.newPage();await other.goto('/');await other.getByLabel('접속 비밀번호').fill(backend.secret);await other.getByRole('button',{name:'입장하기',exact:true}).click();await other.getByRole('button',{name:'이 클라우드 월드 사용하기',exact:true}).click();await other.getByRole('button',{name:'별빛 아레나',exact:true}).tap();await expect(other.getByLabel('출전 파티 기억')).toContainText('1. 비비 · 2. 찬미 · 3. 모모')}finally{await peer.close()}
 backend.setTime(Date.parse('2026-12-15T03:00:00Z'));await page.getByRole('button',{name:'별빛 아레나 닫기',exact:true}).tap();await page.getByRole('button',{name:'새로 동기화',exact:true}).click();await page.getByRole('button',{name:'별빛 아레나',exact:true}).tap();await page.getByRole('button',{name:'크리스마스 스테이지 보기',exact:true}).tap();await page.getByRole('button',{name:'겨울밤의 선물 도전',exact:true}).tap()
 await expect.poll(()=>Object.values(backend.row().data!.world!.arena!.tickets)[0].stageId).toBe('xmas-2026')
 const account=Object.values(backend.row().data!.world!.arena!.accounts!)[0]
 expect(account.lastParty?.ids).toEqual(ids);expect(account.energy.value).toBe(90)
 expect(backend.row().data!.friends.map(f=>[f.id,f.name,f.growth?.level,f.growth?.xp])).toEqual(before.friends.map(f=>[f.id,f.name,f.growth?.level,f.growth?.xp]))
 expect(backend.row().data!.world!.coins).toBe(before.world!.coins)
})
test('six late regions render their own lazy HD battle assets and 10-stage navigation fits all portrait widths',async({page,backend})=>{
 test.setTimeout(150000);const errors:string[]=[],assets:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.resourceType()==='image')assets.push(r.url())})
 await login(page,backend.secret);await page.getByRole('button',{name:'연습',exact:true}).tap();await page.getByLabel('전투 레벨').selectOption('50')
 const names=['그림자 성채','천상의 문','별의 정원','꿈의 미궁','천공의 성','잊혀진 별의 신전'],keys=['eclipse','heaven','garden','dream','skycastle','star-temple'],sizes=[[360,800],[375,812],[390,844],[412,915]]
 for(let i=0;i<6;i++){
  await page.setViewportSize({width:sizes[i%4][0],height:sizes[i%4][1]});await page.getByRole('button',{name:names[i],exact:true}).tap()
  await expect(page.getByRole('group',{name:'세부 스테이지'}).getByRole('button')).toHaveCount(10)
  await expect(page.getByRole('button',{name:`스테이지 ${9+i}-5 중간 보스`,exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:`스테이지 ${9+i}-10 보스`,exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
  if(i===3)await page.emulateMedia({reducedMotion:'reduce'});const offset=assets.length;await page.getByRole('button',{name:'보스전 바로 체험',exact:true}).tap()
  await expect.poll(async()=>await page.locator('.battle-view').getAttribute('data-phase')!=='battle'||await page.locator('.battle-view').getAttribute('data-busy')==='false'&&await page.locator('.battle-view').getAttribute('data-side')==='ally',{timeout:30000}).toBe(true)
  expect(assets.slice(offset).some(url=>url.includes('enemies-'+keys[i]+'-hd.webp'))).toBe(true)
  for(const other of keys.filter(key=>key!==keys[i]))expect(assets.slice(offset).some(url=>url.includes('enemies-'+other+'-hd.webp'))).toBe(false)
  await expect(page.locator('.battle-canvas canvas')).toBeVisible();await expect(page.locator('.enemy-intent').first()).toBeVisible()
  await page.screenshot({path:test.info().outputPath(`fairy-${keys[i]}-${sizes[i%4][0]}.png`)})
  if(i===0){await page.getByRole('button',{name:'전투 연출 설정',exact:true}).tap();await page.getByLabel('풍부한 이펙트').uncheck();await page.getByRole('button',{name:'전투 연출 설정',exact:true}).tap()}
  if(await page.locator('.battle-view').getAttribute('data-phase')==='battle'){
   await page.getByTestId('skill-basic').tap();await page.getByRole('button',{name:'선택한 스킬 사용',exact:true}).tap()
   await expect.poll(async()=>await page.locator('.battle-view').getAttribute('data-phase')!=='battle'||await page.locator('.battle-view').getAttribute('data-busy')==='false',{timeout:30000}).toBe(true)
   await page.screenshot({path:test.info().outputPath(`hit-${keys[i]}.png`)})
  }
  if(await page.locator('.battle-view').getAttribute('data-phase')==='battle')await page.getByRole('button',{name:'편성으로 돌아가기',exact:true}).tap()
  else await page.getByRole('button',{name:'파티 다시 편성하기',exact:true}).tap()
  await expect(page.locator('.party-view')).toBeVisible()
 }
 await expect(page.locator('.starlight-arena')).not.toContainText('환수');await expect(page.locator('.starlight-arena')).not.toContainText('공명')
 await page.getByRole('button',{name:'요정 도감 · 보물상자',exact:true}).tap();await expect(page.getByRole('heading',{name:'별빛 요정 도감',exact:true})).toBeVisible()
 expect(errors).toEqual([])
})
