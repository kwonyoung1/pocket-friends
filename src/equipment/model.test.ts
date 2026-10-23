import {describe,it,expect} from 'vitest'
import {freshWorld,applyCommand,validateCommand} from '../cloud/engine'
import {acquire,chooseLoot,completeExpeditions,expeditionTerms,growth,sell,startExpedition,world} from '../progression/model'
import {items,regions} from '../progression/config'
import {regionWeights} from '../expansion/config'
import {equipment,gearBonus,bonusWeights,drawEquipment,gearCommand} from './model'
import {equipmentCatalog,equipmentOdds,equipmentById} from './catalog'
import {parseSave} from '../game'
import {lifeCommand,expansion,furnitureObstacles,orderedPlacements,attachNavigation} from '../expansion/model'
import {isGem} from '../adventure/gems'
import {regionTreasures,treasureAllowed} from '../adventure/catalog'
import {walkable,findRoute,segmentWalkable} from '../navigation'
import {trade} from '../trade/model'
const at=Date.parse('2026-10-23T03:00:00Z')
function fixture(){const s=freshWorld(at);for(const f of s.friends){growth(f,at).level=50;f.stats.energy=100}return s}
function grant(s:ReturnType<typeof fixture>,itemId:string,id=crypto.randomUUID()){const d=equipmentById[itemId];equipment(s).instances.push({id,itemId,regionId:d.regionId,foundAt:at});return id}
function equip(s:ReturnType<typeof fixture>,itemId:string,friendId='momo'){const id=grant(s,itemId);gearCommand(s,{type:'equip',friendId,instanceId:id});return id}

describe('regions, independent equipment draws and frozen departures',()=>{
 it('keeps four original region terms and unlocks three successive upper regions',()=>{
  expect(regions.slice(0,4).map(r=>[r.id,r.minLevel,r.minutes,r.coins,r.energy])).toEqual([['forest',1,30,120,15],['beach',5,60,240,25],['cave',10,120,500,40],['garden',15,240,900,55]])
  expect(regions.slice(4).map(r=>[r.id,r.minLevel,r.minutes])).toEqual([['mine',20,300],['temple',25,360],['sanctuary',30,420]])
  for(const r of regions.slice(4)){const s=fixture();growth(s.friends[0]).level=r.minLevel-1;expect(startExpedition(s,'momo',r.id,at)).toContain(`레벨 ${r.minLevel}`);growth(s.friends[0]).level++;expect(startExpedition(s,'momo',r.id,at,()=>.99)).toContain('출발')}
 })
 it('keeps all regional weights exact and exclusive treasure pools isolated at every rarity',()=>{
  expect(regionWeights.mine).toEqual({common:18,uncommon:42,rare:39,legendary:1});expect(regionWeights.temple).toEqual({common:10,uncommon:37,rare:51,legendary:2});expect(regionWeights.sanctuary).toEqual({common:5,uncommon:30,rare:61,legendary:4})
  expect(regionWeights.cave.legendary).toBe(.25);expect(regionWeights.garden.legendary).toBe(.5)
  expect(regionTreasures).toHaveLength(9)
  for(const r of regions)for(const rarity of ['common','uncommon','rare','legendary'] as const){
   expect(Object.values(regionWeights[r.id]).reduce((a,b)=>a+b)).toBe(100)
   if(!regionWeights[r.id][rarity])continue
   const pool=items.filter(i=>i.category==='treasure'&&i.rarity===rarity&&treasureAllowed(i.id,rarity,r.id))
   expect(pool.length).toBeGreaterThan(0)
   expect(pool.map((_,i)=>chooseLoot(r.id,rarity,()=>(i+.5)/pool.length))).toEqual(pool.map(i=>i.id))
   for(const drop of pool)expect(regionTreasures.find(i=>i.id===drop.id)?.regionId??r.id).toBe(r.id)
  }
 })
 it('rolls exact equipment chance boundaries, grade distributions and region-only items',()=>{
  expect(equipmentCatalog).toHaveLength(20)
  expect(Object.values(equipmentOdds).map(o=>[o.chance,...Object.values(o.weights)])).toEqual([[.08,55,32,12.5,.5],[.10,45,35,19,1],[.12,35,40,23,2],[.15,25,40,31,4],[.18,15,35,42,8]])
  expect(drawEquipment('forest',()=>{throw Error('No RNG needed')})).toBeUndefined();expect(drawEquipment('beach',()=>0)).toBeUndefined()
  for(const [region,o] of Object.entries(equipmentOdds)){
   expect(drawEquipment(region,()=>o.chance)).toBeUndefined()
   const counts={common:0,uncommon:0,rare:0,legendary:0}
   for(let i=0;i<10000;i++){let n=0;const id=drawEquipment(region,()=>n++===0?o.chance-1e-9:(i+.5)/10000)!;const d=equipmentById[id];expect(d.regionId).toBe(region);counts[d.rarity]++}
   for(const grade of Object.keys(counts) as (keyof typeof counts)[])expect(counts[grade]).toBe(o.weights[grade]*100)
  }
 })
 it('draws equipment independently after treasure/furniture/extras and pays exactly one unique instance',()=>{
  const make=(chance:number)=>{const s=fixture(),f=s.friends[0];growth(f).traits.calm=100;const draws=[.3,.2,.99,.99,.99,.99,chance,.999];startExpedition(s,'momo','mine',at,()=>draws.shift()??.99);return s}
  const yes=make(0),no=make(.99),job=world(yes).jobs[0]
  expect(job.result.items).toEqual(world(no).jobs[0].result.items);expect(job.result.coins).toBe(world(no).jobs[0].result.coins)
  expect(job.result.equipment?.itemId).toBe('gear-crystal-crown');expect(world(no).jobs[0].result.equipment).toBeUndefined()
  const restored=parseSave(JSON.stringify(yes),at);expect(world(restored).jobs[0]).toEqual(job)
  completeExpeditions(restored,job.endsAt);completeExpeditions(restored,job.endsAt+1000)
  expect(equipment(restored).instances).toEqual([{...job.result.equipment!,regionId:'mine',foundAt:job.endsAt}])
  expect(world(restored).book['gear-crystal-crown'].count).toBe(1)
  expect(world(restored).inventory['gear-crystal-crown']).toBe(0)
 })
 it('locks effects and coins at departure while keeping active trait time and extra event coins separate',()=>{
  const s=fixture(),f=s.friends[0];growth(f).traits.active=100
  const head=equip(s,'gear-star-crown');equip(s,'gear-crystal-armor');equip(s,'gear-galaxy-necklace')
  expect(gearBonus(s,'momo').coins).toBe(.8)
  const base=regions.find(r=>r.id==='cave')!
  const sequence=[.2,.1,.99,.99,.99,.05,.99];startExpedition(s,'momo','cave',at,()=>sequence.shift()??.99)
  const job=world(s).jobs[0],locked=structuredClone(job)
  expect(job.endsAt-at).toBe(base.minutes*60000*.95)
  expect(job.result.coins).toBe(Math.floor(base.coins*1.8)+50)
  gearCommand(s,{type:'unequip',friendId:'momo',instanceId:head});gearCommand(s,{type:'equip',friendId:'bibi',instanceId:head})
  expect(world(s).jobs[0]).toEqual(locked)
  expect(world(parseSave(JSON.stringify(s),at)).jobs[0]).toEqual(locked)
 })
 it('caps all stacked bonuses and redistributes only common/uncommon while legendary stays fixed',()=>{
  const s=fixture();equip(s,'gear-underground-helm');equip(s,'gear-time-robe');equip(s,'gear-crystal-compass')
  expect(gearBonus(s,'momo').time).toBeCloseTo(.35)
  growth(s.friends[0]).traits.active=100
  expect(expeditionTerms(s.friends[0],'mine',s).duration).toBe(300*60000*.65)
  // Legitimate head + accessory stacks exceed the rare cap.
  gearCommand(s,{type:'unequip',friendId:'momo',instanceId:equipment(s).instances[0].id});equip(s,'gear-crystal-crown')
  expect(gearBonus(s,'momo').rare).toBe(8)
  for(const weights of Object.values(regionWeights)){
   const b=bonusWeights(weights,80);expect(b.legendary).toBe(weights.legendary);expect(b.rare).toBe(weights.rare+8);expect(Object.values(b).reduce((a,b)=>a+b)).toBeCloseTo(100,12)
   expect(b.common/b.uncommon).toBeCloseTo(weights.common/weights.uncommon,12)
  }
 })
 it('preserves old ongoing trips without adding gear or recalculating their locked rewards',()=>{
  const s=fixture();startExpedition(s,'momo','cave',at,()=>.99);const job=world(s).jobs[0]
  delete job.equipmentBonus;delete job.equippedIds;delete job.result.equipment
  const old=structuredClone(job);equip(s,'gear-star-crown')
  const loaded=parseSave(JSON.stringify(s),at)
  expect(world(loaded).jobs[0]).toEqual(old);completeExpeditions(loaded,old.endsAt)
  expect(equipment(loaded).instances).toHaveLength(1)
  expect(world(loaded).coins).toBe(300+old.result.coins)
 })
})

describe('unique ownership, persistence and non-saleable gear',()=>{
 it('uses three slots, forbids shared instances and same-slot stacking, supports transfer and duplicates',()=>{
  const s=fixture(),id=equip(s,'gear-crystal-hat');equip(s,'gear-crystal-armor');equip(s,'gear-crystal-compass')
  expect(equipment(s).instances.filter(i=>i.equippedBy==='momo')).toHaveLength(3)
  expect(()=>gearCommand(s,{type:'equip',friendId:'bibi',instanceId:id})).toThrow('이미')
  const second=grant(s,'gear-crystal-hat');expect(second).not.toBe(id)
  expect(()=>gearCommand(s,{type:'equip',friendId:'momo',instanceId:second})).toThrow('슬롯')
  expect(()=>gearCommand(s,{type:'unequip',friendId:'bibi',instanceId:id})).toThrow()
  gearCommand(s,{type:'unequip',friendId:'momo',instanceId:id});gearCommand(s,{type:'equip',friendId:'bibi',instanceId:id})
  expect(equipment(parseSave(JSON.stringify(s),at)).instances).toEqual(equipment(s).instances)
 })
 it('rejects invalid commands and corrupted or duplicate equipment records without mutating source',()=>{
  expect(()=>validateCommand({type:'equip',friendId:'momo'})).toThrow();expect(()=>validateCommand({type:'layer',id:'x',direction:'up'})).toThrow()
  const s=fixture(),id=equip(s,'gear-crystal-hat'),raw=JSON.stringify(s)
  for(const mutation of ['id','slot','friend','region','unknown']){const bad=JSON.parse(raw);const list=bad.world.equipment.instances;if(mutation==='id')list.push({...list[0]});if(mutation==='slot')list.push({...list[0],id:'second'});if(mutation==='friend')list[0].equippedBy='nobody';if(mutation==='region')list[0].regionId='forest';if(mutation==='unknown'){list[0].itemId='toString';delete list[0].regionId;}expect(()=>parseSave(JSON.stringify(bad),at)).toThrow()}
  expect(JSON.stringify(s)).toBe(raw)
  const held=applyCommand(s,{}, {type:'equip',friendId:'bibi',instanceId:grant(s,'gear-leaf-hat')},'player',at).save
  expect(equipment(held).instances.find(i=>i.id===id)?.equippedBy).toBe('momo')
 })
 it('never includes gear in one-item or bulk sales',()=>{
  const s=fixture();grant(s,'gear-star-crown');world(s).inventory['gear-star-crown']=1
  const before=JSON.stringify(s);expect(sell(s,'gear-star-crown',at)).toContain('판매할 수 없는')
  expect(()=>trade(s,{type:'sell-many',lines:[{id:'gear-star-crown',quantity:1}]},at)).toThrow()
  expect(JSON.stringify(s)).toBe(before)
 })
})

describe('gems, overlaps, layers and legacy furniture',()=>{
 it('explicitly classifies gemstones and halves their collision footprint without blocking routes',()=>{
  expect(isGem('treasure-diamond')).toBe(true);expect(isGem('mine-ancient-core')).toBe(true);expect(isGem('temple-relic')).toBe(false);expect(isGem('world-seed')).toBe(false)
  const s=fixture();acquire(world(s),'treasure-diamond',at);const before=furnitureObstacles(s)
  lifeCommand(s,{type:'place',itemId:'treasure-diamond',x:530,y:390},at)
  expect(furnitureObstacles(s)).toEqual(before)
  attachNavigation(s);for(const f of s.friends)expect(walkable(f,furnitureObstacles(s))).toBe(true)
  const path=findRoute({x:500,y:400},{x:600,y:400},furnitureObstacles(s));expect(path.length).toBeGreaterThan(0)
  let prev={x:500,y:400};for(const p of path){expect(segmentWalkable(prev,p,furnitureObstacles(s))).toBe(true);prev=p}
 })
 it('places multiple gems and solid furniture at the exact same point, validates free quantity and boundaries',()=>{
  const s=fixture();for(const id of ['plant','plant','treasure-diamond','treasure-diamond'])acquire(world(s),id,at)
  const book=structuredClone(world(s).book)
  for(const itemId of ['plant','plant','treasure-diamond','treasure-diamond'])expect(lifeCommand(s,{type:'place',itemId,x:530,y:390},at)).toContain('놓았어요')
  expect(expansion(s).placements).toHaveLength(4);expect(furnitureObstacles(s)).toHaveLength(2)
  lifeCommand(s,{type:'place',itemId:'treasure-diamond',x:530,y:390},at);expect(expansion(s).placements).toHaveLength(4)
  expect(sell(s,'treasure-diamond',at)).toContain('판매할 수 없는')
  expect(()=>trade(s,{type:'sell-many',lines:[{id:'treasure-diamond',quantity:1}]},at)).toThrow()
  const p=expansion(s).placements[2]
  expect(lifeCommand(s,{type:'place',itemId:p.itemId,placementId:p.id,x:-1,y:400},at)).toContain('바닥')
  lifeCommand(s,{type:'recover-furniture',id:p.id},at);lifeCommand(s,{type:'recover-furniture',id:p.id},at)
  expect(world(s).inventory['treasure-diamond']).toBe(1)
  sell(s,'treasure-diamond',at);expect(world(s).inventory['treasure-diamond']).toBe(0)
  expect(world(s).book).toEqual(book)
 })
 it('supports all four layer operations without changing existing coordinates, dimensions, IDs or inventory',()=>{
  const s=fixture();expansion(s).placements=[{id:'first',itemId:'plant',x:530,y:390,w:60,h:40},{id:'middle',itemId:'plant',x:530,y:390},{id:'last',itemId:'light',x:530,y:390}]
  const original=structuredClone(expansion(s).placements),inventory=structuredClone(world(s).inventory)
  const ids=()=>orderedPlacements(s).map(p=>p.id)
  expect(ids()).toEqual(['first','middle','last'])
  lifeCommand(s,{type:'layer',id:'first',direction:'front'},at);expect(ids()).toEqual(['middle','last','first'])
  lifeCommand(s,{type:'layer',id:'first',direction:'back'},at);expect(ids()).toEqual(['first','middle','last'])
  lifeCommand(s,{type:'layer',id:'middle',direction:'forward'},at);expect(ids()).toEqual(['first','last','middle'])
  lifeCommand(s,{type:'layer',id:'middle',direction:'backward'},at);expect(ids()).toEqual(['first','middle','last'])
  const loaded=parseSave(JSON.stringify(s),at)
  expect(expansion(loaded).placements.map(({layer:_layer,...p})=>p)).toEqual(original)
  expect(world(loaded).inventory).toEqual(inventory);expect(furnitureObstacles(loaded)).toHaveLength(2)
 })
})

it('rejects duplicated pending gear drops instead of silently losing a future owned instance',()=>{
 const s=fixture();startExpedition(s,'momo','mine',at,()=>.99);startExpedition(s,'bibi','mine',at,()=>.99)
 for(const j of world(s).jobs)j.result.equipment={id:'same-future-instance',itemId:'gear-crystal-crown'}
 expect(()=>parseSave(JSON.stringify(s),at)).toThrow('개체가 중복')
})
