import {test,expect} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
const at=Date.parse('2026-11-09T03:00:00Z')
test('three aura layers, precise chance and zero-stone costs render on both screens without local rolls',async({page},info)=>{
 const s=freshWorld(at);s.world!.coins=1000000;s.world!.equipment={version:1,stones:0,instances:[10,20,30].map((enhancement,i)=>({id:`a${i}`,itemId:'gear-crystal-compass',regionId:'mine',foundAt:at,enhancement,...(i===0?{failures:3,equippedBy:'momo'}:{})}))}
 await page.addInitScript(s=>{if(!sessionStorage.getItem('enhance-seed')){localStorage.setItem('pocket-friends-v1',JSON.stringify(s));sessionStorage.setItem('enhance-seed','1')}},s);await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'인벤토리',exact:true}).click();await page.getByRole('button',{name:'장비',exact:true}).click()
 await expect(page.getByTestId('gear-a0')).toHaveClass(/enhance-blue/);await expect(page.getByTestId('gear-a1')).toHaveClass(/enhance-purple/);await expect(page.getByTestId('gear-a2')).toHaveClass(/enhance-gold/)
 await page.getByTestId('gear-a0').getByRole('button',{name:/강화 상세/}).click();const detail=page.getByRole('region',{name:'장비 강화 상세'});await expect(detail).toContainText('최종 성공 확률 51%');await expect(detail).toContainText('강화석 0개');await expect(detail.getByRole('button',{name:'공유 월드에서 강화 가능'})).toBeDisabled();await page.screenshot({path:`/tmp/pocket-enhance-${info.project.name}.png`,fullPage:true});expect(await page.evaluate(()=>document.body.scrollWidth>innerWidth)).toBe(false)
 await page.reload();const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(data.world.equipment).toEqual(s.world!.equipment);expect(data.world.coins).toBe(1000000)
})
