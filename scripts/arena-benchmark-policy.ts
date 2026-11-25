import type * as model from '../src/arena/model.ts'
import type {State} from '../src/arena/types.ts'
export function battlePolicy(engine:Pick<typeof model,'current'|'heroById'>,s:State){
 const actor=engine.current(s),allies=s.units.filter(u=>u.side==='ally'&&u.hp>0),foes=s.units.filter(u=>u.side==='enemy'&&u.hp>0),weak=[...allies].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0],hero=engine.heroById(actor.id,actor.kind)
 const usable=hero.skills.filter(k=>k.unlock<=actor.level&&k.cost<=actor.mp)
 const healing=usable.filter(k=>k.style==='heal').sort((a,b)=>b.power-a.power)
 const heal=healing.find(k=>k.target==='all-allies'?allies.filter(u=>u.hp/u.maxHp<.8).length>=2:weak.hp/weak.maxHp<.8)
 if(heal)return{skill:heal.id,target:weak.id}
 const shield=usable.find(k=>k.style==='shield'&&allies.some(u=>u.shield<u.maxHp*.15))
 if(shield)return{skill:shield.id,target:weak.id}
 const buff=usable.find(k=>k.style==='command'&&allies.filter(u=>u.attackBuff<1.2).length>=2)
 if(buff)return{skill:buff.id,target:allies[0].id}
 const foe=[...foes].sort((a,b)=>(/치유|사제|드리아드|음유|예언/.test(b.name)?100:0)-(/치유|사제|드리아드|음유|예언/.test(a.name)?100:0)||a.hp-b.hp)[0]
 const attack=usable.filter(k=>k.power>0&&k.target.includes('enem')).sort((a,b)=>b.power*b.hits*(b.target==='all-enemies'?foes.length:Math.min(foes.length,b.targetCount??1))-a.power*a.hits*(a.target==='all-enemies'?foes.length:Math.min(foes.length,a.targetCount??1)))[0]
 return{skill:attack?.id??'basic',target:foe.id}
}
