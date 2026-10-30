import {test} from './fixture'
import {expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {nextMove,swap,idle} from '../tests/match3-input'
import {freshWorld} from '../src/cloud/engine'
async function enter(page:Page,secret:string){await page.goto('/');await page.getByLabel('접속 비밀번호').fill(secret);await page.getByRole('button',{name:'입장하기',exact:true}).click()}
for(const mode of ['stage','challenge'] as const)test(`${mode}: local match play freezes background rendering while existing sync continues; exit reads the other device without awarding or overwriting world data`,async({page,backend,browser})=>{
 const original=freshWorld(Date.parse('2026-10-15T03:00:00Z'));original.world!.expansion={version:1,placements:[],hamsters:[{id:'h0',foundAt:original.savedAt,regionId:'forest',deployed:true,x:650,y:600}],adoptions:[],events:[],seen:[]}
 await page.addInitScript(s=>localStorage.setItem('pocket-friends-v1',JSON.stringify(s)),original)
 await enter(page,backend.secret);await page.getByRole('button',{name:'이 기기 데이터를 기준으로 가져오기',exact:true}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기',exact:true}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기',exact:true}).click();await expect(page.getByTestId('room-momo')).toBeVisible();await expect(page.locator('.room-hamster')).toBeVisible()
 const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(phone)
 try{
  const second=await phone.newPage();await enter(second,backend.secret);await second.getByRole('button',{name:'이 클라우드 월드 사용하기',exact:true}).click();await expect(second.getByTestId('room-momo')).toBeVisible()
  const before=structuredClone(backend.row().data!);const outgoing:{action?:string;command?:{type?:string}}[]=[];page.on('request',r=>{if(r.url().includes('/functions/v1/game'))outgoing.push(r.postDataJSON())})
  await page.getByRole('button',{name:'💎 보물 3매치',exact:true}).click();await page.getByRole('button',{name:mode==='challenge'?'도전 모드 시작':'스테이지 모드 시작',exact:true}).click();await expect(page.getByRole('gridcell')).toHaveCount(64);await page.waitForTimeout(100)
  await page.evaluate(()=>{document.documentElement.dataset.worldChanges='0';new MutationObserver(()=>{document.documentElement.dataset.worldChanges=String(Number(document.documentElement.dataset.worldChanges)+1)}).observe(document.querySelector('.room')!,{subtree:true,attributes:true,childList:true})})
  const m=await nextMove(page);await swap(page,m.a,m.b);await idle(page)
  await second.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button',{name:'상점',exact:true}).click();await second.getByTestId('item-snack').getByRole('button',{name:'구매하기',exact:true}).click();await second.getByRole('button',{name:'구매 확정',exact:true}).click();await expect(second.getByRole('button',{name:'보유 코인 285',exact:true})).toBeVisible()
  await page.waitForTimeout(5500);expect(outgoing.some(r=>r.action==='status')).toBe(true);expect(outgoing.filter(r=>r.action==='command').every(r=>r.command?.type==='refresh')).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.dataset.worldChanges)).toBe('0');expect(backend.row().data!.world!.coins).toBe(285);expect(backend.row().data!.world!.inventory.snack).toBe(1);expect(backend.row().data!.friends.map(f=>f.growth?.xp)).toEqual(before.friends.map(f=>f.growth?.xp))
  const count=outgoing.length;await page.getByRole('button',{name:'보물 3매치 종료',exact:true}).click();await page.getByRole('button',{name:'거실로 돌아가기',exact:true}).click();await expect(page.getByRole('button',{name:'보유 코인 285',exact:true})).toBeVisible();await expect.poll(()=>outgoing.length).toBeGreaterThan(count)
  await page.getByRole('button',{name:'사천성',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible()
 }finally{await phone.close()}
})
