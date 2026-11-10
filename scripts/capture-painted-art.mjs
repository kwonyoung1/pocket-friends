// Capture the real development App with a disposable, local preview save.
// Requires `npm run dev -- --port 4173`. Never contacts the production world.
import {chromium,devices} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
await mkdir('docs/screenshots',{recursive:true})
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
for(const mobile of [false,true]){
 const context=await browser.newContext(mobile?{...devices['iPhone 13'],defaultBrowserType:undefined}:{viewport:{width:1440,height:1100}})
 const page=await context.newPage();await page.clock.install({time:new Date('2026-11-10T03:00:00Z')});await page.clock.pauseAt(new Date('2026-11-10T03:00:00.100Z'))
 await page.goto('http://127.0.0.1:4173/');await page.getByTestId('room-momo').waitFor();await page.clock.runFor(12000);await page.locator('img').evaluateAll(async es=>Promise.all(es.map(e=>e.decode())))
 await page.locator('.room-viewport').evaluate(el=>el.scrollTo({left:(el.scrollWidth-el.clientWidth)/2,top:(el.scrollHeight-el.clientHeight)/2}))
 await page.screenshot({path:`docs/screenshots/painted-home-${mobile?'mobile':'desktop'}.png`,fullPage:true})
 if(mobile){await page.locator('.room-viewport').evaluate(el=>el.scrollTo({left:el.scrollWidth,top:el.scrollHeight}));await page.locator('img').evaluateAll(async es=>Promise.all(es.map(e=>e.decode())));await page.screenshot({path:'docs/screenshots/painted-room-right-mobile.png',fullPage:true});await page.getByRole('button',{name:/모모 상태·돌보기 펼치기/}).click();await page.screenshot({path:'docs/screenshots/painted-care-mobile.png',fullPage:true})}
 await page.goto('http://127.0.0.1:4173/tests/fixtures/artwork.html');await page.locator('img').evaluateAll(async es=>Promise.all(es.map(e=>e.decode())));if(!mobile)await page.screenshot({path:'docs/screenshots/painted-poses-gallery.png',fullPage:true})
 await context.close()
}
await browser.close()
