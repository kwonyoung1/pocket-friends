import {test,expect} from '@playwright/test'
import {swap,idle} from './match3-input'
test('production gems, GPU bursts, pause and disposal keep confirmed scoring intact',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/tests/fixtures/match3.html?case=rainbow')
 await expect(page.locator('.tm-effects')).toHaveAttribute('data-renderer','pixi')
 const images=page.locator('.tm-gem image');await expect(images).toHaveCount(64)
 const source=await images.first().getAttribute('href');expect(source).toContain('/effects-lab/assets/gem-');expect((await page.request.get(source!)).ok()).toBe(true)
 await swap(page,27,28);await expect(page.locator('.tm-effects')).toHaveAttribute('data-particles',/^[1-9]\d*$/)
 await idle(page);const score=await page.getByLabel('현재 점수').getAttribute('data-score');expect(Number(score)).toBeGreaterThanOrEqual(3200)
 await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();await page.waitForTimeout(100);const particles=await page.locator('.tm-effects').getAttribute('data-particles');await page.waitForTimeout(200);expect(await page.locator('.tm-effects').getAttribute('data-particles')).toBe(particles)
 await page.getByRole('button',{name:'계속하기',exact:true}).click();expect(await page.getByLabel('현재 점수').getAttribute('data-score')).toBe(score)
 await page.getByLabel('이펙트 강도').selectOption('low');await expect(page.locator('.tm-effects')).toHaveAttribute('data-renderer','canvas')
 await page.getByLabel('이펙트 강도').selectOption('strong');await expect(page.locator('.tm-effects')).toHaveAttribute('data-renderer','pixi')
 await page.locator('.tm-effects').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost')));await expect(page.locator('.tm-effects')).toHaveAttribute('data-renderer','canvas')
 await page.getByRole('button',{name:'보물 3매치 종료',exact:true}).click();await page.getByRole('button',{name:'거실로 돌아가기',exact:true}).click();await expect(page.locator('.tm-effects')).toHaveCount(0);await page.waitForTimeout(100);expect(errors).toEqual([])
})
test('reduced motion keeps Canvas and the same accessible input board',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/tests/fixtures/match3.html?case=rainbow');await expect(page.getByRole('gridcell')).toHaveCount(64);await expect(page.locator('.tm-effects')).toHaveAttribute('data-renderer','canvas');await swap(page,27,28);await idle(page);expect(Number(await page.getByLabel('현재 점수').getAttribute('data-score'))).toBeGreaterThanOrEqual(3200)
})
