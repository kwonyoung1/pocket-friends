import {PlayClock} from '../src/match3/clock'
import {timeRates} from '../src/match3/rules'
import type {RunLog} from '../src/match3/replay'
import {moves,planMove,newChallenge} from '../src/match3/engine'
export function transcript(seed=66,count=100,version:4|5=4){let game=newChallenge(seed,version),at=0,last=0;const clock=new PlayClock(true,0,version);clock.set('idle',0);const turns=[]
 for(let i=0;i<count;i++){const dt=version===4?1000:500;at+=dt+800;clock.level=game.difficulty??1;clock.tick(last+dt);const m=moves(game.board)[0];turns.push({...m,idleMs:dt,atMs:at});game=planMove({...game,eligibleMs:clock.value.survivalMs},m.a,m.b,clock.value.combo+1).game;clock.valid();last+=dt}
 clock.level=game.difficulty??1;const tailMs=clock.value.remainingMs/timeRates(version)[clock.level-1];clock.tick(last+tailMs);return {log:{version,turns,tailMs,elapsedMs:at+tailMs+800,ended:'timeout'} as RunLog,game,clock}
}
