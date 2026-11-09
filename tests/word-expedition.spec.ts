import {test,expect} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {wordCommand} from '../src/words/model'
const at=Date.parse('2026-11-09T03:00:00Z')
test('retired word menus stay absent while old quiz and notebook records survive reload',async({page})=>{
 const s=freshWorld(at);wordCommand(s,{type:'word-start',mode:'reward'},at,()=>.5);const words=structuredClone(s.world!.words)
 await page.addInitScript(s=>{if(!sessionStorage.getItem('word-archive-seeded')){localStorage.setItem('pocket-friends-v1',JSON.stringify(s));sessionStorage.setItem('word-archive-seeded','1')}},s)
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();await expect(page.getByRole('button',{name:/영단어 탐험|오답 노트/})).toHaveCount(0);await expect(page.locator('.word-expedition')).toHaveCount(0)
 await page.reload();await expect(page.getByTestId('room-momo')).toBeVisible();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(saved.world.words).toEqual(words);expect(saved.world.coins).toBe(s.world!.coins)
})
