import {test,expect} from 'vitest'
import {arenaRoster,defaultParty,rosterBattle} from './integration'
import {act,heroById} from './model'
const source=[{id:'special-boy',name:'남자아이',level:12},{id:'special-girl',name:'우리 찬미',level:50},{id:'momo',name:'소중한 모모',level:29},{id:'bibi',name:'비비',level:35},{id:'coco',name:'코코',level:40},{id:'dudu',name:'두두',level:20}]
test('roster snapshots owned identities, aliases and actual levels without changing the source',()=>{
 const original=structuredClone(source);source.forEach(Object.freeze);Object.freeze(source)
 const roster=arenaRoster(source);expect(roster).toHaveLength(6);expect(roster[0]).toMatchObject({id:'special-boy',name:'영이',level:12});expect(roster.find(f=>f.id==='momo')?.name).toBe('소중한 모모');expect(source).toEqual(original)
 roster[0].name='다른 표시';expect(source).toEqual(original)
})
test('mixed growth levels control individual stats and skill locks; practice levels are temporary',()=>{
 const roster=arenaRoster(source),original=structuredClone(roster),ids=defaultParty(roster),state=rosterBattle(ids,roster,null)
 expect(state.units.find(u=>u.id==='momo')?.level).toBe(29);expect(state.units.find(u=>u.id==='special-girl')?.level).toBe(50);expect(state.units.find(u=>u.id==='bibi')?.level).toBe(35)
 const actor=state.units.find(u=>u.id==='momo')!;state.order=[actor.id];state.cursor=0;expect(()=>act(state,'active1','slime')).toThrow('Lv.30')
 const practice=rosterBattle(ids,roster,50);expect(practice.units.filter(u=>u.side==='ally').every(u=>u.level===50)).toBe(true);expect(roster).toEqual(original);expect(source[0].level).toBe(12)
})
test('missing friends, invalid practice levels and invalid parties cannot enter',()=>{
 const roster=arenaRoster(source).filter(f=>f.id!=='coco')
 expect(()=>rosterBattle(['special-boy','coco'],roster,35)).toThrow('없는 친구');expect(()=>rosterBattle(['momo','bibi'],roster,null)).toThrow('반드시');expect(()=>rosterBattle(['special-boy'],roster,Infinity)).toThrow('연습 레벨')
 expect(arenaRoster([{id:'momo',name:'모모',level:NaN}])[0].level).toBe(1)
})
test('practice result has no economic fields and bear retains its cost/speed tradeoff',()=>{
 const roster=arenaRoster(source),state=rosterBattle(['special-boy','momo','bibi','coco'],roster,35,true)
 expect(state.wave).toBe(2);expect(JSON.stringify(state)).not.toMatch(/inventory|coins|xp|ledger|rewardToken/);expect(heroById('coco').cost).toBe(4)
 expect(state.units.find(u=>u.id==='coco')!.spd).toBeLessThan(state.units.find(u=>u.id==='bibi')!.spd)
})
