import { expect } from '@playwright/test'
import { test } from './fixture'

async function enter(page:import('@playwright/test').Page,secret:string,fresh=false){
 await page.goto('/');await page.getByLabel('접속 비밀번호').fill(secret);await page.getByRole('button',{name:'입장하기'}).click()
 if(fresh){await page.getByRole('button',{name:'새 공유 월드로 시작하기'}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기'}).click()}
 await page.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click();await expect(page.getByTestId('room-momo')).toBeVisible()
}

test('unchanged probes transfer no world; changed deltas preserve photos across two touch devices and reload',async({page,backend,browser},info)=>{
 await enter(page,backend.secret,true)
 const photo=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=150
  const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(150,150);let seed=123
  for(let i=0;i<pixels.data.length;i++){seed=(seed*1664525+1013904223)>>>0;pixels.data[i]=i%4===3?255:seed>>>24}
  ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/png')
 })
 backend.setPhoto(photo)
 await page.getByRole('button',{name:'새로 동기화',exact:true}).click()
 await expect(page.getByTestId('room-momo').getByRole('img',{name:'모모의 등록 사진'})).toBeVisible()
 const phone=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});await backend.attach(phone)
 try {
  const second=await phone.newPage();await enter(second,backend.secret)
  await page.getByRole('button',{name:'새로 동기화',exact:true}).click()
  await expect(page.locator('.cloud-status')).toContainText(`v${backend.row().revision}`)
  const before=backend.traffic().length
  await page.getByRole('button',{name:'새로 동기화',exact:true}).click()
  await expect.poll(()=>backend.traffic().slice(before).some(r=>r.unchanged)).toBe(true)
  expect(backend.traffic().slice(before).filter(r=>r.unchanged).every(r=>r.bytes<120)).toBe(true)
  const previous=backend.row().revision
  await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button',{name:'상점',exact:true}).click()
  await page.getByTestId('item-snack').getByRole('button',{name:'구매하기'}).click();await page.getByRole('button',{name:'구매 확정',exact:true}).click()
  await expect.poll(()=>backend.row().revision).toBeGreaterThan(previous)
  await expect(second.getByRole('button',{name:'보유 코인 285'})).toBeVisible({timeout:12000})
  await expect(second.getByTestId('room-momo').getByRole('img',{name:'모모의 등록 사진'})).toBeVisible()
  expect(backend.row().data!.friends[0].photo).toBe(photo)
  const buy=backend.traffic().slice(before).find(r=>r.type==='buy'||r.type==='buy-many')
  expect(buy?.delta).toBe(true);expect(buy!.bytes).toBeLessThan(Buffer.byteLength(JSON.stringify(backend.row()))*.3)
  await second.reload();await second.getByRole('button',{name:'이 클라우드 월드 사용하기'}).click()
  await expect(second.getByRole('button',{name:'보유 코인 285'})).toBeVisible()
  expect(backend.row().data!.friends[0].photo).toBe(photo)
  for(const viewport of [{width:360,height:800},{width:375,height:812},{width:390,height:844},{width:412,height:915}]){
   await second.setViewportSize(viewport)
   await expect(second.getByRole('button',{name:'새로 동기화',exact:true})).toBeVisible()
   await expect(second.getByTestId('room-momo').getByRole('img',{name:'모모의 등록 사진'})).toBeVisible()
  }
  const traffic=backend.traffic().slice(before)
  await info.attach('egress-fixture-traffic',{body:JSON.stringify({worldBytes:Buffer.byteLength(JSON.stringify(backend.row())),requests:traffic},null,2),contentType:'application/json'})
 } finally {await phone.close()}
})

test('offline commands keep their operation ID and reconnect settles once without losing photos or coins',async({page,backend,context})=>{
 await enter(page,backend.secret,true)
 await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button',{name:'상점',exact:true}).click()
 backend.loseNextBuyResponse()
 await page.getByTestId('item-snack').getByRole('button',{name:'구매하기'}).click();await page.getByRole('button',{name:'구매 확정',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('동기화에 실패')
 expect(backend.row().data!.world!.coins).toBe(285)
 const raw=await page.evaluate(()=>sessionStorage.getItem('pocket-friends-cloud-pending'))
 await context.setOffline(true);await page.waitForTimeout(6000)
 expect(await page.evaluate(()=>sessionStorage.getItem('pocket-friends-cloud-pending'))).toBe(raw)
 await context.setOffline(false)
 await expect(page.getByRole('button',{name:'보유 코인 285'})).toBeVisible({timeout:10000})
 await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('pocket-friends-cloud-pending')??'[]').length)).toBe(0)
 expect(backend.row().data!.world!.inventory.snack).toBe(1)
 expect(backend.row().data!.world!.coins).toBe(285)
})
