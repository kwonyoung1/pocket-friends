import {expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {test} from './fixture'
import {freshWorld} from '../src/cloud/engine'
import {roomScale} from '../src/room/config'
import {dragPlace} from '../tests/placement-input'
async function login(page:Page,password:string){await page.goto('/');await page.getByLabel('접속 비밀번호').fill(password);await page.getByRole('button',{name:'입장하기'}).click()}
test('shared theme and extended floor placements survive two-device changes and reload while preserving the original data',async({page,backend,browser})=>{
 const at=Date.parse('2026-10-15T03:00:00Z'),s=freshWorld(at)
 s.world!.coins=8765;s.world!.inventory={'treasure-diamond':1,'decor-0-2':1};s.world!.equipment={version:1,instances:[{id:'kept',itemId:'gear-crystal-hat',regionId:'mine',foundAt:at,equippedBy:'momo'}]}
 s.world!.expansion={version:1,placements:[{id:'legacy',itemId:'plant',x:530,y:275*roomScale,layer:3}],hamsters:[],adoptions:[],events:[],seen:[]}
 s.friends[0].name='우리 사진 친구';s.friends[0].photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=20;c.getContext('2d')!.fillRect(0,0,20,20);return c.toDataURL('image/png')})
 const raw=JSON.stringify(s);await page.addInitScript(raw=>localStorage.setItem('pocket-friends-v1',raw),raw)
 await login(page,backend.secret);await page.getByRole('button',{name:'이 기기 데이터를 기준으로 가져오기'}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기'}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
 await expect(page.getByTestId('room-momo')).toBeVisible();backend.seedRanking()
 const before=backend.row().data!
 await page.getByRole('button',{name:'🎃 할로윈 테마로 변경',exact:true}).click();await expect(page.locator('.room')).toHaveAttribute('data-theme','halloween')
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone)
 try{
  const second=await phone.newPage();await login(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await expect(second.locator('.room')).toHaveAttribute('data-theme','halloween')
  await second.getByRole('button',{name:'🌿 기본 테마로 변경',exact:true}).click();await expect(second.locator('.room')).toHaveAttribute('data-theme','default')
  await page.getByRole('button',{name:'새로 동기화',exact:true}).click();await expect(page.locator('.room')).toHaveAttribute('data-theme','default')
  const p=await dragPlace(second,'treasure-diamond',{x:500*roomScale,y:610*roomScale})
  await expect.poll(()=>backend.row().data!.world!.expansion!.placements.length).toBe(2)
  expect(backend.row().data!.world!.expansion!.placements[1]).toMatchObject(p)
  await page.getByRole('button',{name:'새로 동기화',exact:true}).click();await expect(page.locator('.placed-gem')).toHaveCount(1)
  await page.getByRole('button',{name:'🎃 할로윈 테마로 변경',exact:true}).click();await expect(page.locator('.room')).toHaveAttribute('data-theme','halloween')
  await second.reload();await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await expect(second.locator('.room')).toHaveAttribute('data-theme','halloween');await expect(second.locator('.placed-gem')).toHaveCount(1)
  const after=backend.row().data!;expect(after.world!.coins).toBe(before.world!.coins);expect(after.world!.equipment).toEqual(before.world!.equipment);expect(after.world!.sichuan!.bests).toEqual(before.world!.sichuan!.bests)
  expect(after.world!.expansion!.placements[0]).toEqual(before.world!.expansion!.placements[0]);expect(after.friends[0].name).toBe(s.friends[0].name);expect(after.friends[0].photo).toBe(s.friends[0].photo)
  expect(await page.evaluate(()=>localStorage.getItem('pocket-friends-v1'))).toBe(raw)
 }finally{await phone.close()}
})
