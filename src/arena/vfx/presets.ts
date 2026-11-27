import {monsterById} from '../stages.ts'
import {BEASTS} from '../beasts.ts'
import {ADVENTURERS} from '../adventurers.ts'
import type {Element,Skill,Unit} from '../types.ts'
export type Quality='low'|'medium'|'high'
export type Family='blade'|'flame'|'frost'|'constellation'|'rift'|'bloom'|'quake'|'nebula'|'alchemy'|'moon'|'wing'|'arrow'|'carrot'|'guardian'
export type Motif='spark'|'flame'|'ice'|'star'|'smoke'|'leaf'|'rock'|'drop'|'feather'|'blade'|'moon'|'petal'
export const budgets:Record<Quality,{particles:number;shapes:number;density:number}>={low:{particles:32,shapes:8,density:.35},medium:{particles:80,shapes:16,density:.65},high:{particles:144,shapes:24,density:1}}
export const elements:Record<Element,{color:number;core:number;motif:Motif;family:Family}>={fire:{color:0xff8449,core:0xffe4a7,motif:'flame',family:'flame'},water:{color:0x80daff,core:0xe7ffff,motif:'ice',family:'frost'},light:{color:0xffd884,core:0xffffeb,motif:'star',family:'constellation'},dark:{color:0x9f7cef,core:0xead6ff,motif:'smoke',family:'rift'},nature:{color:0x98d89c,core:0xe0ffd1,motif:'leaf',family:'bloom'},earth:{color:0xc9a071,core:0xffe3af,motif:'rock',family:'quake'}}
const styles:Partial<Record<Skill['style'],Family>>={slash:'blade',claw:'blade',kick:'quake',slam:'quake',dash:'blade',shadow:'rift',eclipse:'rift',fire:'flame',phoenix:'wing',frost:'frost',water:'frost',root:'bloom',vine:'bloom',heal:'moon',shield:'moon',counter:'moon',purify:'moon',aegis:'guardian',command:'constellation',rally:'constellation',meteor:'constellation',supernova:'nebula',nebula:'nebula',dragon:'constellation',judgment:'blade',potion:'alchemy',alchemy:'alchemy',arrow:'arrow','arrow-rain':'arrow',carrot:'carrot'}
const signatures:Record<string,Family>={'special-boy':'blade','special-girl':'moon','beast-nebula':'nebula','beast-phynix':'wing','adv-sion':'frost','adv-rose':'alchemy','adv-lucian':'blade','beast-seraphia':'guardian'}
/** Presentation data only: neither damage nor hit count is inferred from rarity. */
export function vfxPreset(u:Unit,k:Skill,ultimate=false){const d=[...BEASTS,...ADVENTURERS].find(d=>d.id===u.heroId),tier=d?({rare:1,heroic:2,legendary:3,mythic:4} as const)[d.rarity]:u.boss?3:u.monsterId&&monsterById(u.monsterId)?.rank==='elite'?2:1,friendly=k.target==='ally'||k.target==='all-allies',palette=elements[u.element],family=friendly?(k.style==='heal'||k.style==='purify'?'moon':u.heroId==='beast-seraphia'?'guardian':styles[k.style]??'moon'):signatures[u.heroId??'']??styles[k.style]??palette.family
 return{...palette,family,tier,stars:Math.max(1,Math.min(5,u.stars??1)),ultimate,friendly,signature:u.heroId??u.monsterId??u.art,strength:ultimate?1.4:k.id==='basic'?.7:1,windup:ultimate?200:k.id==='basic'?60:140,travel:k.id==='basic'?130:210,linger:ultimate?320:k.id==='basic'?75:180,cutin:ultimate?(tier>=4?680:tier>=3?520:320):0}
}
export type Preset=ReturnType<typeof vfxPreset>
