import {test,expect} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
const at=Date.parse('2026-11-10T12:00:00+09:00')
async function seed(page:import('@playwright/test').Page){const s=freshWorld(at);s.world!.coins=5432;s.world!.inventory.cake=2;s.friends[0].name='우리 모모';s.friends[0].stats.hunger=20;await page.clock.install({time:new Date(at)});await page.addInitScript(s=>{if(!localStorage.getItem('pocket-friends-v1'))localStorage.setItem('pocket-friends-v1',JSON.stringify(s))},s);await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();return s}
test('cozy home keeps the economy, needs, selection and accessible tools through reload',async({page})=>{
 const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()))
 const initial=await seed(page)
 await expect(page.getByTestId('room-momo')).toHaveAttribute('data-feeling','hungry')
 await expect(page.getByTestId('room-momo')).toHaveAccessibleDescription(/배가 고파요/)
 await expect(page.getByRole('timer',{name:'한국 시간 시계'})).toBeVisible()
 const clock=await page.getByRole('timer').boundingBox();expect(clock!.x).toBeGreaterThanOrEqual(0);expect(clock!.x+clock!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
 await page.getByRole('button',{name:'우리 모모 상태 확인',exact:true}).click()
 await expect(page.getByRole('progressbar',{name:'포만감',exact:true})).toHaveAttribute('aria-valuenow',/^(19|20)$/)
 await page.getByRole('button',{name:/모두 돌보기/}).click();await expect(page.locator('.cozy-together').getByRole('button',{name:'모두 놀아주기',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'🍽 모두 먹이주기 · 음식 고르기',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click()
 await page.getByLabel('화면 설정',{exact:true}).click();await page.getByLabel('생활 모션 줄이기',{exact:true}).check();await expect(page.locator('.cozy-home')).toHaveAttribute('data-living-motion','reduced');await expect(page.getByTestId('room-momo').locator('.living-motion')).toHaveAttribute('data-idle','still');await page.getByLabel('화면 설정',{exact:true}).click()
 await page.reload();await expect(page.getByTestId('room-momo')).toBeVisible();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))
 expect(saved.world.coins).toBe(initial.world!.coins);expect(saved.world.inventory).toEqual(initial.world!.inventory);expect(saved.friends[0].name).toBe('우리 모모');expect(saved.friends.map((f:{id:string})=>f.id)).toEqual(expect.arrayContaining(initial.friends.map(f=>f.id)))
 expect(requests.filter(r=>/assets\/pixi-|node_modules\/.*pixi/.test(r))).toEqual([]);expect(errors).toEqual([])
})
test('small and landscape layouts, motion reduction and night atmosphere stay inside the viewport',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await seed(page)
 for(const viewport of [{width:320,height:740},{width:844,height:390},{width:1440,height:1000}]){await page.setViewportSize(viewport);await expect(async()=>{expect(await page.evaluate(()=>document.body.scrollWidth>document.documentElement.clientWidth)).toBe(false)}).toPass();await expect(page.getByRole('timer')).toBeVisible()}
 expect(await page.locator('.cozy-sunwash').evaluate(el=>getComputedStyle(el).animationName)).toBe('none')
 await page.clock.setSystemTime(new Date('2026-11-10T00:30:00+09:00'));await page.clock.runFor(1500);await expect(page.locator('.room')).toHaveAttribute('data-night','true')
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!).world.coins);await page.clock.runFor(10000);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!).world.coins)).toBe(before)
})
