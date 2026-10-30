import {durations} from './config'
import {newGame,planMove,moves,adjacent} from './engine'
import type {Game,Frame,Phase} from './engine'
import {readRecords,saveRecords} from './records'
import type {Records} from './records'
export type View={game:Game;frame:Frame|null;phase:Phase;paused:boolean;selected:number|null;hint:number[];notice:string;records:Records;record:boolean}
/** Local puzzle only: this module has no dependency on the world, cloud client or rewards. */
export class MatchController{
 private listeners=new Set<()=>void>();private raf=0;private last=0;private elapsed=0;private frames:Frame[]=[];private final:Game|null=null;private active=false;private completed=false
 private view:View
 constructor(initial?:Game,private reduced=false){const records=readRecords();this.view={game:initial??newGame(),frame:null,phase:'IDLE',paused:false,selected:null,hint:[],notice:'보석 두 개를 고르거나 밀어서 바꿔 보세요.',records,record:false}}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
 snapshot=()=>this.view
 setReduced(value:boolean){this.reduced=value}
 private update(p:Partial<View>){this.view={...this.view,...p};this.listeners.forEach(fn=>fn())}
 start(){this.active=true;this.last=performance.now();this.raf=requestAnimationFrame(this.loop)}
 dispose(){this.active=false;cancelAnimationFrame(this.raf)}
 private loop=(now:number)=>{
  if(!this.active)return
  const delta=Math.max(0,Math.min(now-this.last,100));this.last=now
  if(!this.view.paused&&this.frames.length){this.elapsed+=delta;const duration=this.reduced?25:durations[this.view.phase];if(this.elapsed>=duration){this.elapsed=0;this.advance()}}
  // No permanent animation loop when idle or paused.
  if(this.frames.length&&!this.view.paused)this.raf=requestAnimationFrame(this.loop)
 }
 private wake(){if(!this.active)return;cancelAnimationFrame(this.raf);this.last=performance.now();this.raf=requestAnimationFrame(this.loop)}
 private advance(){
  this.frames.shift();const frame=this.frames[0]
  if(frame&&frame.phase!=='IDLE'){this.update({frame,phase:frame.phase});return}
  this.frames=[]
  if(!this.final)return
  const game=this.final;this.final=null;const best=this.view.records.bests[game.stage-1],record=game.score>best
  const records={...this.view.records,bests:this.view.records.bests.map((n,i)=>i===game.stage-1?Math.max(n,game.score):n),unlocked:game.status==='won'?Math.max(this.view.records.unlocked,Math.min(30,game.stage+1)):this.view.records.unlocked}
  const saved=saveRecords(records);this.completed=game.status!=='playing'
  this.update({game,frame:null,phase:'IDLE',records:saved.records,record,notice:!saved.ok?'이 기기에 기록을 저장하지 못했어요. 저장 공간을 확인해 주세요.':game.status==='won'?'스테이지 클리어! 다음 모험이 열렸어요.':game.status==='lost'?'아깝다! 다시 한번 도전해 볼까요?':game.reshuffles>this.view.game.reshuffles?'가능한 이동이 없어 보석을 새로 섞었어요.':'다음 보물을 연결해 보세요.'})
 }
 move(a:number,b:number){
  if(this.view.paused||this.view.phase!=='IDLE'||this.completed)return
  let plan:ReturnType<typeof planMove>
  try{plan=planMove(this.view.game,a,b)}catch{this.update({selected:null,hint:[],notice:'이 교환을 마치지 못했어요. 다시 시작하거나 다른 보석을 골라 주세요.'});return}
  if(!plan.frames.length){this.update({selected:null,hint:[],notice:'얼음을 깨거나 이웃한 보석을 골라 주세요.'});return}
  this.final=plan.game;this.frames=plan.frames;this.elapsed=0;this.update({frame:plan.frames[0],phase:plan.frames[0].phase,selected:null,hint:[],record:false,notice:plan.valid?'반짝! 보물이 이어지고 있어요.':'매치가 없어 제자리로 돌아가요. 이동 횟수는 그대로예요.'});this.wake()
 }
 choose(i:number){if(this.view.phase!=='IDLE'||this.view.paused||this.completed)return;const a=this.view.selected;if(a!==null&&adjacent(a,i))this.move(a,i);else this.update({selected:a===i?null:i,hint:[]})}
 hint(){if(this.view.phase!=='IDLE'||this.view.paused||this.completed)return;const move=moves(this.view.game.board,this.view.game.ice)[0];this.update({hint:move?[move.a,move.b]:[],notice:move?'빛나는 두 보석을 서로 바꿔 보세요.':'다시 시작하면 새 보드로 도전할 수 있어요.'})}
 pause(value=!this.view.paused){this.update({paused:value,selected:null});if(value)cancelAnimationFrame(this.raf);else this.wake()}
 restart(stage=this.view.game.stage){if(stage<1||stage>this.view.records.unlocked)return;cancelAnimationFrame(this.raf);this.frames=[];this.final=null;this.completed=false;this.elapsed=0;this.update({game:newGame(stage),frame:null,phase:'IDLE',paused:false,selected:null,hint:[],record:false,notice:'새로운 보물 모험을 시작해요!'})}
 sound(){const saved=saveRecords({...this.view.records,sound:!this.view.records.sound});this.update({records:saved.records})}
 refreshRecords(){const incoming=readRecords();this.update({records:{...this.view.records,unlocked:Math.max(incoming.unlocked,this.view.records.unlocked),bests:incoming.bests.map((n,i)=>Math.max(n,this.view.records.bests[i]))}})}
}
