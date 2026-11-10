import type {AnimalKind} from './assets'
export type MotionState='Idle'|'WalkStart'|'Walk'|'WalkFast'|'Turn'|'WalkStop'|'Sit'|'Rest'|'Sleep'|'WakeUp'|'Drag'
export type LifePose='idle'|'blink'|'sit'|'sleep'|'stretch'|'groom'|'yawn'|'look'
export type MotionInput={x:number;y:number;moving:boolean;facing:number;held:boolean;sleeping:boolean;resting:boolean;expression:string;activity?:LifePose}
export type MotionOutput={state:MotionState;frame:number;life:LifePose;walkOpacity:number;speed:number;direction:'left'|'right'|'front'|'back'}
const strides:Record<AnimalKind,number>={cat:40,dog:36,bear:44,fox:44,bunny:28}
const speeds:Record<AnimalKind,number>={cat:35,dog:35,bear:29,fox:42,bunny:35}
/** Read-only visual state: distance, not a clock-only animation, advances feet. */
export class AnimalMotion{
 private previous?:MotionInput
 private state:MotionState='Idle'
 private until=0
 private phase=0
 private speed=0
 private velocityTime=0
 private velocityDistance=0
 private direction:MotionOutput['direction']='right'
 constructor(private kind:AnimalKind){}
 update(input:MotionInput,now:number,dt:number):MotionOutput{
  const old=this.previous,dx=old?input.x-old.x:0,dy=old?input.y-old.y:0,distance=Math.hypot(dx,dy)
  this.previous={...input}
  // Large server reconciliations, resumed tabs and drag drops are not steps.
  const correction=distance>64||dt>.25||dt<=0
  const walking=input.moving&&!input.held&&!input.sleeping
  if(walking&&!correction&&distance>0){this.phase=(this.phase+distance/strides[this.kind]*8)%8;this.direction=Math.abs(dy)>Math.abs(dx)*1.2?(dy>0?'front':'back'):(dx<0?'left':'right')}
  if(walking&&!correction){this.velocityTime+=dt;this.velocityDistance+=distance;if(this.velocityTime>=.12){const measured=this.velocityDistance/this.velocityTime;this.speed=this.speed?this.speed*.55+measured*.45:measured;this.velocityTime=0;this.velocityDistance=0}}else{this.velocityTime=0;this.velocityDistance=0}
  if(input.sleeping){this.state='Sleep';this.until=0;this.speed=0}
  else if(input.held){this.state='Drag';this.until=0;this.speed=0}
  else if(this.state==='Sleep'){this.state='WakeUp';this.until=now+320}
  else if(this.state==='WakeUp'&&now<this.until){/* Finish the seated wake transition. */}
  else if(walking){
   if(old&&old.facing!==input.facing){this.state='Turn';this.until=now+140}
   else if(!['WalkStart','Walk','WalkFast','Turn'].includes(this.state)){this.state='WalkStart';this.until=now+160}
   else if(now>=this.until)this.state=this.speed>speeds[this.kind]*1.2?'WalkFast':'Walk'
  }else if(['WalkStart','Walk','WalkFast','Turn'].includes(this.state)){this.state='WalkStop';this.until=now+180;this.speed=0}
  else if(now>=this.until){this.state=input.resting?'Rest':input.activity==='sit'?'Sit':'Idle';this.speed=0}
  const active=['WalkStart','Walk','WalkFast','Turn'].includes(this.state)
  const opacity=this.state==='WalkStart'?Math.max(0,Math.min(1,1-(this.until-now)/160)):this.state==='WalkStop'?Math.max(0,Math.min(1,(this.until-now)/180)):this.state==='Turn'?.35:active?1:0
  let life:LifePose=this.state==='Sleep'?'sleep':this.state==='WakeUp'?'sit':this.state==='Rest'?'sit':this.state==='Turn'?'look':input.activity??'idle'
  if(life==='idle'&&['closed','smile','happy'].includes(input.expression))life='blink'
  return{state:this.state,frame:Math.floor(this.phase),life,walkOpacity:opacity,speed:this.speed,direction:this.direction}
 }
}
