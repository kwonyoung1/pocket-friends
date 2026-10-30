import {test,expect} from '@playwright/test'
import {nextMove,swap,idle,currentBoard} from './match3-input'
import {moves,validMove} from '../src/match3/engine'
import {recordKey} from '../src/match3/records'
test('entry, distinct SVG shapes, free hint, click swap and return preserve the original world',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();const raw=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))
 await page.getByRole('button',{name:'💎 보물 3매치',exact:true}).click();await page.getByRole('button',{name:'스테이지 모드 시작',exact:true}).click();await expect(page.getByRole('gridcell')).toHaveCount(64);const bounds=await page.getByRole('grid').boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
 expect(await page.locator('symbol').count()).toBe(7);await page.getByRole('button',{name:'✦ 힌트',exact:true}).click();await expect(page.locator('.hinted')).toHaveCount(2)
 const m=await nextMove(page);await swap(page,m.a,m.b);await idle(page);await expect(page.getByTestId('match3-moves')).toHaveText('24');expect(Number(await page.getByLabel('현재 점수').getAttribute('data-score'))).toBeGreaterThan(0)
 await page.screenshot({path:`/tmp/pocket-match3-${info.project.name}.png`,fullPage:true});await page.getByRole('button',{name:'보물 3매치 종료',exact:true}).click();await page.getByRole('button',{name:'거실로 돌아가기',exact:true}).click();await expect(page.getByTestId('room-momo')).toBeVisible()
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(after.world.coins).toBe(raw.world.coins);expect(after.world.inventory).toEqual(raw.world.inventory);expect(after.world.equipment).toEqual(raw.world.equipment);expect(after.friends.map((f:{id:string;photo?:string;name:string})=>[f.id,f.name,f.photo])).toEqual(raw.friends.map((f:{id:string;photo?:string;name:string})=>[f.id,f.name,f.photo]));expect(errors).toEqual([])
 await page.getByRole('button',{name:'사천성',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible()
})
test('invalid swap returns untouched, touch swipe works, rapid input cannot spend more than one move',async({page})=>{
 await page.goto('/tests/fixtures/match3.html?case=invalid');await expect(page.getByRole('gridcell')).toHaveCount(64);const before=await currentBoard(page)
 expect(validMove(before.board,before.ice,0,1)).toBe(false);await swap(page,0,1,true);await idle(page);expect(await currentBoard(page)).toEqual(before);await expect(page.getByTestId('match3-moves')).toHaveText('25')
 const m=moves(before.board,before.ice)[0];await swap(page,m.a,m.b,true);await page.getByRole('gridcell').evaluateAll(els=>{for(let i=0;i<20;i++)(els[i] as HTMLElement).click()});await idle(page);await expect(page.getByTestId('match3-moves')).toHaveText('24')
})
test('pause freezes a live chain, resume completes it, record and stage unlock survive reload',async({page})=>{
 await page.goto('/tests/fixtures/match3.html?case=win');const m=await nextMove(page);await swap(page,m.a,m.b);await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();const score=await page.getByLabel('현재 점수').getAttribute('data-score'),board=await currentBoard(page);await page.waitForTimeout(500);expect(await currentBoard(page)).toEqual(board);expect(await page.getByLabel('현재 점수').getAttribute('data-score')).toBe(score)
 await page.getByRole('button',{name:'계속하기',exact:true}).click();await idle(page);await expect(page.getByRole('button',{name:'다음 스테이지',exact:true})).toBeVisible();const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),recordKey);expect(stored.unlocked).toBe(2);expect(stored.bests[0]).toBeGreaterThanOrEqual(2000)
 await page.reload();await expect(page.getByTestId('match3-best')).toHaveText(stored.bests[0].toLocaleString());await expect(page.getByRole('option',{name:'2',exact:true})).toBeEnabled();await expect(page.getByRole('option',{name:'3 🔒',exact:true})).toHaveJSProperty('disabled',true)
})
test('rainbow whole-board destruction, particles and score popups refill; reduced motion and restart remain usable',async({page})=>{
 await page.goto('/tests/fixtures/match3.html?case=rainbow');await swap(page,27,28);await expect(page.locator('.tm-score-burst')).toBeVisible();await expect(page.locator('.tm-cell-pop')).not.toHaveCount(0);await idle(page);await expect(page.getByRole('gridcell')).toHaveCount(64);expect(Number(await page.getByLabel('현재 점수').getAttribute('data-score'))).toBeGreaterThanOrEqual(3200)
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'↻ 다시 시작',exact:true}).click();await page.getByRole('button',{name:'새 보드로 시작',exact:true}).click();await idle(page);await expect(page.getByTestId('match3-moves')).toHaveText('20')
 await page.getByRole('button',{name:'소리 OFF',exact:true}).click();await expect(page.getByRole('button',{name:'소리 ON',exact:true})).toHaveAttribute('aria-pressed','true')
})
test('keyboard selection and losing a stage support a clean retry',async({page})=>{
 await page.goto('/tests/fixtures/match3.html?case=fail');const m=await nextMove(page);await page.locator(`[data-index="${m.a}"]`).focus();await page.keyboard.press('Enter');await page.keyboard.press(m.b-m.a===1?'ArrowRight':'ArrowDown');await page.keyboard.press('Enter');await idle(page)
 await expect(page.getByRole('grid')).toHaveAttribute('data-status','lost');await page.getByRole('button',{name:'다시 도전',exact:true}).click();await expect(page.getByTestId('match3-moves')).toHaveText('25');await expect(page.getByRole('grid')).toHaveAttribute('data-status','playing')
})
test('cancelled touch does not leave a held gem and native mouse dragging spends one valid move',async({page})=>{
 await page.goto('/tests/fixtures/match3.html?case=invalid');await expect(page.getByRole('gridcell')).toHaveCount(64);const first=await page.locator('[data-index="0"]').boundingBox(),touch=await page.context().newCDPSession(page)
 await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:first!.x+first!.width/2,y:first!.y+first!.height/2,id:1}]});await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await touch.detach();await expect(page.getByTestId('match3-moves')).toHaveText('25')
 const m=await nextMove(page),a=await page.locator(`[data-index="${m.a}"]`).boundingBox(),b=await page.locator(`[data-index="${m.b}"]`).boundingBox();await page.mouse.move(a!.x+a!.width/2,a!.y+a!.height/2);await page.mouse.down();await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2,{steps:4});await page.mouse.up();await idle(page);await expect(page.getByTestId('match3-moves')).toHaveText('24')
})
