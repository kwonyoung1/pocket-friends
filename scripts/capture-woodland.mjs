// Real App recording in a disposable local preview; no production Supabase data.
// Run after starting `npm run dev -- --port 4173`.
import {chromium,devices} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
await mkdir('docs/demos',{recursive:true});await mkdir('docs/screenshots',{recursive:true})
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
const results={}
for(const mobile of [false,true]){
 const device=mobile?'mobile':'desktop',size=mobile?{width:390,height:844}:{width:1440,height:1100}
 const context=await browser.newContext({...mobile?devices['iPhone 13']:{},viewport:size,deviceScaleFactor:1,recordVideo:{dir:'/tmp/woodland-videos',size}})
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto('http://127.0.0.1:4173/');await page.getByTestId('room-momo').waitFor()
 const preview=await page.evaluate(async()=>{const {freshWorld}=await import('/src/cloud/engine.ts'),{lifeCommand}=await import('/src/expansion/model.ts');const now=Date.now(),save=freshWorld(now);save.world.coins=12345;lifeCommand(save,{type:'adopt',id:'mungchi'},now);return save});await page.addInitScript(save=>localStorage.setItem('pocket-friends-v1',JSON.stringify(save)),preview)
 await page.reload();await page.getByTestId('room-mungchi').waitFor();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.room-friend .animal-art')).every(el=>el.dataset.artReady==='true'));await page.locator('.room-panel').scrollIntoViewIfNeeded()
 await page.locator('.room-viewport').evaluate(el=>el.scrollTo({left:(el.scrollWidth-el.clientWidth)/2,top:(el.scrollHeight-el.clientHeight)/2}))
 await page.evaluate(()=>{window.__woodlandIntervals=[];let last=performance.now();function sample(now){window.__woodlandIntervals.push(now-last);last=now;requestAnimationFrame(sample)}requestAnimationFrame(sample)})
 const observations={}
 for(let i=0;i<100;i++){
  const rows=await page.locator('.room-friend:has(.animal-art)').evaluateAll(es=>es.map(e=>({id:e.dataset.testid,x:Number(e.dataset.x),y:Number(e.dataset.y),frame:e.querySelector('.animal-art').dataset.gaitFrame,visible:e.querySelector('.animal-art').dataset.animationVisible,state:e.querySelector('.animal-art').dataset.motionState})))
  for(const r of rows){const row=observations[r.id]??={frames:new Set(),states:new Set(),distance:0,last:r};if(r.visible==='true')row.frames.add(r.frame);row.states.add(r.state);row.distance+=Math.hypot(r.x-row.last.x,r.y-row.last.y);row.last=r}
  if(i===25){await page.locator('img').evaluateAll(async es=>Promise.all(es.map(e=>e.decode().catch(()=>{}))));await page.screenshot({path:`docs/screenshots/woodland-home-${device}.png`,fullPage:true,scale:'css'})}
  if(mobile&&i===45)await page.locator('.room-viewport').evaluate(el=>el.scrollTo({left:el.scrollWidth,top:el.scrollHeight}))
  if(mobile&&i===80)await page.screenshot({path:'docs/screenshots/woodland-right-mobile.png',fullPage:true,scale:'css'})
  await page.waitForTimeout(100)
 }
 const intervals=await page.evaluate(()=>window.__woodlandIntervals),sorted=intervals.slice().sort((a,b)=>a-b)
 results[device]={environment:'Headless Chromium on development host; not a physical phone/GPU benchmark',viewport:size,rafHz:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),p95FrameMs:sorted[Math.floor(sorted.length*.95)],pageErrors:errors,animals:Object.fromEntries(Object.entries(observations).map(([id,r])=>[id,{frames:[...r.frames],states:[...r.states],worldDistance:r.distance}]))}
 const video=page.video();await context.close();await video.saveAs(`docs/demos/woodland-walking-${device}.webm`)
}
await writeFile('docs/demos/woodland-browser-observations.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));await browser.close()
