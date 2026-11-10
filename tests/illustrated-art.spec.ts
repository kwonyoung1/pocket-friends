import {test,expect} from '@playwright/test'
test('seven painted masters have transparent margins and rich shaded pixels',async({page})=>{
 await page.goto('/tests/fixtures/artwork.html');await expect(page.locator('.painted-art')).toHaveCount(56)
 const inspected=await page.evaluate(async()=>Promise.all([...new Set(Array.from(document.querySelectorAll<HTMLElement>('.painted-art')).map(r=>r.dataset.artKind))].map(async kind=>{const node=document.querySelector<HTMLElement>(`.painted-art[data-art-kind=${kind}]`)!,img=new Image();img.src=node.dataset.artSource!;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let opaque=0,transparent=0,edge=0;const colors=new Set<string>();for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){let i=(y*c.width+x)*4;if(!p[i+3])transparent++;if(p[i+3]>128){opaque++;colors.add(`${p[i]},${p[i+1]},${p[i+2]}`);if(!x||!y||x===c.width-1||y===c.height-1)edge++}}return{kind,width:c.width,height:c.height,opaque,transparent,edge,colors:colors.size}})))
 expect(inspected).toHaveLength(7);for(const a of inspected){expect(a.width).toBe(512);expect(a.height).toBe(512);expect(a.opaque,a.kind).toBeGreaterThan(10000);expect(a.transparent,a.kind).toBeGreaterThan(10000);expect(a.edge,a.kind).toBe(0);expect(a.colors,a.kind).toBeGreaterThan(10000)}
})
test('walking uses distinct painted leg poses, sleep selects its own art, reduced motion stops cycling',async({page})=>{
 await page.goto('/tests/fixtures/artwork.html')
 for(const kind of ['cat','bunny','dog','bear','fox','boy','girl']){
  const walk=page.locator(`[data-kind=${kind}][data-pose=walk]`),sleep=page.locator(`[data-kind=${kind}][data-pose=sleep]`)
  const a=walk.locator('[data-frame=walk-a]'),b=walk.locator('[data-frame=walk-b]');expect(await a.getAttribute('src')).not.toBe(await b.getAttribute('src'))
  const diff=await walk.evaluate(async root=>{const imgs=[...root.querySelectorAll('img')];await Promise.all(imgs.map(i=>i.decode()));const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d')!;ctx.drawImage(imgs[0],0,0);const a=ctx.getImageData(0,0,512,512).data;ctx.clearRect(0,0,512,512);ctx.drawImage(imgs[1],0,0);const b=ctx.getImageData(0,0,512,512).data;let delta=0;for(let i=512*300*4;i<a.length;i+=4)if(Math.abs(a[i+3]-b[i+3])>100)delta++;return delta});expect(diff,kind).toBeGreaterThan(1000)
  await expect(sleep.locator('.sleep-scene')).toBeVisible();expect(await a.evaluate(el=>getComputedStyle(el).animationName)).toBe('paint-stride')
 }
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('[data-kind=boy][data-pose=walk] .frame-primary').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');await expect(page.locator('[data-kind=boy][data-pose=walk] .frame-passing')).toBeHidden()
})

test('a real reusable toy selects its own reaction without extra coins or pet rewards',async({page})=>{
 const at=Date.parse('2026-11-10T03:00:00Z');const {freshWorld}=await import('../src/cloud/engine'),s=freshWorld(at);s.world!.inventory.ball=1
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000));await page.addInitScript(s=>{if(!localStorage.getItem('pocket-friends-v1'))localStorage.setItem('pocket-friends-v1',JSON.stringify(s))},s)
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();await page.getByRole('button',{name:'인벤토리',exact:true}).click();await page.getByTestId('item-ball').getByRole('button',{name:'모모에게 놀이',exact:true}).click();await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click()
 await expect(page.getByTestId('room-momo')).toHaveAttribute('data-active-item','ball');await expect(page.getByTestId('room-momo').locator('.art-activity')).toHaveAttribute('data-item','ball')
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(saved.world.inventory.ball).toBe(1);expect(saved.world.coins).toBe(s.world!.coins);expect(saved.friends[0].petRewardAfter??0).toBe(s.friends[0].petRewardAfter??0);expect(saved.friends[0].stats.happiness).toBeGreaterThan(s.friends[0].stats.happiness)
 await page.clock.runFor(2500);await expect(page.getByTestId('room-momo').locator('.art-activity')).toHaveCount(0)
})
