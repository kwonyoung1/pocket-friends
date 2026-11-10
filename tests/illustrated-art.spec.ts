import {test,expect} from '@playwright/test'
test('seven new masters have transparent margins, shaded pixels and unique instance IDs',async({page})=>{
 await page.goto('/tests/fixtures/artwork.html');await expect(page.locator('.illustrated-art')).toHaveCount(56)
 const inspected=await page.evaluate(async()=>{
  const roots=Array.from(document.querySelectorAll<HTMLElement>('.illustrated-art'))
  const kinds=[...new Set(roots.map(r=>r.dataset.artKind))]
  return Promise.all(kinds.map(async kind=>{const node=roots.find(r=>r.dataset.artKind===kind)!,img=new Image();img.src=node.dataset.artSource!;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let opaque=0,transparent=0,edge=0;const colors=new Set<string>();for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4,a=data[i+3];if(!a)transparent++;if(a>128){opaque++;colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);if(!x||!y||x===canvas.width-1||y===canvas.height-1)edge++}}return{kind,width:canvas.width,height:canvas.height,opaque,transparent,edge,colors:colors.size}}))
 })
 expect(inspected).toHaveLength(7);for(const art of inspected){expect(art.width).toBe(240);expect(art.height).toBe(280);expect(art.opaque,art.kind).toBeGreaterThan(10000);expect(art.transparent,art.kind).toBeGreaterThan(10000);expect(art.edge,art.kind).toBe(0);expect(art.colors,art.kind).toBeGreaterThan(500)}
 const ids=await page.locator('svg [id]').evaluateAll(els=>els.map(e=>e.id));expect(new Set(ids).size).toBe(ids.length)
})
test('authored human standing, seated and sleep geometry switches without stretching the face',async({page})=>{
 await page.goto('/tests/fixtures/artwork.html')
 for(const kind of ['boy','girl']){const idle=page.locator(`[data-kind=${kind}][data-pose=idle]`),rest=page.locator(`[data-kind=${kind}][data-pose=rest]`),sleep=page.locator(`[data-kind=${kind}][data-pose=sleep]`),happy=page.locator(`[data-kind=${kind}][data-pose=happy]`),walk=page.locator(`[data-kind=${kind}][data-pose=walk]`)
  await expect(idle.locator('.stand-legs')).toBeVisible();await expect(idle.locator('.seated-legs')).toBeHidden();await expect(rest.locator('.seated-legs')).toBeVisible();await expect(rest.locator('.stand-legs')).toBeHidden();await expect(sleep.locator('.sleep-scene')).toBeVisible();await expect(sleep.locator('.awake-scene')).toBeHidden()
  expect(await happy.locator('.illustrated-art').evaluate(el=>getComputedStyle(el).getPropertyValue('--mouth-joy'))).toBe('block')
  expect(await walk.locator('.art-leg-left').evaluate(el=>getComputedStyle(el).animationName)).toBe('art-step')
 }
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('[data-kind=boy][data-pose=walk] .art-leg-left').evaluate(el=>getComputedStyle(el).animationName)).toBe('none')
})

test('a real reusable toy selects its own reaction without extra coins or pet rewards',async({page})=>{
 const at=Date.parse('2026-11-10T03:00:00Z');const {freshWorld}=await import('../src/cloud/engine'),s=freshWorld(at);s.world!.inventory.ball=1
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000));await page.addInitScript(s=>{if(!localStorage.getItem('pocket-friends-v1'))localStorage.setItem('pocket-friends-v1',JSON.stringify(s))},s)
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();await page.getByRole('button',{name:'인벤토리',exact:true}).click();await page.getByTestId('item-ball').getByRole('button',{name:'모모에게 놀이',exact:true}).click();await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click()
 await expect(page.getByTestId('room-momo')).toHaveAttribute('data-active-item','ball');await expect(page.getByTestId('room-momo').locator('.art-activity')).toHaveAttribute('data-item','ball')
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(saved.world.inventory.ball).toBe(1);expect(saved.world.coins).toBe(s.world!.coins);expect(saved.friends[0].petRewardAfter??0).toBe(s.friends[0].petRewardAfter??0);expect(saved.friends[0].stats.happiness).toBeGreaterThan(s.friends[0].stats.happiness)
 await page.clock.runFor(2500);await expect(page.getByTestId('room-momo').locator('.art-activity')).toHaveCount(0)
})
