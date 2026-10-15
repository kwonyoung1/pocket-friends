import { expect, test } from '@playwright/test'
import { createFriends } from '../src/game'
import type { Save } from '../src/game'
import { world } from '../src/progression/model'
import { grantSpecialFriends } from '../src/humans/model'
const epoch = Date.parse('2026-10-15T03:00:00Z')
function fixture(): Save { const s:Save={version:2,savedAt:epoch,friends:createFriends(epoch),memories:[]};world(s,epoch);grantSpecialFriends(s,epoch);return s }
async function seed(page: import('@playwright/test').Page,s:Save) {
 await page.clock.install({time:new Date(epoch)})
 await page.clock.pauseAt(new Date(epoch+1000))
 await page.addInitScript(s=>{if(!sessionStorage.getItem('care-seeded')){localStorage.setItem('pocket-friends-v1',JSON.stringify(s));sessionStorage.setItem('care-seeded','1')}},s)
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();await page.clock.runFor(100)
}
test('only fixed special IDs speak ambiently after renaming, while quiet friends still react to touch',async({page})=>{
 // Isolate the ambient scheduler from randomly initiated conversations.
 await page.addInitScript(()=>{Math.random=()=>.99})
 const s=fixture();s.friends[4].name='영이';s.friends[5].name='찬미';s.friends.forEach(f=>{f.nextSpeech=epoch+20000;f.socialAfter=epoch+999999})
 await seed(page,s);await page.clock.runFor(30000)
 for(const id of ['momo','bibi','coco','dudu'])await expect(page.getByTestId(`room-${id}`).locator('.speech')).toHaveCount(0)
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))
 expect(saved.friends.filter((f:{id:string})=>f.id.startsWith('special-')).every((f:{bubble:string})=>/[가-힣]/.test(f.bubble)), JSON.stringify(saved.friends.map((f:{id:string;bubble:string;nextSpeech:number})=>({id:f.id,bubble:f.bubble,next:f.nextSpeech,saved:saved.savedAt})))).toBe(true)
 await page.getByTestId('room-momo').dispatchEvent('click',{detail:0})
 await expect(page.getByTestId('room-momo').locator('.speech')).toBeVisible()
 await expect(page.getByTestId('room-momo').locator('.pet-heart')).not.toHaveCount(0)
 await page.getByRole('button',{name:'영이 상태 확인'}).click()
 await expect(page.getByRole('complementary').getByText('✦ 특별 친구')).toBeVisible()
})
test('low stats show food, bath and fatigue care overlays without overflowing mobile',async({page})=>{
 const s=fixture();s.friends[0].stats.hunger=5;s.friends[0].stats.hygiene=10;s.friends[0].stats.energy=20
 await seed(page,s)
 const actor=page.getByTestId('room-momo')
 await expect(actor.getByRole('img',{name:'음식이 필요해요'})).toBeVisible()
 await expect(actor.getByRole('img',{name:'목욕이 필요해요'})).toBeVisible()
 await expect(actor.getByRole('img',{name:'휴식이 필요해요'})).toBeVisible()
 await expect(actor.locator('.care-dust i')).toHaveCount(5)
 await expect(actor.locator('[data-expression=closed]')).toHaveCount(1)
 await expect(actor.locator('.speech')).toContainText(/밥|배|꼬르륵/)
 await page.getByRole('button',{name:'모모 상태 확인'}).click()
 await expect(page.getByTestId('care-needs')).toContainText('음식이 필요해요')
 await expect(page.getByTestId('care-needs')).toContainText('목욕이 필요해요')
 expect(await page.evaluate(()=>document.body.scrollWidth>innerWidth)).toBe(false)
 await page.screenshot({path:`/tmp/pocket-care-needs-${test.info().project.name}.png`,fullPage:true})
})
test('six-hour reward status persists through reload and repeated visual pets never add XP',async({page})=>{
 const s=fixture();s.friends[0].stats.happiness=40
 await seed(page,s)
 await expect(page.getByTestId('pet-reward-status')).toHaveText('쓰다듬기 보상 가능!')
 const actor=page.getByTestId('room-momo')
 await actor.dispatchEvent('click',{detail:0})
 await expect(page.getByTestId('pet-reward-status')).toContainText('6시간 0분')
 for(let i=0;i<3;i++)await actor.dispatchEvent('click',{detail:0})
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!).friends[0])
 const first=await read();expect(first.stats.affection).toBe(21);expect(first.growth.xp).toBe(1)
 await page.reload();await actor.dispatchEvent('click',{detail:0})
 const restored=await read();expect(restored.stats.affection).toBe(21);expect(restored.growth.xp).toBe(1)
 expect(restored.lastPetRewardAt).toBe(first.lastPetRewardAt)
 await page.clock.setSystemTime(epoch+6*3600000+2000);await page.clock.runFor(100)
 await expect(page.getByTestId('pet-reward-status')).toHaveText('쓰다듬기 보상 가능!')
 await actor.dispatchEvent('click',{detail:0})
 const rewarded=await read();expect(rewarded.stats.affection).toBe(22);expect(rewarded.growth.xp).toBe(2)
})
