import {expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {test} from './fixture'
import {freshWorld} from '../src/cloud/engine'
async function menu(page:Page,name:string){await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button',{name,exact:true}).click()}
async function login(page:Page,secret:string){await page.goto('/');await page.getByLabel('접속 비밀번호').fill(secret);await page.getByRole('button',{name:'입장하기'}).click()}
async function sync(page:Page){await page.getByRole('button',{name:'새로 동기화',exact:true}).click();await expect(page.getByRole('button',{name:'새로 동기화',exact:true})).toBeEnabled()}
test('equipment ownership, overlapping gems and layer recovery sync to mobile without modifying the imported original',async({page,backend,browser})=>{
 const at=Date.parse('2026-10-15T03:00:00Z'),s=freshWorld(at)
 s.world!.coins=12345;s.world!.inventory={'treasure-diamond':2,snack:7};s.world!.book['treasure-diamond']={firstAt:at,lastAt:at,count:2}
 s.world!.equipment={version:1,instances:[{id:'only-hat',itemId:'gear-crystal-hat',regionId:'mine',foundAt:at}]}
 s.world!.expansion={version:1,placements:[{id:'original-pot',itemId:'plant',x:530,y:390}],hamsters:[],adoptions:[],events:[],seen:['treasure-diamond']}
 s.friends[0].photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=20;c.getContext('2d')!.fillRect(0,0,20,20);return c.toDataURL('image/png')})
 const raw=JSON.stringify(s);await page.addInitScript(raw=>localStorage.setItem('pocket-friends-v1',raw),raw)
 await login(page,backend.secret);await page.getByRole('button',{name:'이 기기 데이터를 기준으로 가져오기'}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기'}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await expect(page.getByTestId('room-momo')).toBeVisible()
 await menu(page,'캐릭터 성장');await page.getByRole('button',{name:'장비',exact:true}).click();await page.getByTestId('gear-only-hat').getByRole('button',{name:'착용',exact:true}).click();await expect.poll(()=>backend.row().data!.world!.equipment!.instances[0].equippedBy).toBe('momo');await page.getByRole('button',{name:'메뉴 닫기'}).click()
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone)
 try{
  const second=await phone.newPage();await login(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await menu(second,'캐릭터 성장');await second.getByRole('button',{name:'장비',exact:true}).click();await expect(second.getByTestId('gear-slot-head')).toContainText('수정 광부모')
  await second.getByLabel('메뉴 캐릭터 선택').selectOption('bibi');await expect(second.getByTestId('gear-only-hat').getByRole('button')).toBeDisabled();await second.getByRole('button',{name:'메뉴 닫기'}).click()
  const place=async()=>{await menu(page,'인벤토리');await page.getByTestId('item-treasure-diamond').getByRole('button',{name:'방에 배치하기'}).click();await page.getByRole('button',{name:'여기에 놓기'}).click();await expect(page.getByRole('button',{name:'새로 동기화',exact:true})).toBeEnabled()}
  await place();await place();await expect.poll(()=>backend.row().data!.world!.expansion!.placements.length).toBe(3)
  await sync(second);await expect(second.locator('.placed-gem')).toHaveCount(2)
  await second.getByRole('button',{name:'가구 편집',exact:true}).click();const gem=backend.row().data!.world!.expansion!.placements.find(p=>p.itemId==='treasure-diamond')!
  await second.getByLabel('배치 아이템 선택').selectOption(gem.id);await second.getByRole('button',{name:'맨 앞으로 가져오기'}).click();await expect.poll(()=>backend.row().data!.world!.expansion!.placements.find(p=>p.id===gem.id)!.layer).toBe(2)
  await second.getByRole('button',{name:'회수하기',exact:true}).click();await expect.poll(()=>backend.row().data!.world!.inventory['treasure-diamond']).toBe(1)
  await sync(page);await expect(page.locator('.placed-gem')).toHaveCount(1)
  await second.reload();await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await expect(second.locator('.placed-gem')).toHaveCount(1)
  const data=backend.row().data!;expect(data.world!.coins).toBe(12345);expect(data.world!.inventory.snack).toBe(7);expect(data.world!.book['treasure-diamond'].count).toBe(2);expect(data.world!.equipment!.instances).toHaveLength(1);expect(data.friends[0].photo).toBe(s.friends[0].photo)
  expect(data.world!.expansion!.placements.find(p=>p.id==='original-pot')).toMatchObject({itemId:'plant',x:530,y:390})
  expect(await page.evaluate(()=>localStorage.getItem('pocket-friends-v1'))).toBe(raw)
 }finally{await phone.close()}
})
