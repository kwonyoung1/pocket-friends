import {heroById,advantages,elementNames} from './characters.ts'
import {starsOf} from './fusion.ts'
import type {Element,ResonanceHit,State,Unit} from './types.ts'
const elements:Element[]=['fire','water','nature','earth','light','dark']
export type Resonance={element:Element;ratio:number;sources:string[];stars:number}
export const resonanceName=(element:Element)=>`${elementNames[element]} 공명`
/** Only living OTHER beasts contribute. Each distinct native element fires once. */
export type ResonanceSource=Pick<Unit,'side'|'hp'|'id'|'heroId'|'kind'|'element'|'stars'>
export function activeResonances(units:readonly ResonanceSource[],actorId?:string):Resonance[]{
 const groups=elements.flatMap(element=>{const sources=units.filter(u=>u.side==='ally'&&u.hp>0&&u.id!==actorId&&u.element===element&&u.heroId&&heroById(u.heroId,u.kind)?.beast);return sources.length?[{element,sources:sources.map(u=>u.id),stars:Math.max(...sources.map(starsOf))}]:[]})
 const weights=[.2,.15,.1,.05,.025,.025],ratios=groups.map((g,i)=>(weights[i]??.025)+(g.stars-1)*.01+(g.sources.length>1?.01:0)),sum=ratios.reduce((n,v)=>n+v,0)
 return groups.map((g,i)=>({...g,ratio:ratios[i]*Math.min(1,.5/sum)}))
}
/** One bounded post-hit pass, never act()/effects()/counter(), so echoes cannot recurse. */
export function applyResonances(s:State,actor:Unit,targets:Unit[]):ResonanceHit[]{
 if(actor.side!=='ally'||!targets.length)return []
 const groups=activeResonances(s.units,actor.id),out:ResonanceHit[]=[];let remaining=Math.floor(actor.atk*.5)
 for(const g of groups)for(const t of targets){
  const raw=Math.floor(actor.atk*g.ratio/targets.length),elemental=advantages[g.element].includes(t.element)?1.15:advantages[t.element].includes(g.element)?.9:1
  const total=Math.max(0,Math.min(remaining,Math.round((raw-t.def*.15)*elemental))),absorbed=t.hp>0?Math.min(t.shield,total):0,damage=t.hp>0?Math.min(t.hp,total-absorbed):0
  t.shield-=absorbed;t.hp-=damage;remaining-=absorbed+damage;s.totalDamage+=damage;let broke=false
  if(t.hp>0&&t.maxToughness&&t.controlImmune===0&&!t.broken&&t.weakness.includes(g.element)){t.toughness=Math.max(0,Math.round((t.toughness-.25/Math.max(1,groups.length))*100)/100);if(t.toughness===0){t.broken=true;t.controlImmune=3;broke=true}}
  out.push({id:t.id,element:g.element,damage,absorbed,break:broke,sources:[...g.sources]})
 }
 return out
}
