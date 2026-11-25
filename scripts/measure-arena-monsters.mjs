import * as current from '../src/arena/model.ts'
import * as previous from '../src/arena/legacy-v6/model.ts'
import {STAGES} from '../src/arena/stages.ts'
import {writeFileSync} from 'node:fs'
// Uses public HP/MP/skills only. Never simulates candidates or inspects RNG seeds.
import {battlePolicy} from './arena-benchmark-policy.ts'
export {battlePolicy}

export function run(engine,ids,level,stars,stage,seed=7,trained=false){
 const profiles=Object.fromEntries(ids.map(id=>[id,{name:id,level,stars:typeof stars==='object'?stars[id]??1:stars, ...(trained?{mastery:5,training:{hp:30,atk:30,def:30},skillLevels:{basic:10,active1:10,active2:10,ultimate:10}}:{})}]))
 let s=engine.createBattle(ids,level,seed,profiles,stage,trained?15:10),damage=0,moves=[]
 for(let n=0;n<1500&&s.phase==='battle';n++){
 const enemy=engine.current(s).side==='enemy',m=enemy?null:battlePolicy(engine,s),a=enemy?engine.enemyAction(s):engine.act(s,m.skill,m.target)
 if(enemy)damage+=a.hits.reduce((v,h)=>v+h.damage,0);else moves.push(m)
 s=a.next
 }return{win:s.phase==='victory',phase:s.phase,rounds:s.round,damage,actions:s.actions,moves,state:s}
}
if(process.argv[1]?.endsWith('measure-arena-monsters.mjs')){
 const cases=[{label:'희귀3성 Lv30',ids:['special-boy','special-girl','beast-nebula','momo'],level:30,stars:3,chapters:[3,4,5,6]}, {label:'전설1성 Lv30',ids:['special-boy','special-girl','beast-astra','beast-nebula'],level:30,stars:{'beast-nebula':3},chapters:[5,6]}, {label:'전설 이클립스1성 Lv30',ids:['special-boy','special-girl','beast-eclipse','beast-nebula'],level:30,stars:{'beast-nebula':3},chapters:[5,6]}, {label:'신화1성 Lv30',ids:['special-boy','beast-seraphia','beast-nebula'],level:30,stars:{'beast-nebula':3},chapters:[5,6]}, {label:'완전육성 Lv50',ids:['special-boy','special-girl','beast-astra','beast-nebula','beast-phynix'],level:50,stars:5,trained:true,chapters:[5,6,7,8,9,10,11,12,13,14]}]
 const rows=[]
 for(const c of cases)for(const chapter of c.chapters)for(const stage of (chapter===5&&c.level===30?STAGES.filter(s=>s.chapter===5).map(s=>s.id):[STAGES.find(s=>s.chapter===chapter&&s.boss).id])){
 for(const [version,engine]of [['before6',previous],['after7',current]]){const results=Array.from({length:20},(_,n)=>run(engine,c.ids,c.level,c.stars,stage,17+n*7919,c.trained));rows.push({party:c.label,stage,version,seeds:results.length,wins:results.filter(r=>r.win).length,meanActions:Math.round(results.reduce((v,r)=>v+r.actions,0)/results.length),meanSurvivors:+(results.reduce((v,r)=>v+r.state.units.filter(u=>u.side==='ally'&&u.hp>0).length,0)/results.length).toFixed(2),meanFinalWaveRounds:+(results.reduce((v,r)=>v+r.rounds,0)/results.length).toFixed(1),meanReceivedDamage:Math.round(results.reduce((v,r)=>v+r.damage,0)/results.length)})}}
 console.table(rows);writeFileSync(process.argv[2]??'docs/arena-monsters/benchmark.json',JSON.stringify(rows,null,2)+'\n')
}
