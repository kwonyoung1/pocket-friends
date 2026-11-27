import type {Skill} from './types.ts'
/** Rules 9: hand-tuned per-hit values. Preserve IDs, unlocks, costs and native hit counts. */
export const SKILL_BALANCE:Record<string,Partial<Record<string,Partial<Skill>>>>={
 'special-boy':{active2:{power:1.65},ultimate:{power:1.85,pierce:.35}},
 'special-girl':{ultimate:{power:2.2,shieldAll:.12,effects:[{type:'cleanse',turns:0,power:0},{type:'regen',turns:3,power:.09}]}},
 momo:{active2:{power:1.35},ultimate:{power:1.55}},
 bibi:{active2:{power:2.55},ultimate:{power:1.45,pierce:.45}},
 dudu:{active2:{power:2.7},ultimate:{power:1.3,pierce:.75}},
 byeol:{ultimate:{power:1.55,pierce:.25}},
 'beast-nebula':{active1:{power:1.15},active2:{power:3.2},ultimate:{power:2.05,pierce:.5}},
 'beast-astra':{ultimate:{power:1.8}},
 'beast-eclipse':{active1:{power:.65},active2:{power:1.4},ultimate:{power:1.25,bonusDebuff:.25}},
 'beast-seraphia':{active2:{power:1.35,shieldAll:.25,effects:[{type:'cleanse',turns:0,power:0},{type:'regen',turns:2,power:.12}]},ultimate:{power:1.85,shieldAll:.15}},
 'adv-aria':{ultimate:{power:1.2,pierce:.5}},
 'adv-kai':{active2:{power:1.2},ultimate:{power:1.05,pierce:.3}},
 'adv-serin':{active2:{power:1.9},ultimate:{power:1.1,pierce:.45}},
 'adv-sion':{ultimate:{power:1.3,pierce:.45}},
 'adv-rose':{active2:{power:2},ultimate:{power:1.25,pierce:.4,bonusDebuff:.2}},
 'adv-lucian':{active2:{power:1.55},ultimate:{power:1.5,pierce:.25}},
}
export function balancedSkills(id:string,skills:Skill[]):Skill[]{return skills.map(k=>({...k,...SKILL_BALANCE[id]?.[k.id]}))}
