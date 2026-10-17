import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {life} from '../src/expansion/model'
import {sichuanCommand} from '../src/sichuan/model'
import {path} from '../src/sichuan/board'
const epoch=Date.parse('2026-10-17T03:00:00Z')
async function seed(page:Page,s=freshWorld(epoch)){
 await page.clock.install({time:new Date(epoch)});await page.clock.pauseAt(new Date(epoch+1000))
 await page.addInitScript(s=>{if(!sessionStorage.getItem('seed-care-effects')){localStorage.setItem('pocket-friends-v1',JSON.stringify(s));sessionStorage.setItem('seed-care-effects','yes')}},s)
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible()
}
const snapshot=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))
async function tap(page:Page,i:number){const tile=page.locator(`.sichuan-board button[data-index="${i}"]`);await tile.scrollIntoViewIfNeeded();if(test.info().project.name==='mobile'){const b=(await tile.boundingBox())!;await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2)}else await tile.click()}
test('a previous three-use bath day allows the fourth, shows exact seconds, survives reload and disables the fifth',async({page})=>{
 const s=freshWorld(epoch);life(s.friends[0],epoch).bathCount=3;await seed(page,s)
 await page.getByRole('button',{name:'모모 상태 확인'}).click()
 await page.getByRole('button',{name:/씻기 \(3\/4\)/}).click();const dialog=page.getByRole('dialog',{name:'생활과 새 식구'})
 await dialog.getByRole('button',{name:'씻기 (3/4)',exact:true}).click();await expect(dialog.getByRole('button',{name:'씻기 (4/4)',exact:true})).toBeDisabled()
 await page.clock.runFor(1000);await expect(dialog).toContainText('29분 59초');await expect(dialog).toContainText('오늘은 충분히 씻었어요! 내일 다시 씻겨 주세요 🛁')
 await page.reload();await page.getByRole('button',{name:'생활·입양'}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'씻기 (4/4)',exact:true})).toBeDisabled();expect((await snapshot(page)).friends[0].life.bathCount).toBe(4)
})
test('legal outside path draws first, the two tiles pop once, sparkles stay inside the frame and time keeps moving',async({page})=>{
 const s=freshWorld(epoch);sichuanCommand(s,{type:'sichuan-start',mode:'adventure'},'local-player',epoch)
 const r=s.world!.sichuan!.adventure!;r.board.tiles=[1,2,1,3,4,5,2,3,4,5,6,6,7,7,8,8,9,9]
 await seed(page,s);await page.getByRole('button',{name:'사천성',exact:true}).click();await tap(page,0);await tap(page,2)
 const overlay=page.getByTestId('match-overlay');await expect(overlay).toBeVisible();expect(JSON.parse((await overlay.getAttribute('data-grid-path'))!)).toEqual(path(r.board,0,2))
 await expect(page.locator('.tile-popping')).toHaveCount(2);await expect(page.getByRole('button',{name:'힌트 (3/3)'})).toBeDisabled();await expect(page.locator('.match-burst path')).toHaveCount(12)
 const fits=await overlay.evaluate(el=>{const rect=el.getBoundingClientRect();return Array.from(el.querySelector('polyline')!.points).every(p=>p.x>=0&&p.y>=0&&p.x<=rect.width&&p.y<=rect.height)})
 expect(fits).toBe(true)
 await page.locator('.sichuan-board button[data-index="0"]').dispatchEvent('click',{detail:0});await page.clock.runFor(500)
 await expect(overlay).toHaveCount(0);await expect(page.locator('.tile-popping')).toHaveCount(0)
 const data=await snapshot(page);expect(data.world.sichuan.adventure.turn).toBe(1);expect(data.world.sichuan.adventure.board.tiles.filter(Boolean)).toHaveLength(16);expect(data.world.coins).toBe(300)
 await expect(page.getByLabel('남은 시간')).not.toHaveText('00:59.00');expect(data.world.sichuan.adventure.stageEndsAt).toBe(epoch+60000)
 await page.screenshot({path:`/tmp/pocket-effects-board-${test.info().project.name}.png`,fullPage:true})
})
test('confirmed 3/5/10-match combos show Nice Great Perfect, a wrong pair resets it and no coins are granted',async({page})=>{
 const s=freshWorld(epoch);sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:'정원친구'},'local-player',epoch)
 s.world!.sichuan!.competitions['local-player'].board.tiles=Array.from({length:64},(_,i)=>Math.floor(i/2)%20+1)
 await seed(page,s);await page.getByRole('button',{name:'사천성',exact:true}).click();await page.getByRole('button',{name:'경쟁모드',exact:true}).click()
 for(let i=0;i<10;i++){await tap(page,2*i);await tap(page,2*i+1);await page.clock.runFor(500);if([2,4,9].includes(i))await expect(page.locator('.sichuan-combo')).toHaveText(i===2?'Nice!':i===4?'Great!':'Perfect!')}
 await tap(page,20);await tap(page,22);await expect(page.locator('.sichuan-combo')).toHaveCount(0)
 expect((await snapshot(page)).world.coins).toBe(300)
})
test('competition has one manual shuffle, refill after restart, and reduced motion keeps the route without particle animation',async({page})=>{
 await seed(page);await page.getByRole('button',{name:'사천성',exact:true}).click();await page.getByRole('button',{name:'경쟁모드',exact:true}).click();await page.getByRole('button',{name:'경쟁 시작',exact:true}).click()
 await page.getByRole('button',{name:'섞기 (1/1)'}).click();await page.clock.runFor(600);await expect(page.getByRole('button',{name:'섞기 (0/1)'})).toBeDisabled()
 await page.getByRole('button',{name:'새 보드로 다시 시작'}).click();await page.getByRole('button',{name:'종료 확정'}).click();await expect(page.getByRole('button',{name:'섞기 (1/1)'})).toBeEnabled()
 await page.emulateMedia({reducedMotion:'reduce'});const {pair}=await import('../src/sichuan/board'),r=(await snapshot(page)).world.sichuan.competitions['local-player'],found=pair(r.board)!
 await tap(page,found[0]);await tap(page,found[1]);await expect(page.getByTestId('match-overlay')).toBeVisible()
 expect(await page.locator('.match-line').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');expect(await page.locator('.match-burst').first().evaluate(el=>getComputedStyle(el).display)).toBe('none');await page.clock.runFor(500)
})
test('pastel need icons appear one at a time, avoid the speech bubble, cycle to hygiene and stop immediately after recovery',async({page})=>{
 const s=freshWorld(epoch);for(const f of s.friends)f.stateEmotion={nextAt:epoch+999999,cycle:[],variant:0}
 const f=s.friends[0];f.stats.hunger=5;f.stats.hygiene=5;f.stateEmotion={nextAt:epoch+121000,cycle:['hunger'],lastKind:'hunger',variant:0,active:{kind:'hunger',at:epoch+1000,until:epoch+2800,variant:0}}
 await seed(page,s);await page.clock.runFor(100);const actor=page.getByTestId('room-momo')
 await expect(actor.locator('.state-emote')).toHaveCount(1);await expect(actor.getByRole('img',{name:'음식이 필요해요'})).toBeVisible();await expect(actor.locator('.pastel-emotion')).toBeVisible()
 const icon=await actor.locator('.state-emote').boundingBox(),bubble=await actor.locator('.speech').boundingBox();expect(icon!.y).toBeGreaterThan(bubble!.y+bubble!.height)
 await page.clock.fastForward(120000);await page.clock.runFor(100)
 await expect(actor.getByRole('img',{name:'목욕이 필요해요'})).toBeVisible();await expect(actor.locator('.care-dust i')).toHaveCount(5);await expect(actor.getByRole('img',{name:'음식이 필요해요'})).toHaveCount(0)
 await page.screenshot({path:`/tmp/pocket-effects-emotion-${test.info().project.name}.png`,fullPage:true})
 await page.getByRole('button',{name:'모모 상태 확인'}).click();await page.getByRole('button',{name:/씻기 \(0\/4\)/}).click();await page.getByRole('dialog',{name:'생활과 새 식구'}).getByRole('button',{name:'씻기 (0/4)',exact:true}).click();await page.clock.runFor(100)
 await expect(actor.locator('.state-emote')).toHaveCount(0)
 await page.getByRole('button',{name:'생활 메뉴 닫기'}).click();await page.clock.fastForward(1800000);await page.clock.runFor(5100)
 await expect(actor.locator('[data-emotion=hygiene]')).toHaveCount(0);expect((await snapshot(page)).friends[0].stats.hygiene).toBeGreaterThan(30)

})
