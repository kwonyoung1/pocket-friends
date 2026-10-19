import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {life} from '../src/expansion/model'
const at=Date.parse('2026-10-19T03:00:00Z'),hour=3600000
function sample(){const s=freshWorld(at);for(const f of s.friends){f.stats={hunger:100,hygiene:100,happiness:100,energy:40,affection:47};life(f,at)}return s}
async function seed(page:Page,s=sample()){
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at))
 await page.addInitScript(raw=>{if(!sessionStorage.getItem('status-seed')){localStorage.setItem('pocket-friends-v1',raw);sessionStorage.setItem('status-seed','1')}},JSON.stringify(s))
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();await page.getByRole('button',{name:`${s.friends[0].name} 상태 확인`}).click()
}
const stored=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))
test('online elapsed time recovers energy at eight per hour, halves/slows other rates and keeps integer HUD values',async({page})=>{
 await seed(page);await page.clock.fastForward(15*60000)
 await expect(page.getByRole('progressbar',{name:'체력',exact:true})).toHaveAttribute('aria-valuenow','42')
 await page.clock.fastForward(45*60000)
 const s=await stored(page);expect(s.friends[0].stats.energy).toBeCloseTo(48,6);expect(s.friends[0].stats.hunger).toBeCloseTo(91,6);expect(s.friends[0].stats.hygiene).toBeCloseTo(91,6)
 await expect(page.getByRole('progressbar',{name:'포만감',exact:true})).toHaveAttribute('aria-valuenow','91')
})
test('closed-page elapsed time and repeated reloads apply once without resetting stored photos or inventory',async({page})=>{
 const s=sample();s.friends[0].name='소중한 모모';s.friends[0].photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=10;return c.toDataURL('image/png')});s.world!.coins=777;s.world!.inventory={snack:7}
 await seed(page,s);await page.goto('about:blank');await page.clock.fastForward(3*hour);await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible()
 const first=await stored(page);expect(first.friends[0].stats.energy).toBeCloseTo(64,6);expect(first.friends[0].stats.hunger).toBeCloseTo(73,6);expect(first.friends[0].photo).toBe(s.friends[0].photo);expect(first.world.inventory).toEqual(s.world!.inventory);expect(first.world.coins).toBe(777)
 await page.reload();await expect(page.getByTestId('room-momo')).toBeVisible();expect((await stored(page)).friends[0].stats).toEqual(first.friends[0].stats)
})
test('legacy save receives an exact raw backup and its old elapsed rule once before the new hourly recovery begins',async({page})=>{
 const s=sample();s.savedAt=at-hour;delete s.world!.statusBalanceVersion;delete s.world!.statusBalanceSince
 for(const f of s.friends){f.stats.energy=80;f.life!.lastSettledAt=s.savedAt}
 const raw=JSON.stringify(s);await seed(page,s)
 const first=await stored(page);expect(first.friends[0].stats.energy).toBeCloseTo(70.4,6);expect(first.world.statusBalanceSince).toBe(at)
 expect(await page.evaluate(()=>localStorage.getItem('pocket-friends-v1-before-status'))).toBe(raw)
 await page.clock.fastForward(hour);expect((await stored(page)).friends[0].stats.energy).toBeCloseTo(78.4,6)
 await page.reload();expect((await stored(page)).friends[0].stats.energy).toBeCloseTo(78.4,6)
})
