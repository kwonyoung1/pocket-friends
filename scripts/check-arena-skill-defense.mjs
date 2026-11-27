// Offline real-engine sweep. Mutations are confined to this Node process; never import this in the app.
import * as engine from '../src/arena/model.ts'
import {BEASTS} from '../src/arena/beasts.ts'
import {ADVENTURERS} from '../src/arena/adventurers.ts'
import {STAGES} from '../src/arena/stages.ts'
import {auditCast} from '../src/arena/skill-audit.ts'
import {supportSkill} from '../src/arena/targeting.ts'
const heroes=[...engine.HEROES,...BEASTS,...ADVENTURERS]
for(const h of heroes){h.passive.crit=0;for(const k of h.skills)k.critBonus=0}
const maxDefense=Math.max(...STAGES.flatMap(stage=>stage.waves.flatMap((_,wave)=>engine.enemies(stage.level,wave+1,stage.id).map(u=>u.def))))
let cases=0;const failures=new Map()
for(const hero of heroes)for(const upgrade of [0,5,10])for(let def=0;def<=maxDefense;def++){
 const values=hero.skills.slice(1).map(k=>auditCast(engine,hero.id,k.id,upgrade,17,{id:'sweep',count:1,def,shield:0,boss:false}).primary);cases++
 for(let i=1;i<3;i++)if(!supportSkill(hero.skills[i])&&!supportSkill(hero.skills[i+1])&&values[i]<values[i-1]){const key=`${hero.id} +${upgrade} skill${i+1}`,old=failures.get(key);failures.set(key,{from:old?.from??def,to:def,example:old?.example??values})}
}
console.log(JSON.stringify({conditions:'Offline actual engine; level50; crit/critBonus0 in this process only; neutral, no training; every integer DEF0..current monster maximum. Support exempt. This does not prove all gear/stars/debuff/crit outcomes.',maxDefense,cases,failures:[...failures]},null,2))
if(failures.size)process.exitCode=1
