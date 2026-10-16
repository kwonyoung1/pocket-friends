import {expect,it} from 'vitest'
import {newTreasures,defaultTaste,restCooldownMs} from './catalog'
import {items,itemById,salePrice} from '../progression/config'
import {regionWeights,collectionItems} from '../expansion/config'
import {acquire,buy,chooseLoot,completeExpeditions,growth,rollRarity,sell,startExpedition,useItem,world} from '../progression/model'
import {freshWorld,applyCommand} from '../cloud/engine'
import {care,parseSave,restRemaining} from '../game'
import {settleLife} from '../expansion/model'
const at=Date.parse('2026-10-16T03:00:00Z')
it('adds exactly nine illustrated collectibles with exact sale prices without replacing old treasures or furniture',()=>{
 expect(newTreasures.filter(t=>t.rarity==='rare')).toHaveLength(4);expect(newTreasures.filter(t=>t.rarity==='legendary')).toHaveLength(5)
 expect(new Set(items.map(i=>i.id)).size).toBe(items.length);expect(collectionItems).toHaveLength(32)
 for(const t of newTreasures){expect(itemById[t.id].category).toBe('treasure');expect(salePrice(itemById[t.id])).toBe(t.salePrice);expect(itemById[t.id].sellable).toBe(true)}
 for(const id of ['leaf','mushroom','forest-gem'])expect(salePrice(itemById[id])).toBe({leaf:10,mushroom:30,'forest-gem':100}[id])
 expect(itemById['world-seed'].sellable).toBe(false);expect(itemById['decor-3-4'].sellable).toBe(false)
})
it('uses exact regional weights at 100000 stratified draws and never awards forest/beach legendary treasures',()=>{
 for(const [region,weights] of Object.entries(regionWeights)){
  expect(Object.values(weights).reduce((a,b)=>a+b,0)).toBe(100)
  const count={common:0,uncommon:0,rare:0,legendary:0}
  for(let n=0;n<100000;n++)count[rollRarity(()=>(n+.5)/100000,region)]++
  for(const grade of Object.keys(count) as (keyof typeof count)[])expect(count[grade]).toBe(weights[grade]*1000)
  if(['forest','beach'].includes(region))expect(()=>chooseLoot(region,'legendary')).toThrow()
 }
 expect(rollRarity(()=>.997499999,'cave')).toBe('rare');expect(rollRarity(()=>.9975,'cave')).toBe('legendary')
 expect(rollRarity(()=>.994999999,'garden')).toBe('rare');expect(rollRarity(()=>.995,'garden')).toBe('legendary')
 const expected=items.filter(i=>i.category==='treasure'&&i.rarity==='legendary').map(i=>i.id)
 for(const region of ['cave','garden'])expect(expected.map((_,i)=>chooseLoot(region,'legendary',()=>(i+.5)/expected.length))).toEqual(expected)
})
it('draws collectible, curious extra and furniture separately; retains all locked rewards through migration and pays once',()=>{
 const s=freshWorld(at);growth(s.friends[0]).level=10
 const rolls=[.9999,.01,.01,.9999,.7,.01,.9999,.8,.99,.99,.99]
 startExpedition(s,'momo','cave',at,()=>rolls.shift()??.99)
 const job=world(s).jobs[0];expect(job.result.items).toHaveLength(3)
 expect(job.result.items.slice(0,2).every(id=>itemById[id].category==='treasure')).toBe(true)
 expect(itemById[job.result.items[2]].category).toBe('decor')
 const locked=structuredClone(job.result),restored=parseSave(JSON.stringify(s),at)
 expect(world(restored).jobs[0].result).toEqual(locked)
 completeExpeditions(restored,job.endsAt);const coins=world(restored).coins;completeExpeditions(restored,job.endsAt+1);expect(world(restored).coins).toBe(coins)
})
it('treasure sales pay once, remove only one owned item and preserve collection records',()=>{
 const s=freshWorld(at);acquire(world(s),'treasure-diamond',at,s.friends[0]);const book=structuredClone(world(s).book)
 sell(s,'treasure-diamond',at);expect(world(s).coins).toBe(3300);expect(world(s).inventory['treasure-diamond']).toBe(0)
 sell(s,'treasure-diamond',at+1000);expect(world(s).coins).toBe(3300);expect(world(s).book).toEqual(book)
})
for(const id of ['strawberry-milk','cheeseburger','sushi-box','rainbow-macaron'])it(`${id} purchases one serving and applies rounded taste effects exactly once without the old bonus`,()=>{
 for(const factor of [1.5,.8,1]){
  const s=freshWorld(at),f=s.friends[0],food=itemById[id];world(s).coins=1000;f.stats.hunger=0;f.stats.happiness=0
  f.foodTaste={like:factor===1.5?id:'bread',dislike:factor===.8?id:'cake'}
  buy(s,id,at);expect(world(s).coins).toBe(1000-food.price)
  useItem(s,id,f.id,at);expect(world(s).inventory[id]).toBe(0)
  expect(f.stats.hunger).toBe(Math.min(100,Math.round(food.effects.hunger!*factor)));expect(f.stats.happiness).toBe(Math.min(100,Math.round(food.effects.happiness!*factor)))
  const stats={...f.stats};useItem(s,id,f.id,at+11000);expect(f.stats).toEqual(stats)
 }
})
it('base food is neutral, ID tastes survive renaming, and unspecified IDs get stable non-base defaults',()=>{
 const s=freshWorld(at),f=s.friends[0];f.foodTaste={like:'snack',dislike:'cake'};f.stats.hunger=20;f.stats.happiness=20;acquire(world(s),'snack',at);useItem(s,'snack',f.id,at)
 expect(f.stats.hunger).toBe(30);expect(f.stats.happiness).toBe(20)
 expect(defaultTaste('new-future-friend')).toEqual(defaultTaste('new-future-friend'));expect(defaultTaste('new-future-friend').like).not.toBe('snack')
 f.foodTaste=defaultTaste(f.id);f.name='새 이름';expect(parseSave(JSON.stringify(s),at).friends[0].foodTaste).toEqual(defaultTaste(f.id))
})
it('manual rest shares a per-friend four-hour server cooldown without restricting automatic sleep',()=>{
 const s=freshWorld(at),f=s.friends[0];f.stats.energy=20
 care(f,'rest',at);expect(f.stats.energy).toBe(40);expect(f.lastRestRewardAt).toBe(at)
 care(f,'rest',at+2000);expect(f.stats.energy).toBe(40)
 const loaded=parseSave(JSON.stringify(s),at)
 expect(restRemaining(loaded.friends[0],at)).toBe(240*60000)
 care(f,'rest',at+restCooldownMs-1);expect(f.stats.energy).toBe(40)
 care(f,'rest',at+restCooldownMs);expect(f.stats.energy).toBe(60)
 care(s.friends[1],'rest',at+2000);expect(s.friends[1].lastRestRewardAt).toBe(at+2000)
 const sleeping=freshWorld(Date.parse('2026-10-15T15:00:00Z'));sleeping.friends[0].stats.energy=20;sleeping.friends[0].lastRestRewardAt=sleeping.savedAt
 settleLife(sleeping,sleeping.savedAt+3600000);expect(sleeping.friends[0].stats.energy).toBeGreaterThan(20)
 const result=applyCommand(loaded,{}, {type:'care',action:'rest',friendId:'momo'},'user',at+2000)
 expect(result.save.friends[0].lastRestRewardAt).toBe(at)
})
