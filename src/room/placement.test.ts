import {describe,it,expect} from 'vitest'
import {freshWorld,validateCommand} from '../cloud/engine'
import {parseSave} from '../game'
import {changeRoomTheme,roomTheme} from './theme'
import {placementFloor,legacyPlacement,placementVisualSize,placementRange,placementOffsets,withinPlacementFloor,clampPlacement,roomPointer} from './placement'
import {room,roomScale} from './config'
import {items} from '../progression/config'
import {isGem} from '../adventure/gems'
import {expansion,furnitureObstacles,lifeCommand,validLayout,attachNavigation} from '../expansion/model'
import {walkable,segmentWalkable} from '../navigation'
import {tick} from '../game'
const at=Date.parse('2026-10-23T03:00:00Z')
function fixture(){const s=freshWorld(at);s.world!.inventory={'treasure-diamond':2,'decor-0-2':2};s.world!.equipment={version:1,instances:[{id:'original-hat',itemId:'gear-crystal-hat',regionId:'mine',foundAt:at,equippedBy:'momo'}]};expansion(s).placements=[{id:'old',itemId:'plant',x:530,y:390,layer:3},{id:'gem',itemId:'treasure-diamond',x:530,y:390,layer:1}];return s}
describe('room theme is a free visual preference',()=>{
 it('defaults old saves to the original room and persists both themes without resetting anything',()=>{
  const s=fixture(),original=structuredClone(s)
  expect(roomTheme(s)).toBe('default')
  changeRoomTheme(s,'halloween',at);expect(roomTheme(parseSave(JSON.stringify(s),at))).toBe('halloween')
  changeRoomTheme(s,'default',at+1);expect(s.world!.roomTheme).toEqual({id:'default',changedAt:at+1})
  delete s.world!.roomTheme;expect(s).toEqual(original)
 })
 it('has no fee or cooldown and leaves images, coordinates, gear and navigation unchanged',()=>{
  const s=fixture(),before=structuredClone(s),obstacles=furnitureObstacles(s)
  for(let n=0;n<100;n++)changeRoomTheme(s,n%2?'default':'halloween',at)
  expect(s.world!.coins).toBe(before.world!.coins);expect(s.world!.buyAfter).toBe(before.world!.buyAfter);expect(s.world!.useAfter).toBe(before.world!.useAfter)
  expect(s.friends).toEqual(before.friends);expect(s.world!.equipment).toEqual(before.world!.equipment);expect(expansion(s)).toEqual(expansion(before));expect(furnitureObstacles(s)).toEqual(obstacles)
 })
 it('rejects invalid theme commands and saved versions without mutating the source',()=>{
  expect(()=>validateCommand({type:'room-theme',theme:'winter'})).toThrow()
  const s=fixture(),raw=JSON.stringify(s)
  for(const patch of [{roomTheme:{id:'winter',changedAt:at}},{roomTheme:{id:'halloween',changedAt:-1}},{placementBoundsVersion:999}]){const bad=JSON.parse(raw);Object.assign(bad.world,patch);expect(()=>parseSave(JSON.stringify(bad),at)).toThrow()}
  expect(JSON.stringify(s)).toBe(raw)
 })
})
describe('shared visible floor bounds',()=>{
 it('uses 94.83% of the drawn floor before per-item body insets, with no world or walking resize',()=>{
  expect(room.width).toBe(1000*Math.sqrt(1.5));expect(room.height).toBe(640*Math.sqrt(1.5));expect([room.minY,room.maxY]).toEqual([230*roomScale,570*roomScale])
  expect([placementFloor.top/roomScale,placementFloor.bottom/roomScale]).toEqual([207,632])
  const ratio=(placementFloor.right-placementFloor.left)*(placementFloor.bottom-placementFloor.top)/(room.width*(room.height-199*roomScale))
  expect(ratio).toBeCloseTo(.9482993197,8)
  expect([legacyPlacement.top/roomScale,legacyPlacement.bottom/roomScale]).toEqual([275,530])
 })
 it('opens former top/bottom dead space and keeps overlap plus single recovery intact',()=>{
  const s=fixture()
  for(const y of [250,610])expect(validLayout(s,'treasure-diamond',{x:500*roomScale,y:y*roomScale})).toBe(true)
  for(const y of [265,610])expect(validLayout(s,'decor-0-2',{x:500*roomScale,y:y*roomScale})).toBe(true)
  for(let n=0;n<2;n++)lifeCommand(s,{type:'place',itemId:'treasure-diamond',x:500*roomScale,y:610*roomScale},at)
  expect(expansion(s).placements).toHaveLength(4);expect(s.world!.inventory['treasure-diamond']).toBe(0)
  const id=expansion(s).placements[2].id;lifeCommand(s,{type:'recover-furniture',id},at);lifeCommand(s,{type:'recover-furniture',id},at)
  expect(s.world!.inventory['treasure-diamond']).toBe(1)
 })
 it('lets small gems get closer to every edge than a large bed and ignores their aura',()=>{
  const gem=placementRange('treasure-diamond'),bed=placementRange('decor-2-7')
  expect(gem.minY).toBeLessThan(bed.minY);expect(gem.maxY).toBeGreaterThan(bed.maxY);expect(gem.minX).toBeLessThan(bed.minX);expect(gem.maxX).toBeGreaterThan(bed.maxX)
  expect(placementVisualSize('treasure-diamond').w).toBe(placementVisualSize('plant').w/2);expect(placementVisualSize('treasure-diamond').h).toBe(placementVisualSize('plant').h/2)
 })
 it('converts any viewport size into the same map point and clamps a held pointer only at the visual edge',()=>{
  const a=roomPointer(300,400,{left:100,top:100,width:1000,height:640}),b=roomPointer(200,350,{left:100,top:200,width:500,height:320})
  expect(a).toEqual(b)
  const p=clampPlacement('treasure-diamond',{x:-500,y:9000}),r=placementRange('treasure-diamond')
  expect(p).toEqual({x:r.minX,y:r.maxY});expect(withinPlacementFloor('treasure-diamond',p)).toBe(true)
 })
 it('keeps existing out-of-new-bounds legacy positions, IDs and layers exactly as saved',()=>{
  const s=fixture();expansion(s).placements[0].y=275*roomScale
  const old=structuredClone(expansion(s).placements)
  expect(withinPlacementFloor('plant',expansion(s).placements[0])).toBe(false)
  s.world!.placementBoundsVersion=2;changeRoomTheme(s,'halloween',at)
  expect(expansion(parseSave(JSON.stringify(s),at)).placements).toEqual(old)
 })
 it('never changes character movement bounds and retains solid collisions after placing near the floor edge',()=>{
  const s=freshWorld(at);s.world!.inventory.plant=1
  const r=placementRange('plant');expect(lifeCommand(s,{type:'place',itemId:'plant',x:500*roomScale,y:r.maxY},at)).toContain('놓았어요')
  attachNavigation(s)
  for(let n=0;n<200;n++){const before=s.friends.map(f=>({x:f.x,y:f.y}));tick(s.friends,at+n*100,.1,()=>{});s.friends.forEach((f,i)=>{expect(walkable(f,furnitureObstacles(s))).toBe(true);expect(segmentWalkable(before[i],f,furnitureObstacles(s))).toBe(true)})}
 })
 for(const item of items.filter(i=>i.category==='decor'||isGem(i.id)))it(`${item.id} uses its rendered body size and rejects all four outside edges`,()=>{
  const r=placementRange(item.id),o=placementOffsets(item.id),p={x:(r.minX+r.maxX)/2,y:(r.minY+r.maxY)/2}
  expect(withinPlacementFloor(item.id,p)).toBe(true)
  expect(withinPlacementFloor(item.id,{...p,x:r.minX-.01})).toBe(false);expect(withinPlacementFloor(item.id,{...p,x:r.maxX+.01})).toBe(false)
  expect(withinPlacementFloor(item.id,{...p,y:r.minY-.01})).toBe(false);expect(withinPlacementFloor(item.id,{...p,y:r.maxY+.01})).toBe(false)
  expect(r.minX+o.left).toBeCloseTo(placementFloor.left,8);expect(r.maxY+o.bottom).toBeCloseTo(placementFloor.bottom,8)
 })
})
