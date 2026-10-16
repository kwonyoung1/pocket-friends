import {grantSpecialFriends} from '../humans/model'
import {makeAdoptee} from '../expansion/model'
import {expect,it} from 'vitest'
import {room,roomScale} from './config'
import {upgradeRoom,roomArea} from './migrate'
import {freshWorld} from '../cloud/engine'
import {parseSave,tick} from '../game'
import {cells,findRoute,obstacles,walkable,segmentWalkable} from '../navigation'
import {furnitureObstacles,validLayout,attachNavigation} from '../expansion/model'
const at=Date.parse('2026-10-16T03:00:00Z')
it('expands both floor axes by sqrt(1.5), obstacle area by 1.5 and keeps paths into the added space',()=>{
 expect(room.width/1000).toBeCloseTo(Math.sqrt(1.5));expect(room.height/640).toBeCloseTo(Math.sqrt(1.5));expect(roomArea/(900*340)).toBeCloseTo(1.5,12)
 const old=[250*135,175*135,135*95,105*100]
 obstacles.forEach((o,i)=>expect(o.w*o.h/old[i]).toBeCloseTo(1.5))
 const far=cells.find(c=>c.x>1050&&c.y>600)!,start=cells.find(c=>c.x<200&&c.y>550)!,route=findRoute(start,far)
 expect(route.length).toBeGreaterThan(5);route.forEach((p,i)=>expect(walkable(p)&&(!i||segmentWalkable(route[i-1],p))).toBe(true))
})
it('migrates legacy coordinates once, retaining all IDs, photos, economies, notebook, pending rewards and hamster records',()=>{
 const s=freshWorld(at);delete s.world!.roomVersion
 s.friends.forEach(f=>{f.x/=roomScale;f.y/=roomScale});s.friends[0].photo='data:image/png;base64,AAAA'
 s.world!.coins=999;s.world!.inventory={plant:2,leaf:15};s.world!.expansion={version:1,placements:[{id:'original',itemId:'plant',x:530,y:390}],hamsters:[{id:'h',regionId:'forest',foundAt:at,deployed:true,x:400,y:500}],adoptions:[],events:[],seen:[]}
 const raw=JSON.stringify(s),loaded=parseSave(raw,at),e=loaded.world!.expansion!
 expect(e.placements[0]).toEqual({id:'original',itemId:'plant',x:530*roomScale,y:390*roomScale});expect(e.hamsters[0].id).toBe('h');expect(loaded.world!.inventory).toEqual(s.world!.inventory);expect(loaded.world!.coins).toBe(999);expect(loaded.friends[0].photo).toBe(s.friends[0].photo)
 expect(JSON.stringify(s)).toBe(raw);expect(parseSave(JSON.stringify(loaded),at).world).toEqual(loaded.world);expect(upgradeRoom(loaded)).toBe(false)
})
it('projects unsafe legacy furniture without deleting IDs or quantities and navigates ten actors around furniture',()=>{
 const s=freshWorld(at);delete s.world!.roomVersion;s.world!.expansion={version:1,placements:[{id:'unsafe',itemId:'plant',x:0,y:0}],hamsters:[],adoptions:[],events:[],seen:[]};s.world!.inventory.plant=3
 upgradeRoom(s);const p=s.world!.expansion.placements[0];expect(p.id).toBe('unsafe');expect(validLayout(s,p.itemId,p,p.id)).toBe(true);expect(s.world!.inventory.plant).toBe(3)
 grantSpecialFriends(s,at);s.friends.push(...['lulu','toto','byeol','mungchi'].map(id=>makeAdoptee(id,at)));expect(s.friends).toHaveLength(10)
 attachNavigation(s);for(let i=0;i<300;i++){tick(s.friends,at+i*100,.1,()=>{});s.friends.forEach(f=>expect(walkable(f,furnitureObstacles(s))).toBe(true))}
})
