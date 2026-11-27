import {performance} from 'node:perf_hooks'
import {writeFileSync} from 'node:fs'
import * as engine from '../src/arena/model.ts'
import {towerLayout,createTowerBattle} from '../src/arena/tower/generator.ts'
import {trainingWork} from '../src/arena/tower/work.ts'
import {towerEfficiency} from '../src/arena/tower/rewards.ts'
import {battlePolicy} from './arena-benchmark-policy.ts'
const party=['special-boy','special-girl','momo','bibi','lulu'],started=performance.now(),rows=[],stats=[]
for(const level of [0,100,500,1000,5000])for(const id of ['special-boy','special-girl','beast-astra','adv-lucian'])stats.push({id,proficiency:level,...engine.combatStats(id,50,undefined,{stars:5,training:{hp:20,atk:20,def:20},proficiencyXp:(BigInt(level)*1000n).toString()})})
for(const profile of ['starter','season','veteran'])for(const floor of ['1','5','10','20','30','50','100'])for(const seed of [1,17,7936,15855]){
 const profiles=Object.fromEntries(party.map(id=>[id,{name:id,level:profile==='starter'?1:50,training:{hp:profile==='starter'?0:20,atk:profile==='starter'?0:20,def:profile==='starter'?0:20},skillLevels:{basic:profile==='starter'?0:5,active1:profile==='starter'?0:5,active2:profile==='starter'?0:5,ultimate:profile==='starter'?0:5},proficiencyXp:profile==='veteran'?'5000000':'0'}]))
 const layout=towerLayout(floor,seed),run={floor,trait:layout.trait,special:layout.special,region:layout.region};let b=createTowerBattle(party,profiles,seed,run,15);const work=trainingWork(b),coefficient=Math.min(150,towerEfficiency('100',floor)+20+(run.special==='gold'?15:run.special==='shadow'?10:0)),xp=Math.max(1,Math.floor(100*work*coefficient/100))
 for(let guard=0;guard<600&&b.phase==='battle';guard++){const actor=engine.current(b);if(actor.side==='enemy')b=engine.enemyAction(b).next;else{const move=battlePolicy(engine,b);b=engine.act(b,move.skill,move.target).next}}
 const modeledSeconds=4+b.allyActions*4+(b.actions-b.allyActions),won=b.phase==='victory';rows.push({profile,floor,seed,special:run.special,trait:run.trait,work,xp:won?xp:0,result:b.phase,allyActions:b.allyActions,enemyActions:b.actions-b.allyActions,modeledSeconds,modeledXPperHour:won?xp*3600/modeledSeconds:0})
}
writeFileSync(process.argv[2]??'/tmp/tower-measurements.json',JSON.stringify({conditions:'Offline actual engine, fixed policy and seeds. XP/hour is a MODEL: 4s setup +4s/player action +1s/enemy action. This is not measured human play time or production traffic. Highest floor100, streak10, no first-clear bonus. CPU duration measures only this offline script.',cpuMilliseconds:performance.now()-started,stats,rows},null,2))
console.log(JSON.stringify({trials:rows.length,grouped:[...new Set(rows.map(r=>r.profile))].flatMap(profile=>['1','5','10','20','30','50','100'].map(floor=>{const r=rows.filter(r=>r.profile===profile&&r.floor===floor);return{profile,floor,wins:r.filter(x=>x.result==='victory').length,meanXP:r.reduce((s,x)=>s+x.xp,0)/r.length,meanModeledXPperHour:r.reduce((s,x)=>s+x.modeledXPperHour,0)/r.length}}))},null,2))
