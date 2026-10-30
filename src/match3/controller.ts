import {durations} from './config'
import {newGame,newChallenge,planMove,moves,adjacent} from './engine'
import type {Game,Frame,Phase} from './engine'
import {readRecords,saveRecords,mergeRecords} from './records'
import type {Records} from './records'
import {PlayClock} from './clock'
import type {ClockView} from './clock'
import {presentationFrames} from './presentation'
import {includeResult} from './result'
import type {ChallengeResult} from './result'
export type View={game:Game;frame:Frame|null;phase:Phase;paused:boolean;selected:number|null;hint:number[];notice:string;records:Records;record:boolean;modeSelect:boolean;combo:number;bestCombo:number;breakId:number;bonusId:number;lastAddedMs:number;lastTurnGain:number;maxMoveScore:number;result:ChallengeResult|null}
/** Independent session. Countdown subscriptions are separate from board/phase subscriptions. */
export class MatchController{
 private listeners=new Set<()=>void>();private timeListeners=new Set<()=>void>();private raf=0;private last=0;private elapsed=0;private frames:Frame[]=[];private final:Game|null=null;private active=false;private completed=false;private speed=1;private clock:PlayClock;private time:ClockView;private publishedAt=0;private runId=crypto.randomUUID();private turns=0
 private view:View
 constructor(initial?:Game,private reduced=false){const records=readRecords(),game=initial??newGame();this.clock=new PlayClock(game.mode==='challenge',performance.now());this.time={...this.clock.value};this.view={game,frame:null,phase:'IDLE',paused:false,selected:null,hint:[],notice:'보석 두 개를 고르거나 밀어서 바꿔 보세요.',records,record:false,modeSelect:!initial,combo:0,bestCombo:0,breakId:0,bonusId:0,lastAddedMs:0,lastTurnGain:0,maxMoveScore:0,result:null}}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
 snapshot=()=>this.view
 subscribeTime=(fn:()=>void)=>{this.timeListeners.add(fn);return()=>{this.timeListeners.delete(fn)}}
 timeSnapshot=()=>this.time
 setReduced(value:boolean){this.reduced=value}
 private update(p:Partial<View>){this.view={...this.view,...p};this.listeners.forEach(fn=>fn())}
 private publish(force=false){const now=performance.now(),v=this.clock.value,changed=v.comboMs!==this.time.comboMs||v.remainingMs!==this.time.remainingMs||v.expired!==this.time.expired;if(force||changed&&now-this.publishedAt>=90){this.publishedAt=now;this.time={...v};this.timeListeners.forEach(fn=>fn())}}
 private charge(now:number){const combo=this.clock.value.combo;this.clock.tick(now)
  if(this.clock.value.expired&&!this.completed){this.endChallenge('timeout');return}
  if(combo&&!this.clock.value.combo)this.update({combo:0,breakId:this.view.breakId+1,notice:'COMBO BREAK · 다음 매치는 새 콤보로 시작해요.'})
 }
 start(){this.active=true;this.last=performance.now();this.clock.set(this.view.modeSelect?'stopped':'idle',this.last);this.wake()}
 dispose(){if(this.view.game.mode==='challenge'&&!this.completed&&!this.view.modeSelect)this.endChallenge('quit');this.active=false;cancelAnimationFrame(this.raf)}
 checkpoint(){if(this.view.game.mode!=='challenge'||this.completed||this.view.modeSelect)return;this.charge(performance.now());if(this.completed)return;const saved=saveRecords({...this.view.records,challenge:includeResult(this.view.records.challenge,this.result('quit'))});this.view={...this.view,records:saved.records};this.pause(true)}
 private loop=(now:number)=>{
  if(!this.active)return
  const delta=Math.max(0,Math.min(now-this.last,100));this.last=now;this.charge(now)
  if(!this.view.paused&&this.frames.length){this.elapsed+=delta;const duration=this.reduced?18:Math.max(20,durations[this.view.phase]*this.speed);if(this.elapsed>=duration){this.elapsed=0;this.advance(now)}}
  this.publish();if(!this.view.paused&&(this.frames.length||this.clock.running)&&!this.completed&&!this.view.modeSelect)this.raf=requestAnimationFrame(this.loop)
 }
 private wake(){if(!this.active)return;cancelAnimationFrame(this.raf);this.last=performance.now();if(!this.view.paused&&!this.view.modeSelect&&(this.frames.length||this.clock.running))this.raf=requestAnimationFrame(this.loop)}
 private result(ended:ChallengeResult['ended']):ChallengeResult{return {id:this.runId,at:Date.now(),ended,score:this.final?.score??this.view.game.score,survivalMs:this.clock.value.survivalMs,playMs:this.clock.value.playMs,maxCombo:this.view.bestCombo,maxMoveScore:this.view.maxMoveScore,difficulty:this.final?.difficulty??this.view.game.difficulty??1,turns:this.turns}}
 private endChallenge(ended:ChallengeResult['ended']){
  if(this.completed)return;this.clock.set('stopped',performance.now());const result=this.result(ended),saved=saveRecords({...this.view.records,challenge:includeResult(this.view.records.challenge,result)})
  this.completed=true;this.frames=[];this.final=null;this.clock.break();this.update({game:{...this.view.game,status:'lost',score:result.score},frame:null,phase:'IDLE',combo:0,breakId:this.view.breakId+1,records:saved.records,result,notice:ended==='timeout'?'시간 종료! 멋진 도전이었어요.':'도전 기록을 보관했어요.'});this.publish(true)
 }
 private advance(now:number){
  this.frames.shift();const frame=this.frames[0]
  if(frame&&frame.phase!=='IDLE'){this.update({frame,phase:frame.phase});return}
  this.frames=[];if(!this.final)return
  const game=this.final,turnGain=game.score-this.view.game.score;this.final=null;let records=this.view.records,record=false
  if(game.mode==='challenge'){record=game.score>records.challenge.bestScore;const result={...this.result('quit'),score:game.score,difficulty:game.difficulty??1};records={...records,challenge:includeResult(records.challenge,result,false)}}
  else{record=game.score>records.bests[game.stage-1];records={...records,bests:records.bests.map((n,i)=>i===game.stage-1?Math.max(n,game.score):n),unlocked:game.status==='won'?Math.max(records.unlocked,Math.min(30,game.stage+1)):records.unlocked}}
  const saved=saveRecords(records);this.completed=game.status!=='playing';if(this.completed){this.clock.break();this.clock.set('stopped',now)}else this.clock.set('idle',now)
  this.update({game,frame:null,phase:'IDLE',records:saved.records,record,combo:this.clock.value.combo,breakId:this.completed&&this.view.combo?this.view.breakId+1:this.view.breakId,lastTurnGain:turnGain,notice:!saved.ok?'기록을 저장하지 못했어요. 저장 공간을 확인해 주세요.':game.status==='won'?'스테이지 클리어! 다음 모험이 열렸어요.':game.status==='lost'?'아깝다! 다시 한번 도전해 볼까요?':game.reshuffles>this.view.game.reshuffles?'입력 시간을 멈추고 보석을 안전하게 섞었어요.':'다음 보물을 연결해 보세요.'});this.publish(true)
 }
 move(a:number,b:number){
  if(this.view.paused||this.view.phase!=='IDLE'||this.completed||this.view.modeSelect)return
  const at=performance.now();this.charge(at);if(this.completed)return
  this.clock.set('busy',at);let plan:ReturnType<typeof planMove>
  try{plan=planMove(this.view.game.mode==='challenge'?{...this.view.game,eligibleMs:this.clock.value.survivalMs}:this.view.game,a,b,this.clock.value.combo+1)}catch{this.clock.set('idle',performance.now());this.update({selected:null,hint:[],notice:'다른 보석을 고르거나 다시 시작해 주세요.'});this.wake();return}
  if(!plan.frames.length){this.clock.set('idle',performance.now());this.update({selected:null,hint:[],notice:'얼음을 깨거나 이웃한 보석을 골라 주세요.'});this.wake();return}
  if(plan.valid){const before=this.clock.value.remainingMs;this.clock.valid();this.turns++;const combo=this.clock.value.combo;this.update({combo,bestCombo:Math.max(combo,this.view.bestCombo),bonusId:this.view.bonusId+(this.view.game.mode==='challenge'?1:0),lastAddedMs:this.clock.value.remainingMs-before,maxMoveScore:Math.max(this.view.maxMoveScore,plan.game.score-this.view.game.score)})}
  this.final=plan.game;this.frames=presentationFrames(plan.frames);this.speed=Math.min(1,1000/this.frames.reduce((n,f)=>n+durations[f.phase],0));this.elapsed=0;this.update({frame:this.frames[0],phase:this.frames[0].phase,selected:null,hint:[],record:false,notice:plan.valid?'반짝! 연속 매치를 이어가요.':'매치가 없어 돌아가요. 콤보 시간은 갱신되지 않아요.'});this.publish(true);this.wake()
 }
 choose(i:number){if(this.view.phase!=='IDLE'||this.view.paused||this.completed||this.view.modeSelect)return;this.charge(performance.now());if(this.completed)return;const a=this.view.selected;if(a!==null&&adjacent(a,i))this.move(a,i);else this.update({selected:a===i?null:i,hint:[]})}
 hint(){if(this.view.game.mode==='challenge')return;if(this.view.phase!=='IDLE'||this.view.paused||this.completed||this.view.modeSelect)return;const at=performance.now();this.charge(at);if(this.completed)return;this.clock.set('busy',at);const move=moves(this.view.game.board,this.view.game.ice)[0];this.clock.set('idle',performance.now());this.update({hint:move?[move.a,move.b]:[],notice:move?'빛나는 두 보석을 서로 바꿔 보세요.':'보드를 다시 시작할 수 있어요.'});this.publish(true);this.wake()}
 pause(value=!this.view.paused){if(this.completed||this.view.modeSelect)return;const now=performance.now();this.charge(now);if(this.completed)return;this.clock.set(value?'paused':this.frames.length?'busy':'idle',now);this.update({paused:value,selected:null});this.publish(true);if(value)cancelAnimationFrame(this.raf);else this.wake()}
 selectMode(mode:'stage'|'challenge',stage=1){if(mode==='stage'&&(stage<1||stage>this.view.records.unlocked))return
  if(this.view.game.mode==='challenge'&&!this.completed&&!this.view.modeSelect)this.endChallenge('quit')
  cancelAnimationFrame(this.raf);const game=mode==='challenge'?newChallenge():newGame(stage);this.frames=[];this.final=null;this.completed=false;this.elapsed=0;this.turns=0;this.runId=crypto.randomUUID();const now=performance.now();this.clock=new PlayClock(mode==='challenge',now);this.clock.set('idle',now)
  this.update({game,frame:null,phase:'IDLE',paused:false,selected:null,hint:[],record:false,modeSelect:false,combo:0,bestCombo:0,breakId:0,bonusId:0,lastAddedMs:0,lastTurnGain:0,maxMoveScore:0,result:null,notice:mode==='challenge'?'30초 도전 시작! 직접 매치마다 +5초, 최대 30초예요.':'5초 안에 다음 매치를 이어가 보세요!'});this.publish(true);this.wake()
 }
 restart(stage=this.view.game.stage){this.selectMode(this.view.game.mode==='challenge'?'challenge':'stage',stage)}
 toModes(){if(this.view.game.mode==='challenge'&&!this.completed&&!this.view.modeSelect)this.endChallenge('quit');this.frames=[];this.final=null;this.clock.set('stopped',performance.now());this.clock.break();cancelAnimationFrame(this.raf);this.update({modeSelect:true,paused:false,combo:0,selected:null,hint:[]});this.publish(true)}
 setting<K extends 'sound'|'shake'|'effects'>(key:K,value:Records[K]){const saved=saveRecords({...this.view.records,[key]:value});this.update({records:saved.records})}
 sound(){this.setting('sound',!this.view.records.sound)}
 refreshRecords(){const incoming=readRecords();this.update({records:mergeRecords({...this.view.records,sound:incoming.sound,shake:incoming.shake,effects:incoming.effects},incoming)})}
}
