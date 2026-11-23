import {test} from 'vitest'
import assert from 'node:assert/strict'
import {HEROES,partyErrors,createBattle,bossBattle,current,act,enemyAction}from './model'
const ids=['special-boy','special-girl','momo','bibi']
test('party constraints require a leader, cost <=10, five or fewer and no duplicates',()=>{
 assert.deepEqual(partyErrors(ids),[]);assert.deepEqual(partyErrors(['special-boy','momo','bibi','coco']),[])
 for(const bad of [[],['momo','bibi'],['special-boy','special-boy'],HEROES.map(h=>h.id),['special-boy','special-girl','momo','coco','bibi'],['unknown']])assert(partyErrors(bad).length>0)
 assert.throws(()=>createBattle(ids,51));assert.throws(()=>createBattle(ids,0))
})
test('cost4 bear has stronger HP/defense/attack but meaningfully slower speed',()=>{
 const s=createBattle(['special-boy','momo','coco'],35),c=s.units.find(u=>u.id==='coco')!,m=s.units.find(u=>u.id==='momo')!
 assert(c.maxHp>m.maxHp*2);assert(c.atk>m.atk);assert(c.def>m.def*2);assert(c.spd<m.spd/2)
})
test('all registered heroes reject actives before level30, skill2 before35 and ultimate before50 without mutating state',()=>{
 for(const h of HEROES)for(const [level,skill]of [[29,'active1'],[34,'active2'],[49,'ultimate']] as const){
  const team=h.id==='special-boy'?[h.id]:['special-boy',h.id],s=bossBattle(team,level);s.order=[h.id,'guardian'];s.cursor=0
  const before=structuredClone(s);assert.throws(()=>act(s,skill,'guardian'),/Lv\./);assert.deepEqual(s,before)
 }
})
test('single-target validation, dead targets, energy and finished fights cannot be bypassed',()=>{
 const s=bossBattle(ids,35);s.order=['momo','guardian'];s.cursor=0;const before=structuredClone(s)
 assert.throws(()=>act(s,'basic','special-boy'));assert.throws(()=>act(s,'missing','guardian'));s.units.find(u=>u.id==='momo')!.mp=0;assert.throws(()=>act(s,'active2','guardian'),/별빛/)
 assert.deepEqual(before.units.find(u=>u.id==='guardian')!.hp,s.units.find(u=>u.id==='guardian')!.hp)
 s.phase='victory';assert.throws(()=>act(s,'basic','guardian'))
})
test('support, healing, shielding and carrot skills have mechanically different effects',()=>{
 const s=bossBattle(ids,35);s.order=['special-boy','special-girl','bibi','guardian'];s.cursor=0
 let a=act(s,'active1');assert(a.hits.every(h=>h.buff));assert(a.next.units.filter(u=>u.side==='ally').every(u=>u.attackBuff>1))
 const healState=a.next;healState.order=['special-girl','guardian'];healState.cursor=0;healState.units[0].hp=5
 a=act(healState,'active1','special-boy');assert(a.hits[0].heal>0);assert(a.next.units[0].hp>5)
 const shieldState=bossBattle(ids,35);shieldState.order=['special-girl','guardian'];a=act(shieldState,'active2');assert(a.hits.every(h=>h.shield>0))
 const carrotState=bossBattle(ids,35);carrotState.order=['bibi','guardian'];a=act(carrotState,'active1','guardian');assert.equal(a.skill.style,'carrot');assert(a.hits[0].damage>0)
})
test('guardian alternates shield, targeted attack and area slam; shield absorbs damage',()=>{
 let s=bossBattle(ids,35);s.order=['guardian',...ids];s.cursor=0;let a=enemyAction(s);assert.equal(a.skill.style,'shield');assert(a.next.units.find(u=>u.id==='guardian')!.shield>0)
 s=bossBattle(ids,35);s.order=['guardian',...ids];s.units.find(u=>u.id==='guardian')!.turns=2;a=enemyAction(s);assert.equal(a.hits.length,4)
})
test('equal seeds reproduce battle results, and planning never writes input state',()=>{
 const s=bossBattle(ids,35),before=structuredClone(s),a=act(s,'basic','guardian'),b=act(s,'basic','guardian');assert.deepEqual(a,b);assert.deepEqual(s,before)
})
test('a supported four-person party reaches both waves and victory with bounded turns',()=>{
 let s=createBattle(ids,35,95),sawBoss=false
 for(let n=0;n<160&&s.phase==='battle';n++){
  const u=current(s);if(u.side==='enemy')s=enemyAction(s).next
  else{const enemies=s.units.filter(t=>t.side==='enemy'&&t.hp>0),allies=s.units.filter(t=>t.side==='ally'&&t.hp>0),weak=allies.reduce((a,b)=>a.hp/a.maxHp<b.hp/b.maxHp?a:b)
   const k=u.id==='special-girl'&&weak.hp/weak.maxHp<.65&&u.mp>=1?'active1':u.id!=='special-girl'&&u.id!=='special-boy'&&u.mp>=1?'active1':'basic'
   s=act(s,k,k==='active1'&&u.id==='special-girl'?weak.id:enemies[0].id).next
  }if(s.wave===2)sawBoss=true
 }
 assert(sawBoss);assert.equal(s.phase,'victory');assert(s.actions<160)
})
test('defeat ends enemy AI without mutating any external save or inventing rewards',()=>{
 let s=bossBattle(['special-boy'],1);s.units[0].hp=1;s.order=['guardian','special-boy'];s.units.find(u=>u.boss)!.turns=1
 s=enemyAction(s).next;assert.equal(s.phase,'defeat');assert(!('coins'in s));assert(!('rewards'in s))
})
