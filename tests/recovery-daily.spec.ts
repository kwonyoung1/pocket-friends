import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {newSichuan} from '../src/sichuan/state'
const epoch=Date.parse('2026-10-17T14:59:58Z')
async function seed(page:Page,s=freshWorld(epoch)){
 await page.clock.install({time:new Date(s.savedAt)});await page.clock.pauseAt(new Date(s.savedAt))
 await page.addInitScript(s=>{if(!sessionStorage.getItem('recovery-seed')){localStorage.setItem('pocket-friends-v1',JSON.stringify(s));sessionStorage.setItem('recovery-seed','1')}},s)
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible()
}
test('room clock advances seconds and KST date, stays centered while the map pans, and does not capture gestures',async({page})=>{
 await seed(page);const clock=page.getByRole('timer',{name:'한국 시간 시계'})
 await expect(clock).toContainText('오후 11:59:58');await expect(clock).toContainText('2026년 10월 17일 토요일')
 const initial=await clock.boundingBox();await page.locator('.room-viewport').evaluate(el=>{el.scrollLeft=120;el.scrollTop=90})
 expect((await clock.boundingBox())!.x).toBe(initial!.x);expect(await clock.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none')
 await page.clock.runFor(3000);await expect(clock).toContainText('오전 12:00:01');await expect(clock).toContainText('2026년 10월 18일 일요일')
 const viewport=page.viewportSize()!;expect(initial!.x).toBeGreaterThanOrEqual(0);expect(initial!.x+initial!.width).toBeLessThan(viewport.width)
 await page.screenshot({path:`/tmp/pocket-daily-clock-${test.info().project.name}.png`,fullPage:true})
})
test('today ranking rolls over at midnight without reload while yesterday history survives reload',async({page})=>{
 const s=freshWorld(epoch);s.world!.sichuan=newSichuan();s.world!.sichuan.bests=[{playerId:'pc',nickname:'어제친구',elapsedMs:12345,at:epoch-10000,sessionId:'old'}]
 await seed(page,s);await page.getByRole('button',{name:'사천성',exact:true}).click();const ranking=page.getByRole('region',{name:'사천성 TOP 5'})
 await expect(ranking).toContainText('오늘의 TOP 5');await expect(ranking).toContainText('어제친구');await expect(page.getByTestId('ranking-reset')).toContainText('00:00:02')
 await page.clock.runFor(3000);await expect(ranking).not.toContainText('어제친구');await expect(page.getByTestId('ranking-day')).toContainText('2026-10-18')
 await page.reload();await page.getByRole('button',{name:'사천성',exact:true}).click();await expect(page.getByRole('region',{name:'사천성 TOP 5'})).not.toContainText('어제친구')
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(stored.world.sichuan.bests).toEqual(s.world!.sichuan.bests);expect(stored.world.sichuan.dailyBests).toEqual(s.world!.sichuan.bests)
})
test('recovery foods have pastel illustrations, exact prices and quantity confirmation in the existing shop',async({page})=>{
 const at=Date.parse('2026-10-17T03:00:00Z'),s=freshWorld(at);s.world!.coins=2000;s.friends[0].stats.energy=10;s.friends[0].photo='data:image/png;base64,AAAA'
 await seed(page,s);await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button',{name:'상점',exact:true}).click()
 for(const [id,name,price] of [['pumpkin-porridge','따뜻한 호박죽',120],['banana-smoothie','꿀바나나 스무디',180],['chicken-soup','특제 보양 삼계탕',300]] as const){const card=page.getByTestId(`item-${id}`);await expect(card).toContainText(name);await expect(card).toContainText(String(price));await expect(card.locator('svg[role="img"]')).toBeVisible()}
 await page.getByTestId('item-pumpkin-porridge').getByRole('button',{name:'구매하기'}).click()
 const dialog=page.getByRole('alertdialog');await expect(dialog).toContainText('따뜻한 호박죽');await expect(dialog).toContainText('120')
 await page.getByLabel('구매 수량',{exact:true}).fill('3');await page.getByRole('button',{name:'구매 확정',exact:true}).click()
 await page.getByRole('button',{name:'메뉴 닫기'}).click();await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button',{name:'인벤토리',exact:true}).click()
 await expect(page.getByTestId('item-pumpkin-porridge')).toContainText('보유 3개')
 await page.getByTestId('item-pumpkin-porridge').getByRole('button',{name:'모모에게 주기'}).click();await expect(page.getByTestId('item-pumpkin-porridge')).toContainText('보유 2개')
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(data.world.coins).toBe(1640);expect(data.friends[0].stats.energy).toBe(25);expect(data.friends[0].photo).toBe(s.friends[0].photo)
})
test('clock second ticks update its own component without rerendering its parent',async({page})=>{
 await seed(page)
 await page.evaluate(async()=>{
  const reactPath='/node_modules/.vite/deps/react.js',domPath='/node_modules/.vite/deps/react-dom_client.js',clockPath='/src/room/RoomClock.tsx'
  const {default:React}=await import(reactPath),{default:ReactDOM}=await import(domPath),{RoomClock}=await import(clockPath)
  const host=document.createElement('div');host.id='isolated-clock';document.body.append(host)
  const counts={parent:0};(window as unknown as {isolatedCounts:typeof counts}).isolatedCounts=counts
  function Parent(){counts.parent++;return React.createElement(RoomClock,{now:Date.now})}
  ReactDOM.createRoot(host).render(React.createElement(Parent))
 })
 const isolated=page.locator('#isolated-clock');await expect(isolated).toContainText('오후 11:59:58')
 await page.clock.runFor(3000);await expect(isolated).toContainText('오전 12:00:01')
 expect(await page.evaluate(()=>(window as unknown as {isolatedCounts:{parent:number}}).isolatedCounts.parent)).toBe(1)
})
