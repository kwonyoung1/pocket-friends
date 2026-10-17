import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {sichuanCommand} from '../src/sichuan/model'
import {pair} from '../src/sichuan/board'
import type {Board} from '../src/sichuan/board'
const epoch=Date.parse('2026-10-17T03:00:00Z')
async function seed(page:Page,data=freshWorld(epoch)){
 await page.clock.install({time:new Date(epoch)});await page.clock.pauseAt(new Date(epoch+1000))
 await page.addInitScript(s=>{if(!sessionStorage.getItem('seed-sichuan')){localStorage.setItem('pocket-friends-v1',JSON.stringify(s));sessionStorage.setItem('seed-sichuan','yes')}},data)
 await page.goto('/');await page.getByRole('button',{name:'사천성',exact:true}).click();await expect(page.getByRole('dialog',{name:'사천성 미니게임'})).toBeVisible()
}
const snapshot=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))
async function tap(page:Page,index:number){const b=page.locator(`.sichuan-board button[data-index="${index}"]`);if(test.info().project.name==='mobile'){await b.scrollIntoViewIfNeeded();const box=await b.boundingBox();await page.touchscreen.tap(box!.x+box!.width/2,box!.y+box!.height/2)}else await b.click()}
async function board(page:Page):Promise<Board>{return page.getByTestId('sichuan-board').evaluate(el=>{const cols=el.getAttribute('aria-label')!.split(' × ');return{width:Number(cols[0]),height:Number(cols[1].split(' ')[0]),tiles:Array.from(el.querySelectorAll('button')).map(n=>Number(n.getAttribute('data-tile')))}})}
test('exploration restores the board, timer and cooldown, hints highlight legal pairs, mobile touches do not scroll',async({page})=>{
 await seed(page);await page.getByRole('button',{name:'사천성 탐험 시작'}).click();await expect(page.locator('.sichuan-board button')).toHaveCount(18)
 const original=await board(page);await expect(page.getByLabel('남은 시간')).toHaveText('01:00.00')
 await page.getByRole('button',{name:'힌트 (3/3)'}).click();await expect(page.locator('.sichuan-board .hint')).toHaveCount(2)
 const legal=pair(original)!,before=await page.getByRole('dialog').evaluate(el=>el.scrollTop)
 await tap(page,legal[0]);await tap(page,legal[1]);await page.clock.runFor(600)
 expect((await board(page)).tiles.filter(Boolean)).toHaveLength(16);expect(await page.getByRole('dialog').evaluate(el=>el.scrollTop)).toBe(before)
 expect(await page.getByTestId('sichuan-board').evaluate(el=>getComputedStyle(el).touchAction)).toBe('none')
 await page.clock.runFor(9400);const saved=await snapshot(page),coins=saved.world.coins
 await page.reload();await page.getByRole('button',{name:'사천성',exact:true}).click();expect((await board(page)).tiles).toEqual(saved.world.sichuan.adventure.board.tiles)
 await expect(page.getByLabel('남은 시간')).toHaveText('00:50.00');await page.clock.fastForward(50001)
 await expect(page.getByTestId('sichuan-reward')).toContainText('0코인');expect((await snapshot(page)).world.coins).toBe(coins);await expect(page.getByRole('button',{name:'사천성 탐험 시작'})).toBeDisabled()
 await page.getByRole('button',{name:'경쟁모드',exact:true}).click();await page.getByRole('button',{name:'경쟁 시작',exact:true}).click();await expect(page.locator('.sichuan-board button')).toHaveCount(64)
 await page.getByRole('button',{name:'사천성 닫기'}).click();await expect(page.getByRole('dialog',{name:'사천성 미니게임'})).toHaveCount(0)
 expect(await page.locator('body').evaluate(el=>getComputedStyle(el).touchAction)).not.toBe('none')
})
test('a cleared stage can continue then timeout or stop with its last reward paid once',async({page})=>{
 const s=freshWorld(epoch);sichuanCommand(s,{type:'sichuan-start',mode:'adventure'},'local-player',epoch);s.world!.sichuan!.adventure!.board.tiles=s.world!.sichuan!.adventure!.board.tiles.map((_,i)=>i<2?1:0)
 await seed(page,s);await tap(page,0);await tap(page,1);await expect(page.getByRole('button',{name:'보상 받고 멈추기'})).toBeVisible()
 await page.getByRole('button',{name:'다음 단계 도전하기'}).click();await expect(page.locator('.sichuan-board button')).toHaveCount(36);await expect(page.getByLabel('남은 시간')).toHaveText('02:00.00')
 await page.getByRole('button',{name:'그만하기',exact:true}).click();await expect(page.getByRole('alertdialog')).toContainText('60코인');await page.getByRole('button',{name:'계속하기',exact:true}).click();expect((await snapshot(page)).world.coins).toBe(300)
 await page.clock.fastForward(120001);await expect(page.getByTestId('sichuan-reward')).toContainText('60코인');expect((await snapshot(page)).world.coins).toBe(360)
 await page.reload();await page.getByRole('button',{name:'사천성',exact:true}).click();await expect(page.getByTestId('sichuan-reward')).toContainText('60코인');expect((await snapshot(page)).world.coins).toBe(360)
})
test('competition plays an entire random 8x8 board, freezes time, displays one best and restarts',async({page})=>{
 await seed(page);await page.getByRole('button',{name:'경쟁모드',exact:true}).click();await page.getByLabel('사천성 닉네임').fill('찬미');await page.getByRole('button',{name:'경쟁 시작',exact:true}).click()
 const first=await board(page)
 for(let i=0;i<32;i++){
  const b=await board(page),found=pair(b);expect(found).not.toBeNull();await tap(page,found![0]);await tap(page,found![1]);await page.clock.runFor(600);if(i<31)expect((await board(page)).tiles.filter(Boolean)).toHaveLength(64-(i+1)*2)
 }
 await expect(page.getByText('🎉 경쟁모드 완료!')).toBeVisible();const saved=await snapshot(page),record=saved.world.sichuan.bests[0]
 expect(saved.world.coins).toBe(300);expect(record.nickname).toBe('찬미');expect(record.elapsedMs).toBeGreaterThanOrEqual(31*600);expect(record.elapsedMs).toBeLessThan(32*600)
 await page.clock.runFor(10000);expect((await snapshot(page)).world.sichuan.bests[0].elapsedMs).toBe(record.elapsedMs)
 await page.getByRole('button',{name:'경쟁 시작',exact:true}).click();expect((await board(page)).tiles).not.toEqual(first.tiles)
 await page.screenshot({path:`/tmp/pocket-sichuan-${test.info().project.name}.png`,fullPage:true})
})
test('automatic deadlock shuffle blocks input, preserves manual count and clears hints',async({page})=>{
 const s=freshWorld(epoch);sichuanCommand(s,{type:'sichuan-start',mode:'adventure'},'local-player',epoch)
 const r=s.world!.sichuan!.adventure!;r.board={width:4,height:5,tiles:[1,2,3,4,3,4,1,2,2,1,4,3,4,3,2,1,5,5,0,0]};r.hint=[16,17]
 await seed(page,s);await tap(page,16);await tap(page,17);await expect(page.getByRole('dialog',{name:'사천성 미니게임'}).getByText('연결할 수 있는 패가 없어 자동으로 섞었어요!',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'섞기 (3/3)'})).toBeDisabled();await expect(page.locator('.sichuan-board .hint')).toHaveCount(0)
 await page.clock.runFor(600);await expect(page.getByRole('button',{name:'섞기 (3/3)'})).toBeEnabled();expect(pair(await board(page))).not.toBeNull()
})
test('largest 12x10 board fits portrait and landscape and maintains readable nonoverlapping tiles',async({page})=>{
 const s=freshWorld(epoch);sichuanCommand(s,{type:'sichuan-start',mode:'adventure'},'local-player',epoch)
 const {createBoard}=await import('../src/sichuan/board'),r=s.world!.sichuan!.adventure!;r.stage=5;r.completed=4;r.board=createBoard(5);r.stageEndsAt=epoch+300000
 await seed(page,s)
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await expect(page.locator('.sichuan-board button')).toHaveCount(120)
  const dims=await page.getByTestId('sichuan-board').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth,touch:getComputedStyle(el).touchAction,font:parseFloat(getComputedStyle(el.querySelector('button')!).fontSize)}))
  expect(dims.scroll).toBeLessThanOrEqual(dims.width);expect(dims.touch).toBe('none');expect(dims.font).toBeGreaterThanOrEqual(14)
  expect(await page.evaluate(()=>document.body.scrollWidth>document.documentElement.clientWidth)).toBe(false)
 }
})
