import * as current from '../src/arena/model.ts'
import * as previous from '../src/arena/legacy-v6/model.ts'
import {STAGES,monsterById} from '../src/arena/stages.ts'
import {writeFileSync} from 'node:fs'
const results=[],stats=[]
// Same full-health defender, no shield, same seeds; damage is HP actually lost.
for(let chapter=1;chapter<=14;chapter++){
 const stage=STAGES.find(s=>s.chapter===chapter&&s.boss)
 for(const rank of ['normal','elite','boss']){
  const unit=(m)=>Array.from({length:stage.waves.length},(_,i)=>m.enemies(stage.level,i+1,stage.id)).flat().find(u=>monsterById(u.monsterId)?.rank===rank)
  const old=unit(previous),next=unit(current);if(!old||!next)continue
  stats.push({chapter,stage:stage.id,rank,monster:old.monsterId,name:old.name,before:{hp:old.maxHp,atk:old.atk,def:old.def},after:{hp:next.maxHp,atk:next.atk,def:next.def}})
  for(const trained of [false,true]){
   const row={chapter,stage:stage.id,rank,defender:trained?'Lv50 코코 · 마스터리5/훈련30':'Lv30 영이 · 무강화'}
   for(const [key,m]of [['before',previous],['after',current]]){
    const samples=[]
    for(let i=0;i<20;i++){
     const ids=trained?['special-boy','coco']:['special-boy','special-girl','momo','bibi'],level=trained?50:30,profiles=trained?Object.fromEntries(ids.map(id=>[id,{name:id,level,mastery:5,training:{hp:30,atk:30,def:30}}])):undefined
     let s=m.createBattle(ids,level,17+i*7919,profiles,stage.id);const enemy=unit(m),target=trained?'coco':'special-boy'
     s.units=s.units.filter(u=>u.side==='ally').concat(enemy);s.units.forEach(u=>{u.shield=0});s.order=[enemy.id,...s.units.filter(u=>u.side==='ally').map(u=>u.id)];s.cursor=0
     samples.push(m.act(s,'basic',target).hits.find(h=>h.id===target).damage)
    }row[key]=+(samples.reduce((v,n)=>v+n,0)/samples.length).toFixed(1)
   }row.changePercent=+((row.after/row.before-1)*100).toFixed(1);results.push(row)
  }
 }
}
console.table(results.filter(r=>r.rank==='boss'));writeFileSync('docs/arena-monsters/enemy-hit-comparison.json',JSON.stringify(results,null,2)+'\n');writeFileSync('docs/arena-monsters/enemy-stats.json',JSON.stringify(stats,null,2)+'\n')
