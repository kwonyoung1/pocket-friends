import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {grantSpecialFriends} from '../src/humans/model'
import {makeAdoptee} from '../src/expansion/model'
import {adoptionCatalog} from '../src/expansion/config'
// Keep software-GPU CI rendering bounded while preserving mobile CSS viewports and real touch input.
test.use({deviceScaleFactor:1})
test.skip(({isMobile})=>!isMobile,'Touch-first mobile coverage; existing desktop suites remain unchanged')
async function seed(page:Page){const at=Date.now(),save=freshWorld(at);grantSpecialFriends(save,at);for(const f of save.friends)if(f.growth)f.growth.level=f.id==='momo'?29:f.id==='special-girl'?50:35;save.world!.coins=777;save.world!.inventory={snack:2};save.friends.find(f=>f.id==='momo')!.name='소중한 모모';await page.addInitScript(s=>{if(!localStorage.getItem('pocket-friends-v1'))localStorage.setItem('pocket-friends-v1',JSON.stringify(s))},save);await page.goto('/');await expect(page.getByTestId('room-special-boy')).toBeAttached();return save}
async function enter(page:Page){await page.getByRole('button',{name:'별빛 아레나',exact:true}).tap();await expect(page.getByRole('dialog',{name:'별빛 아레나',exact:true})).toBeVisible()}
async function ready(page:Page){await expect(page.locator('.starlight-arena .battle-view')).toHaveAttribute('data-busy','false',{timeout:20000})}
for(const [width,height] of [[360,800],[375,812],[390,844],[412,915]])test(`arena touch entry, real levels and return preserve the home at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const initial=await seed(page);const homeStyle=await page.locator('.header .brand').evaluate(el=>({font:getComputedStyle(el).fontFamily,color:getComputedStyle(el).color}));await enter(page)
 await expect(page.getByLabel('전투 레벨')).toHaveValue('owned');await expect(page.locator('.starlight-arena .hero-card').filter({has:page.getByRole('heading',{name:/소중한 모모/})}).locator('.hero-level')).toHaveText('Lv.29')
 await expect(page.locator('.app-shell')).toHaveAttribute('data-suspended','true');expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
 await page.getByRole('button',{name:'달빛 숲으로 출발',exact:true}).tap();await ready(page);expect((await page.locator('.battle-header').boundingBox())!.y).toBeGreaterThanOrEqual(55);const enemyBox=await page.locator('.enemy-hud').boundingBox();expect(enemyBox!.y+enemyBox!.height).toBeLessThanOrEqual(height);await expect(page.getByTestId('skill-active2')).toBeEnabled();await page.getByTestId('skill-basic').tap();await ready(page)
 await page.getByRole('button',{name:'별빛 아레나 닫기',exact:true}).tap();await expect(page.getByTestId('room-momo')).toBeVisible();await expect(page.locator('.app-shell')).toHaveAttribute('data-suspended','false');expect(await page.locator('.header .brand').evaluate(el=>({font:getComputedStyle(el).fontFamily,color:getComputedStyle(el).color}))).toEqual(homeStyle)
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(saved.world.coins).toBe(777);expect(saved.world.inventory).toEqual(initial.world!.inventory);expect(saved.friends.map((f:{id:string;name:string;growth:{level:number}})=>[f.id,f.name,f.growth.level])).toEqual(initial.friends.map(f=>[f.id,f.name,f.growth!.level]));expect(errors).toEqual([])
})
test('practice levels, COST rules, cinematic, interrupted attack and existing minigame entry remain safe',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await seed(page);await enter(page)
 await page.getByRole('button',{name:'코코 편성',exact:true}).tap();await expect(page.getByRole('button',{name:'달빛 숲으로 출발',exact:true})).toBeDisabled();await page.getByRole('button',{name:'코코 편성 해제',exact:true}).tap()
 await page.getByLabel('전투 레벨').selectOption('29');await page.getByRole('button',{name:'달빛 숲으로 출발',exact:true}).tap();await ready(page);await expect(page.getByTestId('skill-active1')).toBeDisabled();await expect(page.getByTestId('skill-active2')).toBeDisabled();await page.getByRole('button',{name:'편성으로 돌아가기',exact:true}).tap()
 await page.getByLabel('전투 레벨').selectOption('35');await page.getByRole('button',{name:'보스전 바로 체험',exact:true}).tap();await expect(page.locator('[data-cinematic=boss]')).toBeVisible();await ready(page);await page.getByRole('button',{name:'전투 연출 설정',exact:true}).tap();await page.getByRole('button',{name:/컷인 미리보기/}).tap();await expect(page.locator('[data-cinematic=cutin]')).toBeVisible();await ready(page)
 await page.getByTestId('skill-active1').tap();await page.getByRole('button',{name:'별빛 아레나 닫기',exact:true}).tap();await expect(page.getByTestId('room-momo')).toBeVisible();await enter(page);await expect(page.getByLabel('전투 레벨')).toHaveValue('owned');await page.keyboard.press('Escape');await expect(page.getByTestId('room-momo')).toBeVisible()
 await page.getByRole('button',{name:'💎 보물 3매치',exact:true}).tap();await expect(page.getByRole('button',{name:'스테이지 모드 시작',exact:true})).toBeVisible();expect(errors).toEqual([])
})
test('complete the integrated two-wave fight without changing growth or coins',async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await seed(page);await enter(page);await page.getByLabel('전투 레벨').selectOption('35');await page.getByRole('button',{name:'스테이지 1-5 보스',exact:true}).tap();await page.getByRole('button',{name:'달빛 숲으로 출발',exact:true}).tap();await ready(page);await page.getByRole('button',{name:'전투 연출 설정',exact:true}).tap();await page.getByLabel('풍부한 이펙트').uncheck();await page.getByRole('button',{name:'전투 연출 설정',exact:true}).tap();await page.getByRole('button',{name:'전투 속도',exact:true}).tap();let boss=false
 for(let n=0;n<100;n++){
  await expect.poll(async()=>{const view=page.locator('.starlight-arena .battle-view');return (await view.getAttribute('data-phase'))!=='battle'||((await view.getAttribute('data-side'))==='ally'&&(await view.getAttribute('data-busy'))==='false')},{timeout:20000}).toBe(true)
  const view=page.locator('.starlight-arena .battle-view');boss||=await view.getAttribute('data-wave')==='2';if(await view.getAttribute('data-phase')!=='battle')break
  const id=await view.getAttribute('data-actor');let skill='basic';if(id==='special-girl'&&await page.getByTestId('skill-active2').isEnabled())skill='active2';else if(id!=='special-girl'&&await page.getByTestId('skill-active2').isEnabled())skill='active2'
  await page.getByTestId('skill-'+skill).tap();await ready(page)
 }
 expect(boss).toBe(true);await expect(page.locator('.battle-view')).toHaveAttribute('data-phase','victory');await expect(page.getByText('연습 전투 · 코인·경험치·아이템 지급 없음',{exact:true})).toBeVisible();await page.getByRole('button',{name:'별빛 아레나 닫기',exact:true}).tap();await expect(page.getByRole('button',{name:'보유 코인 777',exact:true})).toBeVisible()
})

test('all ten owned friends, distinct regions and four-legged new animal art render on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});const at=Date.now(),save=freshWorld(at);grantSpecialFriends(save,at);for(const d of adoptionCatalog)save.friends.push(makeAdoptee(d.id,at));for(const f of save.friends)if(f.growth)f.growth.level=50
 await page.addInitScript(s=>localStorage.setItem('pocket-friends-v1',JSON.stringify(s)),save);await page.goto('/');await expect(page.getByTestId('room-special-boy')).toBeAttached();await enter(page)
 await expect(page.locator('.hero-card')).toHaveCount(10);await page.getByLabel('전투 레벨').selectOption('50');await page.getByRole('button',{name:'별빛 성역',exact:true}).tap();await page.getByRole('button',{name:'스테이지 8-5 보스',exact:true}).tap();await expect(page.locator('.stage-card img')).toHaveAttribute('src',/bg-sanctuary/)
 await page.getByRole('button',{name:'모모 편성 해제',exact:true}).tap();await page.getByRole('button',{name:'비비 편성 해제',exact:true}).tap();await page.getByRole('button',{name:'두두 편성',exact:true}).tap();await page.getByRole('button',{name:'별이 편성',exact:true}).tap();await page.getByRole('button',{name:'별빛 성역으로 출발',exact:true}).tap();await ready(page)
 await expect(page.locator('.battle-canvas canvas')).toBeVisible();await expect(page.getByRole('button',{name:'두두 아군 선택'})).toBeVisible();await expect(page.getByRole('button',{name:'별이 아군 선택'})).toBeVisible()
 expect((await page.locator('.battle-header').boundingBox())!.y).toBeGreaterThanOrEqual(55);const box=await page.getByTestId('skill-basic').boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.y+box!.height).toBeLessThan(844);await page.screenshot({path:test.info().outputPath('sanctuary-dudu-byeol.png')})
})
