import {expect,it} from 'vitest'
import {trade,maxPurchase} from './model'
import {freshWorld,validateCommand} from '../cloud/engine'
import {acquire,world} from '../progression/model'
import {parseSave} from '../game'
const at=Date.parse('2026-10-16T03:00:00Z')
it('buys ten in one debit and one recorded transaction, preserves discovery dates and persists',()=>{
 const s=freshWorld(at);world(s).coins=1000
 expect(maxPurchase(s,'snack')).toBe(66)
 trade(s,{type:'buy-many',id:'snack',quantity:10},at)
 expect(s.world!.coins).toBe(850);expect(s.world!.inventory.snack).toBe(10);expect(s.world!.book.snack.count).toBe(10)
 const first=s.world!.book.snack.firstAt;trade(s,{type:'buy-many',id:'snack',quantity:2},at+1000)
 expect(s.world!.book.snack).toEqual({count:12,firstAt:first,lastAt:at+1000})
 expect(s.world!.trades).toHaveLength(2);expect(parseSave(JSON.stringify(s),at+1000).world!.trades).toEqual(s.world!.trades)
})
it('rejects invalid, fractional, huge, unaffordable, nonshop and locked purchases without partial mutation',()=>{
 for(const qty of [0,-1,1.1,NaN,Infinity,10001,Number.MAX_SAFE_INTEGER]){
  const s=freshWorld(at),before=JSON.stringify(s)
  expect(()=>trade(s,{type:'buy-many',id:'snack',quantity:qty},at)).toThrow();expect(JSON.stringify(s)).toBe(before)
  expect(()=>validateCommand({type:'buy-many',id:'snack',quantity:qty})).toThrow()
 }
 for(const [id,n] of [['snack',21],['toy',1],['treasure-gold',1],['special-boy',1]] as const){const s=freshWorld(at),before=JSON.stringify(s);expect(()=>trade(s,{type:'buy-many',id,quantity:n},at)).toThrow();expect(JSON.stringify(s)).toBe(before)}
})
it('sells multiple kinds atomically at server prices, keeps books and placed furniture, and limits each request to available stock',()=>{
 const s=freshWorld(at),w=world(s);acquire(w,'leaf',at);acquire(w,'treasure-diamond',at);w.inventory.leaf=15;w.inventory.plant=1;w.expansion={version:1,placements:[{id:'placed',itemId:'plant',x:649,y:477}],hamsters:[],adoptions:[],events:[],seen:[]}
 const book=structuredClone(w.book)
 trade(s,{type:'sell-many',lines:[{id:'leaf',quantity:10},{id:'treasure-diamond',quantity:1}]},at)
 expect(w.coins).toBe(3400);expect(w.inventory.leaf).toBe(5);expect(w.inventory['treasure-diamond']).toBe(0);expect(w.book).toEqual(book);expect(w.expansion.placements).toHaveLength(1)
 for(const lines of [[{id:'leaf',quantity:6}],[{id:'leaf',quantity:1},{id:'world-seed',quantity:1}],[{id:'leaf',quantity:1},{id:'leaf',quantity:1}],[{id:'plant',quantity:2}],[{id:'hamster',quantity:1}]]){const before=JSON.stringify(s);expect(()=>trade(s,{type:'sell-many',lines},at+1000)).toThrow();expect(JSON.stringify(s)).toBe(before)}
})
it('all-stock sales can exceed the purchase-per-request cap while respecting owned quantities',()=>{
 const s=freshWorld(at);s.world!.inventory.leaf=20000;trade(s,{type:'sell-many',lines:[{id:'leaf',quantity:20000}]},at)
 expect(s.world!.inventory.leaf).toBe(0);expect(s.world!.coins).toBe(200300);expect(parseSave(JSON.stringify(s),at).world!.trades?.[0].lines[0].quantity).toBe(20000)
})
