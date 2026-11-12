import {expect} from '@playwright/test'
import {test} from './fixture'
import {freshWorld} from '../src/cloud/engine'
test('Christmas selection persists through polling, second mobile device, theme switching and reload without touching possessions',async({page,backend,browser})=>{
 const s=freshWorld(Date.parse('2026-10-15T03:00:00Z'));s.world!.coins=7654;s.world!.inventory.cake=3
 const raw=JSON.stringify(s);await page.addInitScript(raw=>localStorage.setItem('pocket-friends-v1',raw),raw)
 const enter=async(p:typeof page)=>{await p.goto('/');await p.getByLabel('접속 비밀번호').fill(backend.secret);await p.getByRole('button',{name:'입장하기',exact:true}).click()}
 await enter(page);await page.getByRole('button',{name:'이 기기 데이터를 기준으로 가져오기',exact:true}).click();await page.getByRole('button',{name:'확인하고 공유 월드 만들기',exact:true}).click();await page.getByRole('button',{name:'이 클라우드 월드 사용하기',exact:true}).click()
 await page.getByLabel('방 테마 선택',{exact:true}).selectOption('winter');await expect.poll(()=>backend.row().data!.world!.roomTheme?.id).toBe('winter');await expect(page.getByTestId('christmas-tree')).toBeVisible()
 const other=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await backend.attach(other)
 try{const second=await other.newPage();await enter(second);await second.getByRole('button',{name:'이 클라우드 월드 사용하기',exact:true}).click();await expect(second.locator('.room')).toHaveAttribute('data-theme','winter');await expect(second.getByTestId('room-scenery')).toHaveAttribute('href',/winter-watercolor/)
 await second.getByLabel('방 테마 선택',{exact:true}).selectOption('halloween');await expect(second.getByTestId('christmas-decor')).toHaveCount(0);await page.getByRole('button',{name:'새로 동기화',exact:true}).click();await expect(page.locator('.room')).toHaveAttribute('data-theme','halloween');await second.getByLabel('방 테마 선택',{exact:true}).selectOption('winter');await expect.poll(()=>backend.row().data!.world!.roomTheme?.id).toBe('winter');await second.reload();await second.getByRole('button',{name:'이 클라우드 월드 사용하기',exact:true}).click();await expect(second.getByTestId('christmas-tree')).toBeVisible();await page.getByRole('button',{name:'새로 동기화',exact:true}).click();await expect(page.locator('.room')).toHaveAttribute('data-theme','winter');expect(backend.row().data!.world!.coins).toBe(7654);expect(backend.row().data!.world!.inventory.cake).toBe(3);expect(await page.evaluate(()=>localStorage.getItem('pocket-friends-v1'))).toBe(raw)
 }finally{await other.close()}
})
