import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {lifeCommand} from '../src/expansion/model'
import {grantSpecialFriends} from '../src/humans/model'
test.skip(({isMobile})=>!isMobile,'Approved animal art uses mobile portrait checks')
const at=Date.parse('2026-11-20T03:00:00Z')
async function seed(page:Page,photo?:string){
 const save=freshWorld(at);save.world!.coins=60000;save.world!.inventory={cake:3,snack:7}
 for(const id of ['lulu','toto','byeol','mungchi'])lifeCommand(save,{type:'adopt',id},at)
 save.world!.expansion!.placements=[{id:'preserved-plant',itemId:'plant',x:530,y:390,layer:2}]
 save.world!.expansion!.hamsters=[{id:'kept-hamster',foundAt:at,regionId:'forest',deployed:true,x:490,y:430}]
 // A returning household: introductory adoption notices were already read.
 grantSpecialFriends(save,at)
 save.world!.expansion!.seen=Object.keys(save.world!.book).concat('kept-hamster')
 for(const f of save.friends){f.restingUntil=at+60000;f.route=[];f.moving=false;f.bubble='';f.bubbleUntil=0;f.nextSpeech=at+120000;if(f.growth)f.growth.events=[]}
 if(photo)save.friends[0].photo=photo
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000))
 await page.addInitScript(s=>{if(!localStorage.getItem('pocket-friends-v1'))localStorage.setItem('pocket-friends-v1',JSON.stringify(s))},save)
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible()
 return save
}
test('approved A art renders for all saved animals and hamster, keeps people/data, and fits four portrait sizes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 const original=await seed(page)
 await expect(page.locator('.room-friend .animal-art')).toHaveCount(8)
 await expect(page.locator('.room-hamster .animal-art')).toHaveCount(1)
 const sources=await page.locator('.room-friend .animal-art,.room-hamster .animal-art').evaluateAll(es=>es.map(el=>el.getAttribute('data-art-source')))
 expect(new Set(sources).size).toBe(9)
 for(const id of ['momo','bibi','coco','dudu','lulu','toto','byeol','mungchi'])await expect(page.getByTestId('room-'+id).locator('.animal-art')).toHaveAttribute('data-art-set','plush-A-20261120')
 const humans=await page.locator('.room-friend .human-art').evaluateAll(es=>es.map(el=>el.getAttribute('data-art-source')))
 for(const size of [{width:360,height:800},{width:375,height:812},{width:390,height:844},{width:412,height:915}]){
  await page.setViewportSize(size);await page.getByTestId('room-momo').scrollIntoViewIfNeeded();await page.clock.runFor(300)
  await expect(page.getByTestId('room-momo').locator('.animal-art')).toHaveAttribute('data-art-ready','true')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
  await page.locator('.room-panel').screenshot({path:`docs/screenshots/plush-A-room-${size.width}x${size.height}.png`})
 }
 await page.reload();await expect(page.getByTestId('room-momo')).toBeVisible();await page.clock.runFor(200)
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))
 expect(saved.world.coins).toBe(original.world!.coins);expect(saved.world.inventory).toEqual(original.world!.inventory)
 expect(saved.world.expansion.placements).toEqual(original.world!.expansion!.placements)
 expect(saved.world.expansion.hamsters).toEqual(original.world!.expansion!.hamsters)
 for(const f of original.friends){const kept=saved.friends.find((v:{id:string})=>v.id===f.id);expect(kept).toMatchObject({id:f.id,name:f.name,kind:f.kind,color:f.color});for(const [stat,value] of Object.entries(f.stats))expect(Math.abs(kept.stats[stat]-value)).toBeLessThan(0.1)}
 expect(await page.locator('.room-friend .human-art').evaluateAll(es=>es.map(el=>el.getAttribute('data-art-source')))).toEqual(humans)
 expect(errors).toEqual([])
})
test('personal photo takes precedence over A art and remains unchanged after reload',async({page})=>{
 const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=16;c.getContext('2d')!.fillRect(0,0,16,16);return c.toDataURL()})
 await seed(page,photo)
 const actor=page.getByTestId('room-momo')
 await expect(actor.locator('.animal-art')).toHaveCount(0);await expect(actor.getByRole('img',{name:'모모의 등록 사진'})).toHaveAttribute('src',photo)
 await page.reload();await expect(actor.getByRole('img',{name:'모모의 등록 사진'})).toHaveAttribute('src',photo)
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!).friends[0].photo)).toBe(photo)
})
test('failed animation downloads leave the approved standing art visible without retry loops',async({page})=>{
 let failed=0
 await page.route(/\/(?:plush-A\/momo\/[^/]+-atlas|directional\/momo)\.webp(?:\?.*)?$/,route=>{if(route.request().resourceType()!=='image')return route.continue();failed++;return route.fulfill({status:503,body:'unavailable'})})
 await seed(page)
 const art=page.getByTestId('room-momo').locator('.animal-art')
 await art.scrollIntoViewIfNeeded();await expect(art).toHaveAttribute('data-art-error','true')
 await expect(art.locator('.animal-static')).toHaveCSS('opacity','1')
 expect(await art.locator('.animal-static').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('/plush-A/momo/idle.webp')
 await page.clock.runFor(3000);expect(failed).toBe(2)
 await expect(art.locator('.animal-walk')).toHaveCSS('opacity','0')
})
