import {count} from './state.ts'
import type {TowerProgress,TowerReward} from './state.ts'
import type {ArenaTicket} from '../state.ts'
export function towerEfficiency(highest:string,floor:string){const gap=count(highest)-count(floor);return gap<=5n?110:gap<=15n?100:gap<=30n?90:gap<=50n?75:50}
export function awardTower(t:TowerProgress,ticket:ArenaTicket,work=1):TowerReward{const run=ticket.tower!;const first=count(run.floor)>count(t.highest),streak=Math.min(10,t.streak+1),efficiency=towerEfficiency(t.highest,run.floor),bonus=streak*2+(run.special==='gold'?15:run.special==='shadow'?10:0)+(first?10:0),xp=Math.max(1,Math.floor(100*Math.max(.01,Math.min(8,work))*Math.min(150,efficiency+bonus)/100)),members=ticket.party.map(id=>{const p=t.proficiency[id]??={xp:'0',level:'0'},before=p.level;p.xp=(count(p.xp)+BigInt(xp)).toString();p.level=(count(p.xp)/1000n).toString();return{id,name:ticket.profiles[id].name,xp:p.xp,before,level:p.level}})
 if(first)t.highest=run.floor;t.firstThrough=t.highest;t.recent=run.floor;t.wins=(count(t.wins)+1n).toString();t.streak=streak;return t.lastReward={runId:ticket.id,floor:run.floor,xp,work,efficiency,streak,first,highest:first,wins:t.wins,members}}
