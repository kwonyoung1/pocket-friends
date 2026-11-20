import {test,expect} from '@playwright/test'
test.skip(({isMobile})=>!isMobile,'Mobile portrait renderer checks')
test('all animal and human bodies use actual vector directions, keep heading on stop and fit four phones',async({page})=>{
 await page.clock.install({time:new Date('2026-11-20T03:00:00Z')});await page.clock.pauseAt(new Date('2026-11-20T03:00:01Z'))
 await page.setViewportSize({width:390,height:1800})
 await page.goto('/tests/fixtures/directions.html')
 const art=page.locator('[data-actor] .animal-art,[data-actor] .human-walk-controller')
 await expect(art).toHaveCount(11)
 // Keep the harness actors visible to the production IntersectionObserver.
 await page.clock.runFor(100)
 await expect(page.locator('[data-art-ready=true],[data-walk-ready=true]')).toHaveCount(11)
 for(const [dx,dy,direction,row,mirror] of [[4,0,'right',0,1],[-4,0,'left',0,-1],[0,-4,'back',100,1],[0,4,'front',50,1]] as const){
  for(let n=0;n<9;n++){await page.evaluate(([x,y])=>(window as any).directionFixture.step(x,y),[dx,dy]);await page.clock.runFor(100)}
  for(const root of await art.all()){
   await expect(root).toHaveAttribute('data-art-facing',direction)
   const layer=root.locator('.direction-current')
   await expect(layer).toHaveCSS('background-position-y',`${row}%`)
   expect(await layer.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).a)).toBe(mirror)
  }
  await page.evaluate(()=>(window as any).directionFixture.stop());await page.clock.runFor(300)
  for(const root of await art.all())await expect(root).toHaveAttribute('data-art-facing',direction)
  await page.locator('main').screenshot({path:`docs/screenshots/direction-${direction}-mobile-harness.png`})
 }
 for(const viewport of [{width:360,height:800},{width:375,height:812},{width:390,height:844},{width:412,height:915}]){
  await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByText('모모',{exact:true}).scrollIntoViewIfNeeded()
 for(let n=0;n<5;n++){await page.evaluate(()=>(window as any).directionFixture.step(0,-4));await page.clock.runFor(200)}
 const momo=page.locator('[data-actor=momo] .animal-art')
 await expect(momo).toHaveAttribute('data-art-facing','back');await expect(momo.locator('.animal-walk')).toHaveCSS('opacity','0')
 await expect(momo.locator('.animal-life')).toHaveCSS('background-position-y','100%')
})
