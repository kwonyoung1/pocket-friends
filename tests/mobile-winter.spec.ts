import {test,expect} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import type {Page} from '@playwright/test'
test.skip(({isMobile})=>!isMobile,'Mobile portrait and touch only; no desktop design checks')
const at=Date.parse('2026-11-10T03:00:00Z')
async function seed(page:Page,randomSeed?:number){if(randomSeed!==undefined)await page.addInitScript(seed=>{let n=seed;Math.random=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296}},randomSeed);const s=freshWorld(at);s.world!.coins=5432;s.world!.inventory.cake=2;await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000));await page.addInitScript(s=>{if(!sessionStorage.getItem('winter-seeded')){localStorage.setItem('pocket-friends-v1',JSON.stringify(s));sessionStorage.setItem('winter-seeded','yes')}},s);await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();return s}
test('winter fits four portrait sizes, clips bounded snowfall to the window and preserves saves',async({page})=>{
 const initial=await seed(page);await expect(page.locator('.room')).toHaveAttribute('data-theme','default');await page.getByLabel('방 테마 선택',{exact:true}).selectOption('winter');await expect(page.locator('.room')).toHaveAttribute('data-theme','winter')
 for(const viewport of [{width:360,height:800},{width:375,height:812},{width:390,height:844},{width:412,height:915}]){await page.setViewportSize(viewport);await page.getByLabel('방 테마 선택',{exact:true}).scrollIntoViewIfNeeded();await page.clock.runFor(150);expect(await page.evaluate(()=>document.body.scrollWidth>innerWidth)).toBe(false);const select=await page.getByLabel('방 테마 선택',{exact:true}).boundingBox();expect(select!.height).toBeGreaterThanOrEqual(44);const buttons=await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect()));for(const b of buttons){expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44)}const target=page.getByRole('button',{name:'💎 보물 3매치',exact:true});await target.hover();await expect(target).toHaveCSS('transform','none');await expect(target).toHaveCSS('translate','none');await page.evaluate(()=>scrollTo({top:450,behavior:'instant'}));const navRect=await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).boundingBox(),roomRect=await page.locator('.room-viewport').boundingBox();expect(navRect!.y+navRect!.height).toBeLessThanOrEqual(roomRect!.y)}
 const clip=page.getByTestId('winter-window-clip');expect(await clip.getAttribute('clip-path')).toMatch(/^url\(#winter-window-/);const rects=await page.locator('clipPath[id^=winter-window] rect').evaluateAll(es=>es.map(e=>({x:Number(e.getAttribute('x')),y:Number(e.getAttribute('y')),w:Number(e.getAttribute('width')),h:Number(e.getAttribute('height'))})));expect(rects).toHaveLength(4);for(const r of rects){expect(r.x).toBeGreaterThan(350);expect(r.x+r.w).toBeLessThanOrEqual(627);expect(r.y+r.h).toBeLessThanOrEqual(161)}expect(await page.locator('.winter-snow').count()).toBeLessThanOrEqual(8)
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(100);await expect(page.locator('.winter-snow')).toHaveCount(0);await page.reload();await expect(page.locator('.room')).toHaveAttribute('data-theme','winter');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(saved.world.coins).toBe(initial.world!.coins);expect(saved.world.inventory).toEqual(initial.world!.inventory);expect(saved.friends.slice(0,4).map((f:{id:string;name:string})=>[f.id,f.name])).toEqual(initial.friends.map(f=>[f.id,f.name]));await page.getByLabel('방 테마 선택',{exact:true}).selectOption('halloween');await expect(page.getByTestId('halloween-decor')).toBeVisible();await page.getByLabel('방 테마 선택',{exact:true}).selectOption('default');await expect(page.getByTestId('winter-decor')).toHaveCount(0)
})
test('people use distance-driven strolling frames with stable geometry; animal gait stays intact',async({page})=>{
 await seed(page,42)
 const sources=await page.locator('.room-friend .human-art').evaluateAll(es=>es.map(e=>e.getAttribute('data-art-source')))
 for(const id of ['special-boy','special-girl']){
  const actor=page.getByTestId(`room-${id}`),walk=actor.locator('.human-walk-controller')
  const frames=new Set<string>()
  let activeSamples=0,distance=0,previous:{x:number;y:number}|undefined
  // A first walk may be only a few steps. Observe subsequent bouts too, and
  // keep the actor visible because offscreen animation is deliberately paused.
  for(let sample=0;sample<240&&activeSamples<80;sample++){
   if(await actor.getAttribute('data-moving')!=='true'){await page.clock.fastForward(1000);previous=undefined;continue}
   await actor.scrollIntoViewIfNeeded()
   await expect(walk).toHaveAttribute('data-walk-ready','true')
   await page.clock.runFor(120);activeSamples++
   const current=await actor.evaluate(el=>({moving:el.getAttribute('data-moving')==='true',x:Number(el.getAttribute('data-x')),y:Number(el.getAttribute('data-y')),frame:el.querySelector<HTMLElement>('.human-walk-controller')!.dataset.walkFrame,opacity:Number(getComputedStyle(el.querySelector('.human-walk-strip')!).opacity)}))
   if(!current.moving||current.opacity<=0||!current.frame||!(/^[0-7]$/).test(current.frame)){previous=undefined;continue}
   if(previous)distance+=Math.hypot(current.x-previous.x,current.y-previous.y)
   previous=current;frames.add(current.frame)
   if(frames.size>=4&&distance>=20)break
  }
  expect(frames.size,`${id}: actual visible walking must cycle at least four frames`).toBeGreaterThanOrEqual(4)
  expect(distance,`${id}: frames must accompany real travel`).toBeGreaterThanOrEqual(20)
  const transform=await walk.locator('.human-walk-strip').evaluate(el=>getComputedStyle(el).transform)
  expect(transform).toMatch(/^matrix\([^,]+, 0, 0,/)
  const movingBox=await walk.locator('.human-walk-strip').boundingBox(),standingBox=await walk.locator('.human-art').boundingBox()
  expect(Math.abs(movingBox!.y-standingBox!.y)).toBeLessThan(1)
  expect(Math.abs(movingBox!.height-standingBox!.height)).toBeLessThan(1)
 }
 expect(await page.locator('.room-friend .human-art').evaluateAll(es=>es.map(e=>e.getAttribute('data-art-source')))).toEqual(sources);await expect(page.getByTestId('room-momo').locator('.animal-art')).toHaveAttribute('data-art-version','4');await page.emulateMedia({reducedMotion:'reduce'});await page.getByTestId('room-special-boy').scrollIntoViewIfNeeded();await page.clock.runFor(200);expect(await page.getByTestId('room-special-boy').locator('.human-walk-strip').evaluate(el=>getComputedStyle(el).opacity)).toBe('0')
})
