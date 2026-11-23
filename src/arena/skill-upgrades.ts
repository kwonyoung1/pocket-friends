import type {Skill} from './types.ts'
import {supportSkill} from './targeting.ts'
import {bounded} from './shop-state.ts'
export function upgradedSkill(base:Skill,level?:number):Skill{const n=bounded(level,10);if(!n)return base;const scale=1+n*.03,supportScale=1+n*.02;return{...base,upgrade:n,power:base.power*scale,effects:supportSkill(base)?base.effects?.map(e=>['regen','attack-up','defense-up','speed-up','counter'].includes(e.type)?{...e,power:e.power*supportScale}:e):base.effects}}
