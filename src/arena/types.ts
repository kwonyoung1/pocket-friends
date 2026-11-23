import type {Kind} from '../game.ts'
export type HeroId=string
export type Element='fire'|'water'|'nature'|'earth'|'light'|'dark'
export type Style='slash'|'orb'|'claw'|'kick'|'slam'|'command'|'heal'|'dash'|'carrot'|'jump'|'shield'|'fire'|'enemy-spit'|'vine'|'shadow'|'frost'|'water'|'root'|'rally'|'purify'|'counter'|'nebula'|'phoenix'|'dragon'|'eclipse'|'aegis'
export type StatusType='burn'|'poison'|'freeze'|'stun'|'regen'|'attack-up'|'defense-up'|'speed-up'|'defense-down'|'slow'|'counter'|'evasion-down'
export type Effect={type:StatusType|'cleanse'|'advance'|'delay'|'dispel';turns:number;power:number;target?:'self'|'all-allies'|'all-enemies';chance?:number}
export type Skill={id:string;name:string;unlock:number;cost:number;target:'enemy'|'ally'|'all-enemies'|'all-allies';style:Style;power:number;hits:number;description:string;effects?:Effect[];pierce?:number;breakPower?:number;bonusDebuff?:number;drain?:number;targetCount?:2|3;upgrade?:number}
export type BaseDefinition={id:HeroId;art:string;name:string;title:string;role:string;cost:number;color:string;hp:number;atk:number;def:number;spd:number;skills:Skill[];mastery:string}
export type Definition=BaseDefinition&{kind:Kind;element:Element;beast?:boolean;supportPower?:number;passive:{name:string;description:string;crit?:number;dodge?:number;reflect?:number;helpHeal?:number;extraOnBreak?:boolean;basicEffect?:Effect;defense10?:number;defense20?:number;defense40?:number;heal10?:number;damage40?:number;break10?:number;break40?:number;debuff40?:number;regen40?:number;counter40?:number}}
export type Status={type:StatusType;turns:number;power:number}
export type Unit={id:string;heroId?:HeroId;kind?:Kind;art:string;name:string;side:'ally'|'enemy';level:number;hp:number;maxHp:number;atk:number;def:number;spd:number;mp:number;shield:number;attackBuff:number;buffUntil:number;turns:number;boss:boolean;tauntUntil:number;dodge:number;element:Element;weakness:Element[];toughness:number;maxToughness:number;broken:boolean;controlImmune:number;statuses:Status[];extraRound?:number;monsterId?:string;stars?:number;training?:import('./shop-state.ts').Training;skillLevels?:Partial<Record<string,number>>}
export type State={units:Unit[];order:string[];cursor:number;round:number;wave:number;phase:'battle'|'victory'|'defeat';seed:number;level:number;actions:number;allyActions:number;totalDamage:number;totalHeal:number;log:string[];stageId?:string;maxWaves:number;synergies:string[];rules?:number;costLimit?:number;summons?:number}
export type Hit={id:string;damage:number;heal:number;shield:number;critical:boolean;miss:boolean;buff?:boolean;break?:boolean;status?:string;counter?:number}
export type Action={actor:string;skill:Skill;targets:string[];hits:Hit[];next:State;message:string;ultimate:boolean;resonances?:ResonanceHit[]}
export type Profile={level:number;name:string;kind?:Kind;mastery?:number;gear?:number;stars?:number;training?:import('./shop-state.ts').Training;skillLevels?:Partial<Record<string,number>>}
export type Profiles=Readonly<Record<string,Profile>>
export type Move={skill:string;target:string}

export type ResonanceHit={id:string;element:Element;damage:number;absorbed:number;break:boolean;sources:string[]}
