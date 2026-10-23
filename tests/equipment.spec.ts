import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {equipment} from '../src/equipment/model'
import {equipmentById} from '../src/equipment/catalog'
import {world} from '../src/progression/model'
const at=Date.parse('2026-10-23T03:00:00Z')
async function seed(page:Page){
 const s=freshWorld(at);s.friends[0].name='소중한 모모';s.friends[0].growth!.level=30;s.friends[0].stats.energy=100
 world(s).coins=12345;world(s).inventory={'treasure-diamond':2,plant:1,snack:7};world(s).book['treasure-diamond']={firstAt:at,lastAt:at,count:2}
 world(s).expansion={version:1,placements:[{id:'legacy-plant',itemId:'plant',x:530,y:390}],hamsters:[],adoptions:[],events:[],seen:['treasure-diamond']}
 for(const itemId of ['gear-underground-helm','gear-time-robe','gear-crystal-compass'])equipment(s).instances.push({id:itemId,itemId,regionId:equipmentById[itemId].regionId,foundAt:at})
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000))
 await page.addInitScript(data=>{if(!sessionStorage.getItem('equipment-seed')){localStorage.setItem('pocket-friends-v1',JSON.stringify(data));sessionStorage.setItem('equipment-seed','yes')}},s)
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible()
 return s
}
async function menu(page:Page,name:string){await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button',{name,exact:true}).click()}
async function snapshot(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))}

test('three equipment slots, upper regions and frozen departure survive refresh without replacing old friends',async({page},info)=>{
 const original=await seed(page)
 await menu(page,'캐릭터 성장');await page.getByRole('button',{name:'장비',exact:true}).click()
 for(const id of ['gear-underground-helm','gear-time-robe','gear-crystal-compass'])await page.getByTestId(`gear-${id}`).getByRole('button',{name:'착용',exact:true}).click()
 for(const slot of ['head','body','accessory'])await expect(page.getByTestId(`gear-slot-${slot}`).getByRole('button',{name:'해제'})).toBeVisible()
 await expect(page.locator('.gear-summary')).toContainText('35%')
 await page.screenshot({path:`/tmp/pocket-gear-equipment-${info.project.name}.png`,fullPage:true})
 await page.getByRole('button',{name:'메뉴 닫기'}).click();await menu(page,'탐험')
 for(const [name,level] of [['수정 광산',20],['잊혀진 신전',25],['별빛 성역',30]] as const){const card=page.locator('.region-card').filter({has:page.getByRole('heading',{name,exact:true})});await expect(card).toContainText(`Lv.${level}`);await expect(card.getByRole('button',{name:'탐험 보내기'})).toBeEnabled()}
 const mine=page.locator('.region-card').filter({has:page.getByRole('heading',{name:'수정 광산',exact:true})})
 await expect(mine).toContainText('195분');await mine.getByRole('button',{name:'탐험 보내기'}).click()
 const departed=(await snapshot(page)).world.jobs[0];expect(departed.equipmentBonus).toEqual({time:.35,coins:0,rare:3})
 await page.getByRole('button',{name:'메뉴 닫기'}).click();await menu(page,'인벤토리');await page.getByRole('button',{name:'장비',exact:true}).click()
 await page.getByTestId('gear-gear-underground-helm').getByRole('button',{name:'해제'}).click()
 expect((await snapshot(page)).world.jobs[0]).toEqual(departed)
 await page.reload();await menu(page,'인벤토리');await page.getByRole('button',{name:'장비',exact:true}).click();await expect(page.getByTestId('gear-gear-underground-helm').getByRole('button',{name:'착용',exact:true})).toBeVisible()
 const restored=await snapshot(page)
 expect(restored.world.coins).toBe(12345);expect(restored.world.inventory.snack).toBe(7);expect(restored.world.expansion.placements).toEqual(original.world!.expansion!.placements)
 expect(restored.friends.slice(0,4).map((f:{id:string;name:string})=>[f.id,f.name])).toEqual(original.friends.map(f=>[f.id,f.name]))
})

test('transparent gem preview, half size, aura, overlaps and individual layer controls preserve quantities',async({page},info)=>{
 await seed(page)
 const place=async()=>{await menu(page,'인벤토리');await page.getByTestId('item-treasure-diamond').getByRole('button',{name:'방에 배치하기'}).click();await expect(page.getByTestId('placement-preview')).toHaveClass(/placed-gem/);await page.getByRole('button',{name:'여기에 놓기'}).click()}
 await place();await place()
 const gems=page.locator('.placed-gem:not(.furniture-preview)')
 await expect(gems).toHaveCount(2);await expect(gems.first()).toHaveClass(/gem-aura/)
 const ratio=await page.evaluate(()=>{const g=document.querySelector<HTMLElement>('.placed-gem')!,f=document.querySelector<HTMLElement>('[data-placement-id="legacy-plant"]')!;return {w:g.offsetWidth/f.offsetWidth,h:g.offsetHeight/f.offsetHeight}})
 expect(ratio.w).toBeCloseTo(.5,1);expect(ratio.h).toBeCloseTo(.5,1)
 let s=await snapshot(page);expect(s.world.expansion.placements.map((p:{x:number;y:number})=>[p.x,p.y])).toEqual([[530,390],[530,390],[530,390]])
 expect(s.world.inventory['treasure-diamond']).toBe(0)
 await page.emulateMedia({reducedMotion:'reduce'});expect(await gems.first().evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none')
 await page.getByRole('button',{name:'가구 편집',exact:true}).click()
 const select=page.getByLabel('배치 아이템 선택'),id=s.world.expansion.placements[1].id
 await select.selectOption(id);await page.getByRole('button',{name:'맨 뒤로 보내기'}).click()
 s=await snapshot(page);expect(s.world.expansion.placements.find((p:{id:string})=>p.id===id).layer).toBe(0)
 await page.screenshot({path:`/tmp/pocket-gear-room-${info.project.name}.png`,fullPage:true})
 await page.getByRole('button',{name:'회수하기',exact:true}).click();expect((await snapshot(page)).world.inventory['treasure-diamond']).toBe(1)
 await page.reload();await expect(page.locator('.placed-gem')).toHaveCount(1)
 s=await snapshot(page);expect(s.world.book['treasure-diamond'].count).toBe(2);expect(s.world.expansion.placements.find((p:{id:string})=>p.id==='legacy-plant')).toMatchObject({x:530,y:390,itemId:'plant'})
})
