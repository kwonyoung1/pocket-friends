import {test,expect} from 'vitest'
import * as v2 from './legacy-v2/model.ts'
import {ticketBattle,replay,actForRules,enemyForRules} from './replay.ts'
import type {ArenaTicket} from './state.ts'
import type {Move} from './types.ts'
const now=Date.parse('2026-11-23T03:00:00Z')
test('pre-update rules-2 battles replay bit-for-bit with old stats and pay their original victory after new stars exist',()=>{
 const ids=['special-boy','special-girl','beast-lumi'],profiles=Object.fromEntries(ids.map(id=>[id,{level:35,name:id,mastery:0}])),t:ArenaTicket={id:crypto.randomUUID(),owner:crypto.randomUUID(),stageId:'1-1',party:ids,profiles,seed:7,rules:2,startedAt:now,expiresAt:now+3600000,moves:[],status:'active'},expected=v2.createBattle(ids,1,7,profiles,'1-1');expect(ticketBattle(t)).toEqual(expected)
 let s=expected;const moves:Move[]=[];for(let n=0;n<100&&s.phase==='battle';n++){if(v2.current(s).side==='enemy'){s=v2.enemyAction(s).next;continue}const target=s.units.find(u=>u.side==='enemy'&&u.hp>0)!.id;moves.push({skill:'basic',target});s=v2.act(s,'basic',target).next}
 expect(s.phase).toBe('victory');expect(replay(t,moves)).toEqual(s);expect(actForRules(2,expected,'basic',expected.units.find(u=>u.side==='enemy')!.id)).toEqual(v2.act(expected,'basic',expected.units.find(u=>u.side==='enemy')!.id))
 const foes=expected.units.find(u=>u.side==='enemy')!;expected.order=[foes.id,...expected.order.filter(id=>id!==foes.id)];expected.cursor=0;expect(enemyForRules(2,expected)).toEqual(v2.enemyAction(expected))
})
