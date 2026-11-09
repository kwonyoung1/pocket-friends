import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'

const daytime=Date.parse('2026-11-10T12:00:00+09:00')
const nighttime=Date.parse('2026-11-10T00:30:00+09:00')
const snapshot=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))
async function seed(page:Page,at:number){
 // Both the save and browser clock use the same instant; CI wall time must not
 // turn a successful-care scenario into an automatic-sleep scenario.
 await page.clock.install({time:new Date(at)})
 const s=freshWorld(at)
 s.world!.inventory.cake=2
 for(const f of s.friends){f.stats.happiness=20;f.stats.hunger=20;f.stats.hygiene=20}
 s.friends[0].photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVuoAAAAASUVORK5CYII='
 await page.addInitScript(s=>{if(!localStorage.getItem('pocket-friends-v1'))localStorage.setItem('pocket-friends-v1',JSON.stringify(s))},s)
 await page.goto('/')
 await expect(page.getByTestId('room-momo')).toBeVisible()
 return s
}

test('bulk play, food confirmation and bath preserve photos, coins and per-character limits',async({page})=>{
 const s=await seed(page,daytime)
 await page.getByRole('button',{name:'생활·입양',exact:true}).click()
 await page.getByRole('button',{name:'모두 놀아주기',exact:true}).dblclick()
 await expect(page.getByLabel('친구 일괄 관리')).toContainText('쿨타임')
 await page.getByRole('button',{name:'생활 메뉴 닫기',exact:true}).click()
 let saved=await snapshot(page)
 expect(saved.friends[0].stats.happiness).toBeGreaterThan(21)
 expect(saved.friends[0].stats.happiness).toBeLessThanOrEqual(22)
 const petAt=saved.friends[0].petRewardAfter
 await page.getByRole('button',{name:'인벤토리',exact:true}).click()
 await page.getByRole('button',{name:'음식',exact:true}).click()
 const cake=page.getByTestId('item-cake')
 await cake.getByRole('button',{name:'일괄 주기 (2명)',exact:true}).click()
 await expect(cake.getByLabel('일괄 먹이주기 확인')).toContainText('모모')
 await cake.getByRole('button',{name:'확인하고 일괄 주기',exact:true}).dblclick()
 await expect(cake).toHaveCount(0)
 await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click()
 saved=await snapshot(page)
 expect(saved.world.inventory.cake).toBe(0)
 expect(saved.friends[0].stats.hunger).toBeGreaterThan(50)
 expect(saved.friends[2].stats.hunger).toBeLessThan(21)
 expect(saved.friends[0].petRewardAfter).toBe(petAt)
 expect(saved.world.coins).toBe(s.world!.coins)
 await page.getByRole('button',{name:'생활·입양',exact:true}).click()
 await page.getByRole('button',{name:'모두 씻기',exact:true}).dblclick()
 await expect(page.getByLabel('친구 일괄 관리')).toContainText('쿨타임')
 saved=await snapshot(page)
 for(const f of saved.friends){expect(f.life.bathCount).toBe(1);expect(f.life.bath).toBeTruthy()}
 expect(saved.friends[0].photo).toBe(s.friends[0].photo)
 expect(saved.friends.map((f:{id:string})=>f.id)).toEqual(expect.arrayContaining(s.friends.map(f=>f.id)))
 await page.screenshot({path:`/tmp/pocket-bulk-${test.info().project.name}.png`,fullPage:true})
})

test('nighttime bulk play skips sleeping friends without granting rewards or spending food',async({page})=>{
 const s=await seed(page,nighttime),before=await snapshot(page)
 await page.getByRole('button',{name:'생활·입양',exact:true}).click()
 await page.getByRole('button',{name:'모두 놀아주기',exact:true}).dblclick()
 const report=page.getByLabel('친구 일괄 관리')
 await expect(report).toContainText('0명 완료')
 await expect(report).toContainText(`외출·수면·교감 ${before.friends.length}명`)
 const saved=await snapshot(page)
 for(const f of saved.friends){
  const original=before.friends.find((old:{id:string})=>old.id===f.id)!
  expect(f.stats.happiness).toBeLessThanOrEqual(original.stats.happiness)
  expect(f.petRewardAfter).toBe(original.petRewardAfter)
  expect(f.lastPetRewardAt).toBe(original.lastPetRewardAt)
 }
 expect(saved.world.coins).toBe(s.world!.coins)
 expect(saved.world.inventory).toEqual(s.world!.inventory)
 expect(saved.friends[0].photo).toBe(s.friends[0].photo)
 expect(saved.friends.map((f:{id:string})=>f.id)).toEqual(before.friends.map((f:{id:string})=>f.id))
})
