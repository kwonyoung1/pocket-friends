import {test,expect} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {lifeCommand} from '../src/expansion/model'
import type {Page} from '@playwright/test'
const at=Date.parse('2026-11-10T03:00:00Z')
async function seed(page:Page,randomSeed?:number){if(randomSeed!==undefined)await page.addInitScript(seed=>{let n=seed;Math.random=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296}},randomSeed);const s=freshWorld(at);s.world!.coins=60000;s.world!.inventory.cake=2;for(const id of ['lulu','toto','byeol','mungchi'])lifeCommand(s,{type:'adopt',id},at);s.world!.expansion!.placements=[{id:'kept-plant',itemId:'plant',x:530,y:390,layer:2}];await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000));await page.addInitScript(s=>{if(!localStorage.getItem('pocket-friends-v1'))localStorage.setItem('pocket-friends-v1',JSON.stringify(s))},s);await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();return s}
test('actual room uses quadruped atlases, moving distance advances feet and gestures stop cycling',async({page})=>{
 await seed(page,42);await expect(page.locator('.room-friend .animal-art')).toHaveCount(8);await expect(page.locator('[data-room-art=woodland-watercolor-v1]')).toBeVisible();await expect(page.getByTestId('room-special-boy').locator('.human-art')).toHaveAttribute('data-art-version','3')
 // A 30-second jump can land in a long rest or leave both slots occupied
 // by humans. Skip quiet waits, then sample real RAF movement of a visible animal.
 const observations=new Map<string,{frames:Set<string>;distance:number;x:number;y:number}>()
 let moved=0,activeSamples=0
 for(let sample=0;sample<240&&activeSamples<80;sample++){
  const walkers=page.locator('.room-friend[data-moving=true]:has(.animal-art)')
  if(!await walkers.count()){await page.clock.fastForward(1000);continue}
  const walking=walkers.first()
  await walking.scrollIntoViewIfNeeded()
  await expect(walking.locator('.animal-art')).toHaveAttribute('data-art-ready','true')
  await page.clock.runFor(200);activeSamples++
  const rows=await page.locator('.room-friend:has(.animal-art)').evaluateAll(es=>es.map(e=>({id:e.getAttribute('data-testid')!,moving:e.getAttribute('data-moving'),frame:e.querySelector<HTMLElement>('.animal-art')!.dataset.gaitFrame,visible:e.querySelector<HTMLElement>('.animal-art')!.dataset.animationVisible,x:Number(e.getAttribute('data-x')),y:Number(e.getAttribute('data-y'))})))
  for(const row of rows){
   if(row.moving!=='true'||row.visible!=='true'||!row.frame||!(/^[0-7]$/).test(row.frame))continue
   moved++
   let seen=observations.get(row.id)
   if(!seen){seen={frames:new Set(),distance:0,x:row.x,y:row.y};observations.set(row.id,seen)}
   seen.distance+=Math.hypot(row.x-seen.x,row.y-seen.y);seen.x=row.x;seen.y=row.y;seen.frames.add(String(row.frame))
  }
  if(moved>5&&[...observations.values()].some(v=>v.frames.size>=5&&v.distance>=20))break
 }
 expect(moved).toBeGreaterThan(5)
 expect([...observations.values()].some(v=>v.frames.size>=5&&v.distance>=20),'A visible animal must actually travel and cycle at least five gait frames').toBe(true)
 const actor=page.getByTestId('room-momo');await page.addStyleTag({content:'[data-testid=room-momo]{z-index:1700!important}'});await actor.scrollIntoViewIfNeeded();const bounds=await actor.locator('.friend-figure').boundingBox();await page.mouse.move(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);await page.mouse.down();await page.clock.runFor(150);await expect(actor.locator('.animal-art')).toHaveAttribute('data-motion-state','Drag');const frame=await actor.locator('.animal-art').getAttribute('data-gait-frame');await page.clock.runFor(350);await expect(actor.locator('.animal-art')).toHaveAttribute('data-gait-frame',frame!);await page.mouse.up()
})
test('existing household, furniture, inventory and human source art survive reload',async({page})=>{
 const original=await seed(page);const sources=await page.locator('.room-friend .human-art').evaluateAll(es=>es.map(e=>e.getAttribute('data-art-source')));await page.clock.runFor(2200);await page.reload();await expect(page.locator('.room-friend')).toHaveCount(10);const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(saved.world.coins).toBe(original.world!.coins);expect(saved.world.inventory).toEqual(original.world!.inventory);expect(saved.world.expansion.placements).toEqual(original.world!.expansion!.placements);expect(saved.friends.filter((f:{id:string})=>!f.id.startsWith('special-')).map((f:{id:string;name:string;color:string;kind:string})=>({id:f.id,name:f.name,color:f.color,kind:f.kind}))).toEqual(original.friends.map(f=>({id:f.id,name:f.name,color:f.color,kind:f.kind})));expect(await page.locator('.room-friend .human-art').evaluateAll(es=>es.map(e=>e.getAttribute('data-art-source')))).toEqual(sources)
})
test('reduced motion, offscreen pause and background visibility preserve the scene',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await seed(page);const actor=page.getByTestId('room-momo').locator('.animal-art');await actor.scrollIntoViewIfNeeded();await expect(actor).toHaveAttribute('data-animation-visible','true');await page.clock.runFor(400);await expect(actor).toHaveAttribute('data-motion-reduced','true');const frame=await actor.getAttribute('data-gait-frame');await page.clock.runFor(2000);await expect(actor).toHaveAttribute('data-gait-frame',frame!);expect(await actor.locator('.animal-walk').evaluate(el=>getComputedStyle(el).opacity)).toBe('0');await page.emulateMedia({reducedMotion:'no-preference'});await actor.scrollIntoViewIfNeeded();await page.clock.runFor(400);await expect(actor).toHaveAttribute('data-motion-reduced','false');const offscreen=await page.addStyleTag({content:'[data-testid=room-momo]{left:-10000px!important}'});await page.clock.runFor(200);await expect(actor).toHaveAttribute('data-animation-visible','false');const paused=await actor.getAttribute('data-gait-frame');await page.clock.runFor(1000);await expect(actor).toHaveAttribute('data-gait-frame',paused!);await offscreen.evaluate(el=>el.parentNode?.removeChild(el));await actor.scrollIntoViewIfNeeded();await page.clock.runFor(200);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});const before=await actor.getAttribute('data-gait-frame');await page.clock.runFor(1000);await expect(actor).toHaveAttribute('data-gait-frame',before!);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))});await page.clock.runFor(1000);expect(await page.evaluate(()=>document.body.scrollWidth>innerWidth)).toBe(false)
})
