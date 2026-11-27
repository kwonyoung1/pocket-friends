import {test,expect} from 'vitest'
import {HEROES,heroById} from '../characters'
import {BEASTS} from '../beasts'
import {ADVENTURERS} from '../adventurers'
import {createBattle,act} from '../model'
import {resolvedStrikes} from './presentation'
import {vfxPreset,budgets} from './presets'
import {SkillTimeline,AnimationCancelled} from './SkillTimeline'
for(const h of [...HEROES,...BEASTS,...ADVENTURERS])test(`${h.id} all existing skill slots have a visual preset without changing combat`,()=>{
 const b=createBattle(h.id==='special-boy'?['special-boy']:['special-boy',h.id],50,77,undefined,'10-2',15),u=b.units.find(u=>u.heroId===h.id)!;u.mp=3;b.order=[u.id,...b.order.filter(id=>id!==u.id)];b.cursor=0
 for(const k of heroById(h.id).skills){const a=act(b,k.id,k.target==='ally'||k.target==='all-allies'?u.id:b.units.find(u=>u.side==='enemy')!.id),snapshot=JSON.stringify(a),p=vfxPreset(u,k,a.ultimate),events=resolvedStrikes(a);expect(p.family).toBeTruthy();expect(p.tier).toBeGreaterThanOrEqual(1);expect(p.tier).toBeLessThanOrEqual(4);expect(events.reduce((sum,h)=>sum+h.damage,0)).toBe(a.hits.reduce((sum,h)=>sum+h.damage,0));expect(JSON.stringify(a)).toBe(snapshot)}
})
test('blocked zero, separate criticals and auxiliary healing survive presentation unchanged',()=>{
 const b=createBattle(['special-boy'],50),u=b.units.find(u=>u.heroId==='special-boy')!;u.mp=3;b.order=[u.id,...b.order.filter(id=>id!==u.id)];b.cursor=0;const a=act(b,'basic',b.units.find(u=>u.side==='enemy')!.id);a.hits=[{id:'enemy',damage:12,heal:0,shield:0,critical:true,miss:false,strikes:[0,5,7],strikeCriticals:[false,false,true],blocked:[0]},{id:'ally',damage:0,heal:9,shield:0,critical:false,miss:false,strikes:[]}];const e=resolvedStrikes(a);expect(e.map(e=>[e.damage,e.blocked,e.critical,e.heal])).toEqual([[0,true,false,0],[5,false,false,0],[7,false,true,0],[0,false,false,9]])
})
test('GSAP advances only on the supplied game clock and completes once',async()=>{const clock=new SkillTimeline(),values:number[]=[];let done=0;const job=clock.tween(1000,p=>values.push(p),'power2.out').then(()=>done++);clock.tick(500);expect(values.at(-1)).toBeGreaterThan(.5);expect(done).toBe(0);clock.tick(500);await job;clock.tick(500);expect(done).toBe(1);expect(clock.active).toBe(0);clock.destroy()})
test('closing a battle cancels pending timelines and releases callbacks',async()=>{const clock=new SkillTimeline(),job=clock.tween(1000,()=>{});const result=expect(job).rejects.toBeInstanceOf(AnimationCancelled);clock.destroy();await result;expect(clock.active).toBe(0)})
test('quality changes only bounded presentation budgets',()=>{expect(budgets.low.particles).toBe(32);expect(budgets.high.particles).toBe(144);expect(budgets.medium.shapes).toBeLessThan(budgets.high.shapes)})
