import {dragPlace} from './placement-input'
import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {room,roomScale} from '../src/room/config'
import {placementFloor,placementRange} from '../src/room/placement'
import {furnitureInk,furnitureShape} from '../src/expansion/artConfig'
import {items} from '../src/progression/config'
import {isGem} from '../src/adventure/gems'
import {newSichuan} from '../src/sichuan/state'
import {newWordProgress} from '../src/words/state'
import {expectFriendsToWalk} from './movement'
const at=Date.parse('2026-10-23T03:00:00Z')
async function seed(page:Page,all=false){
 const s=freshWorld(at);s.world!.coins=6543;s.friends[0].name='사진 친구';s.friends[0].photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=20;c.getContext('2d')!.fillRect(0,0,20,20);return c.toDataURL('image/png')})
 s.world!.inventory={'treasure-diamond':2,'decor-2-7':1,'decor-0-2':2};s.world!.equipment={version:1,instances:[{id:'kept-hat',itemId:'gear-crystal-hat',regionId:'mine',foundAt:at,equippedBy:'momo'}]}
 s.world!.expansion={version:1,placements:[{id:'old-plant',itemId:'plant',x:530,y:275*roomScale,layer:5},{id:'old-gem',itemId:'treasure-diamond',x:530,y:390,layer:2}],hamsters:[],adoptions:[],events:[],seen:[]}
 s.world!.sichuan=newSichuan();s.world!.sichuan.bests=[{playerId:'old',nickname:'기록 친구',elapsedMs:4321,at,sessionId:'record'}];s.world!.words=newWordProgress();s.world!.words.nextStartAt=at+12345
 if(all)for(const i of items.filter(i=>i.category==='decor'||isGem(i.id)))s.world!.inventory[i.id]=1
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000))
 await page.addInitScript(s=>{if(!sessionStorage.getItem('halloween-seed')){localStorage.setItem('pocket-friends-v1',JSON.stringify(s));sessionStorage.setItem('halloween-seed','yes')}},s)
 await page.goto('/');await expect(page.getByTestId('room-momo')).toBeVisible();return s
}
async function menu(page:Page,name:string){await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button',{name,exact:true}).click()}
async function snapshot(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))}

test('halloween is persistent, gentle and decorative without changing saved possessions or blocking touch',async({page},info)=>{
 await seed(page);const before=await snapshot(page),size=await page.locator('.room').evaluate(e=>[e.getAttribute('data-world-width'),e.getAttribute('data-world-height')])
 await page.getByRole('button',{name:'🎃 할로윈 테마로 변경',exact:true}).click();await expect(page.locator('.room')).toHaveAttribute('data-theme','halloween');await expect(page.getByTestId('halloween-decor')).toBeVisible()
 const toolbar=await page.locator('.room-toolbar').boundingBox()
 for(const child of await page.locator('.room-toolbar > *').all()){const b=await child.boundingBox();expect(b!.y).toBeGreaterThanOrEqual(toolbar!.y);expect(b!.y+b!.height).toBeLessThanOrEqual(toolbar!.y+toolbar!.height+.1)}
 await expect(page.getByRole('timer',{name:'한국 시간 시계'})).toBeVisible()
 const after=await snapshot(page)
 expect(after.world.placementBoundsVersion).toBe(2)
 expect(after.world.expansion).toEqual(before.world.expansion);expect(after.world.equipment).toEqual(before.world.equipment);expect(after.world.sichuan).toEqual(before.world.sichuan);expect(after.world.words).toEqual(before.world.words);expect(after.world.coins).toBe(before.world.coins)
 expect(after.friends.map((f:{id:string;name:string;photo?:string})=>[f.id,f.name,f.photo])).toEqual(before.friends.map((f:{id:string;name:string;photo?:string})=>[f.id,f.name,f.photo]))
 expect(await page.locator('.room').evaluate(e=>[e.getAttribute('data-world-width'),e.getAttribute('data-world-height')])).toEqual(size)
 await page.getByTestId('room-special-boy').click();await page.clock.runFor(1000)
 await expectFriendsToWalk(page,['momo','bibi','coco','dudu'])
 await page.emulateMedia({reducedMotion:'reduce'});for(const cls of ['.halloween-ghost','.halloween-star','.halloween-bat'])expect(await page.locator(cls).first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none')
 await page.locator('.room-panel').screenshot({path:`/tmp/pocket-halloween-${info.project.name}.png`})
 await page.reload();await expect(page.locator('.room')).toHaveAttribute('data-theme','halloween')
 await page.getByRole('button',{name:'🌿 기본 테마로 변경',exact:true}).click();await expect(page.locator('.room')).toHaveAttribute('data-theme','default');await expect(page.getByTestId('halloween-decor')).toHaveCount(0)
})

test('four floor corners clamp native touch to visible body bounds on every screen size',async({page})=>{
 await seed(page,true)
 const cards=items.filter(i=>i.category==='decor'||isGem(i.id)),gems=cards.filter(i=>isGem(i.id)).slice(0,4)
 const targets=['minX:minY','maxX:minY','minX:maxY','maxX:maxY'] as const
 for(let i=0;i<4;i++){
  const id=gems[i].id,r=placementRange(id),[x,y]=targets[i].split(':') as ['minX'|'maxX','minY'|'maxY']
  const p=await dragPlace(page,id,{x:r[x],y:r[y]})
  expect(p.x).toBeCloseTo(r[x],1);expect(p.y).toBeCloseTo(r[y],1)
  const actual=await page.locator(`.placed-furniture[data-item="${id}"] [data-placement-body]`).last().evaluate(e=>{const b=e.getBoundingClientRect(),r=e.closest('.room')!.getBoundingClientRect();return {l:(b.left-r.left)/r.width*1000,t:(b.top-r.top)/r.height*640,r:(b.right-r.left)/r.width*1000,b:(b.bottom-r.top)/r.height*640}})
  expect(actual.l).toBeGreaterThanOrEqual(8-.1);expect(actual.r).toBeLessThanOrEqual(992+.1);expect(actual.t).toBeGreaterThanOrEqual(207-.1);expect(actual.b).toBeLessThanOrEqual(632+.1)
 }
})

test('all furniture and gems have conservative SVG body bounds shared with the server',async({page})=>{
 await seed(page,true);await menu(page,'인벤토리');const errors:string[]=[]
 for(const item of items.filter(i=>i.category==='decor'||isGem(i.id))){
  const body=page.getByTestId(`item-${item.id}`).locator('[data-placement-body]')
  const bbox=await body.evaluate(e=>{const b=(e as SVGGraphicsElement).getBBox();return{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height}})
  const ink=isGem(item.id)?{left:10,top:4,right:90,bottom:89}:furnitureInk[furnitureShape(item.id)]
  if(bbox.x<ink.left||bbox.y<ink.top||bbox.right>ink.right||bbox.bottom>ink.bottom)errors.push(`${item.id}: ${JSON.stringify(bbox)} outside ${JSON.stringify(ink)}`)
 }
 expect(errors).toEqual([])
})

test('native touch places gems and a bed near former top/bottom limits with matching preview and saved coordinates',async({page},info)=>{
 await seed(page)
 for(const [id,y] of [['treasure-diamond',250],['treasure-diamond',610],['decor-2-7',265]] as const){
  const p=await dragPlace(page,id,{x:500*roomScale,y:y*roomScale}),saved=await snapshot(page),placed=saved.world.expansion.placements.at(-1)
  expect(placed).toMatchObject(p);expect(p.y/roomScale).toBeCloseTo(y,0)
  const r=placementRange(id);expect(p.y).toBeGreaterThanOrEqual(r.minY);expect(p.y).toBeLessThanOrEqual(r.maxY)
  const actual=await page.locator(`[data-placement-id="${placed.id}"] [data-placement-body]`).evaluate(e=>{const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom}})
  const scene=await page.locator('.room').boundingBox();expect(actual.t).toBeGreaterThanOrEqual(scene!.y+placementFloor.top/room.height*scene!.height-1);expect(actual.b).toBeLessThanOrEqual(scene!.y+placementFloor.bottom/room.height*scene!.height+1)
 }
 await page.getByRole('button',{name:'가구 편집',exact:true}).click();const saved=await snapshot(page),id=saved.world.expansion.placements.at(-1).id
 await page.getByLabel('배치 아이템 선택').selectOption(id);await page.getByRole('button',{name:'맨 뒤로 보내기'}).click();await page.getByRole('button',{name:'회수하기',exact:true}).click();expect((await snapshot(page)).world.inventory['decor-2-7']).toBe(1)
 await page.locator('.room-panel').screenshot({path:`/tmp/pocket-placement-${info.project.name}.png`})
 await page.reload();await expect(page.locator('.placed-gem')).toHaveCount(3)
})
