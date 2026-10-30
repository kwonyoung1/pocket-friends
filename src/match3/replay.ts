import {presentationFrames} from './presentation.ts'
import {newChallenge,planMove} from './engine.ts'
import type {Game} from './engine.ts'
import {PlayClock} from './clock.ts'
import type {ClockView} from './clock.ts'
import {rewardFor} from './rules.ts'
export type Turn={a:number;b:number;idleMs:number;atMs:number}
export type RunLog={version:4;turns:Turn[];tailMs:number;elapsedMs:number;ended:'timeout'}
export type Replay={game:Game;clock:ClockView;cursor:number;lastAt:number;maxCombo:number;maxMoveScore:number;minimumBusyMs:number}
export const initialReplay=(seed:number):Replay=>({game:newChallenge(seed),clock:{...new PlayClock(true).value},cursor:0,lastAt:0,maxCombo:0,maxMoveScore:0,minimumBusyMs:0})
const finite=(n:unknown,min=0,max=43200000)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max
export function parseLog(raw:unknown):RunLog{const p=raw as RunLog;if(!p||p.version!==4||p.ended!=='timeout'||!Array.isArray(p.turns)||p.turns.length<3||p.turns.length>2000||!finite(p.elapsedMs)||!finite(p.tailMs,0,30001))throw Error('보상 기록의 형식이나 플레이 길이를 확인해 주세요.');for(const t of p.turns)if(!t||!Number.isInteger(t.a)||!Number.isInteger(t.b)||t.a<0||t.a>63||t.b<0||t.b>63||!finite(t.idleMs)||!finite(t.atMs))throw Error('올바르지 않은 교환 기록이에요.');return {version:4,turns:p.turns.map(t=>({a:t.a,b:t.b,idleMs:t.idleMs,atMs:t.atMs})),tailMs:p.tailMs,elapsedMs:p.elapsedMs,ended:'timeout'}}
/** Bounded replay batches; checkpoint is held only by the service-role database. */
export function replayBatch(previous:Replay,log:RunLog,limit=80){const state=structuredClone(previous),clock=new PlayClock(true);clock.value={...state.clock};let now=0;clock.set('idle',0)
 const end=Math.min(log.turns.length,state.cursor+limit)
 for(;state.cursor<end;state.cursor++){const t=log.turns[state.cursor],gap=t.atMs-state.lastAt;if(gap<0||t.idleMs+state.minimumBusyMs>gap+.1||state.cursor>0&&gap<45||t.atMs>log.elapsedMs)throw Error('입력 시간 순서가 실제 플레이와 맞지 않아요.');clock.level=state.game.difficulty??1;now+=t.idleMs;clock.tick(now);if(clock.value.expired)throw Error('시간 종료 뒤에 입력된 교환이에요.');const move=planMove({...state.game,eligibleMs:clock.value.survivalMs},t.a,t.b,clock.value.combo+1);if(!move.valid)throw Error('서버에서 재현할 수 없는 교환이에요.');state.minimumBusyMs=Math.max(0,(presentationFrames(move.frames).length-1)*18);clock.valid();state.maxCombo=Math.max(state.maxCombo,clock.value.combo);state.maxMoveScore=Math.max(state.maxMoveScore,move.game.score-state.game.score);state.game=move.game;state.lastAt=t.atMs}
 if(state.cursor===log.turns.length){if(log.tailMs+state.minimumBusyMs>log.elapsedMs-state.lastAt+.1)throw Error('종료 시간이 플레이 기록과 맞지 않아요.');clock.level=state.game.difficulty??1;clock.tick(now+log.tailMs);if(clock.value.remainingMs>.01)throw Error('정상 시간 종료 기록만 보상을 받을 수 있어요.')}
 state.clock={...clock.value};const complete=state.cursor===log.turns.length;return {state,complete,reward:complete?rewardFor(state.game.score,state.maxCombo,clock.value.longestComboMs):null}
}
