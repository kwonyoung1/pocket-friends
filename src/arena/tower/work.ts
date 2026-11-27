import type {State} from '../types.ts'
import {act,heroById} from '../model.ts'
import {supportSkill} from '../targeting.ts'
/** Server-only reward forecast. No definitions are mutated; HP cloning avoids overkill caps. */
export function trainingWork(initial:State){const enemies=initial.units.filter(u=>u.side==='enemy'),hp=enemies.reduce((n,u)=>n+u.maxHp,0);let burst=0
 for(const actor of initial.units.filter(u=>u.side==='ally')){const skills=heroById(actor.heroId!,actor.kind).skills.filter(k=>k.unlock<=actor.level&&!supportSkill(k));let best=1
  for(const k of skills){const source=structuredClone(initial);source.order=[actor.id,...source.order.filter(id=>id!==actor.id)];source.cursor=0;source.units.find(u=>u.id===actor.id)!.mp=3;for(const u of source.units.filter(u=>u.side==='enemy'))u.hp=u.maxHp=1e200;const action=act(source,k.id,enemies[0].id),damage=action.hits.filter(h=>enemies.some(u=>u.id===h.id)).reduce((n,h)=>n+h.damage,0)+(action.resonances??[]).reduce((n,h)=>n+h.damage,0);best=Math.max(best,damage)}burst+=best
 }return Math.max(.01,Math.min(8,.79*hp/Math.max(1,burst)))}
