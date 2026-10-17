import {expect,it} from 'vitest'
import {freshWorld,applyCommand} from '../cloud/engine'
import {parseSave} from '../game'
import {grantSpecialFriends} from '../humans/model'
import {itemById} from '../progression/config'
import {world,useItem} from '../progression/model'
import {trade} from '../trade/model'
import {defaultTaste,specialFoodTaste} from './catalog'
const at=Date.parse('2026-10-17T03:00:00Z')
const foods=[['pumpkin-porridge',120,35,5,15],['banana-smoothie',180,20,12,25],['chicken-soup',300,60,10,40]] as const
it.each(foods)('%s supports multi-buy and consumes one serving with rounded recovery and clamping',(id,price,hunger,happiness,energy)=>{
 for(const factor of [1,1.5,.8]){
  const s=freshWorld(at),w=world(s),f=s.friends[0];w.coins=10000;f.stats.hunger=0;f.stats.happiness=0;f.stats.energy=0
  f.foodTaste={like:factor===1.5?id:'cake',dislike:factor===.8?id:'bread'}
  trade(s,{type:'buy-many',id,quantity:3},at);expect(w.coins).toBe(10000-price*3);expect(w.inventory[id]).toBe(3)
  useItem(s,id,f.id,at);expect(w.inventory[id]).toBe(2)
  for(const [key,value] of [['hunger',hunger],['happiness',happiness],['energy',energy]] as const)expect(f.stats[key]).toBe(Math.min(100,Math.round(value*factor)))
  const once=structuredClone(f.stats);useItem(s,id,f.id,at);expect(w.inventory[id]).toBe(2);expect(f.stats).toEqual(once)
  f.stats.hunger=f.stats.happiness=f.stats.energy=99;useItem(s,id,f.id,at+60000);expect(f.stats.energy).toBe(100);expect(f.stats.happiness).toBe(100);expect(f.stats.hunger).toBe(100)
 }
})
it('unifies only fixed special IDs on load and server command, preserving other tastes, names and inventory',()=>{
 const s=freshWorld(at);grantSpecialFriends(s,at);const boy=s.friends.find(f=>f.id==='special-boy')!,girl=s.friends.find(f=>f.id==='special-girl')!
 boy.name='이름 바꾼 영이';girl.name='이름 바꾼 찬미';boy.foodTaste={like:'cheeseburger',dislike:'strawberry-milk'};girl.foodTaste={like:'bread',dislike:'cake'}
 s.friends[0].foodTaste={like:'pumpkin-porridge',dislike:'banana-smoothie'}
 const old=structuredClone(s);const loaded=parseSave(JSON.stringify(s),at)
 for(const id of ['special-boy','special-girl'])expect(loaded.friends.find(f=>f.id===id)!.foodTaste).toEqual(specialFoodTaste)
 expect(loaded.friends[0].foodTaste).toEqual(old.friends[0].foodTaste);expect(loaded.world!.coins).toBe(old.world!.coins);expect(loaded.world!.inventory).toEqual(old.world!.inventory)
 expect(loaded.friends.find(f=>f.id==='special-boy')!.name).toBe(boy.name)
 const updated=applyCommand(s,{}, {type:'refresh'},'pc',at).save
 expect(updated.friends.find(f=>f.id==='special-boy')!.foodTaste).toEqual(defaultTaste('special-girl'))
 for(const f of [boy,girl]){world(s).inventory.snack=1;f.stats.hunger=0;world(s).useAfter=0;useItem(s,'snack',f.id,at);expect(f.stats.hunger).toBe(itemById.snack.effects.hunger)}
})
it('preserves a populated legacy world including photos, growth, furniture, expedition, notebook and word history',async()=>{
 const s=freshWorld(at);grantSpecialFriends(s,at)
 const {wordCommand,wordProgress}=await import('../words/model'),{startExpedition,growth}=await import('../progression/model'),{expansion}=await import('../expansion/model')
 const w=world(s),f=s.friends[0];f.name='소중한 옛 이름';f.photo='data:image/png;base64,AAAA';growth(f).level=12;growth(f).xp=17
 w.coins=123456;w.inventory={snack:21,'treasure-ruby':2,plant:1};w.book={'treasure-ruby':{firstAt:at-1000,lastAt:at,count:2}}
 expansion(s).placements.push({id:'old-furniture',itemId:'plant',x:650,y:450})
 startExpedition(s,'momo','forest',at,()=>.99)
 wordCommand(s,{type:'word-start',mode:'reward'},at,()=>.5)
 const p=wordProgress(s),q=p.round!.questions[0];wordCommand(s,{type:'word-reveal',mode:'reward',sessionId:p.round!.id,wordId:q.wordId},at)
 const before=structuredClone(s),restored=parseSave(JSON.stringify(s),at)
 for(const key of ['coins','inventory','book','jobs','trades','words','expansion'] as const)expect(restored.world![key]).toEqual(before.world![key])
 expect(restored.memories).toEqual(before.memories);expect(restored.friends.map(f=>f.id)).toEqual(before.friends.map(f=>f.id))
 for(const f of before.friends){const r=restored.friends.find(r=>r.id===f.id)!;expect(r.name).toBe(f.name);expect(r.photo).toBe(f.photo);expect(r.stats).toEqual(f.stats);expect(r.growth).toEqual(f.growth)}
})
