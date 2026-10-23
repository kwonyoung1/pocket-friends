import type {Page} from '@playwright/test'
import {expect} from '@playwright/test'
import {room} from '../src/room/config'
export async function dragPlace(page:Page,id:string,target:{x:number;y:number}){
 await page.getByRole('navigation',{name:'성장과 모험 메뉴'}).getByRole('button',{name:'인벤토리',exact:true}).click();await page.getByTestId(`item-${id}`).getByRole('button',{name:'방에 배치하기'}).click()
 const vp=page.locator('.room-viewport');await vp.evaluate((e,t)=>{e.scrollIntoView({block:'center',behavior:'instant'});e.scrollLeft=t.x/t.width*e.scrollWidth-e.clientWidth/2;e.scrollTop=t.y/t.height*e.scrollHeight-e.clientHeight/2},{...target,width:room.width,height:room.height})
 const r=await page.locator('.placement-editor').boundingBox(),x=r!.x+target.x/room.width*r!.width,y=r!.y+target.y/room.height*r!.height
 const session=await page.context().newCDPSession(page);await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y-15,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach()
 const preview=page.getByTestId('placement-preview');const p={x:Number(await preview.getAttribute('data-map-x')),y:Number(await preview.getAttribute('data-map-y'))}
 // The editor and final placed item must use identical room geometry, including at mobile edges.
 const geometry=await preview.evaluate(e=>{const b=e.getBoundingClientRect(),r=e.closest('.room')!.getBoundingClientRect();return {x:(b.left-r.left)/r.width,y:(b.top-r.top)/r.height,w:b.width/r.width,h:b.height/r.height}})
 await expect(page.getByLabel('손가락에 가리지 않는 배치 미리보기')).toBeVisible()
 await page.getByRole('button',{name:'여기에 놓기'}).click()
 const placed=page.locator(`.placed-furniture[data-item="${id}"]`).last();await expect(placed).toBeAttached()
 const final=await placed.evaluate(e=>{const b=e.getBoundingClientRect(),r=e.closest('.room')!.getBoundingClientRect();return {x:(b.left-r.left)/r.width,y:(b.top-r.top)/r.height,w:b.width/r.width,h:b.height/r.height}})
 for(const k of ['x','y','w','h'] as const)expect(final[k]).toBeCloseTo(geometry[k],4)
 return p
}
