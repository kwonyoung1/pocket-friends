/** All gameplay time is monotonic. Only idle, unpaused, input-eligible time drains either budget. */
export type ClockView={combo:number;comboMs:number;remainingMs:number;survivalMs:number;playMs:number;expired:boolean}
export class PlayClock{
 private at=0;private state:'idle'|'busy'|'paused'|'stopped'='stopped'
 value:ClockView={combo:0,comboMs:0,remainingMs:30000,survivalMs:0,playMs:0,expired:false}
 constructor(readonly challenge=false,now=0){this.at=now}
 tick(now:number){const dt=Math.max(0,now-this.at);this.at=Math.max(this.at,now)
  if(this.state==='stopped'||this.state==='paused')return
  this.value.playMs+=dt
  if(this.state!=='idle')return
  const spent=this.challenge?Math.min(dt,this.value.remainingMs):dt
  if(this.challenge){this.value.survivalMs+=spent;this.value.remainingMs=Math.max(0,this.value.remainingMs-dt);this.value.expired=this.value.remainingMs<=0}
  // Exactly 5,000ms is still within the window; >5,000ms breaks it.
  if(this.value.combo){if(spent>this.value.comboMs){this.value.combo=0;this.value.comboMs=0}else this.value.comboMs-=spent}
 }
 set(state:typeof this.state,now:number){this.tick(now);this.state=state}
 valid(){if(this.value.expired)return;this.value.combo++;this.value.comboMs=5000;if(this.challenge)this.value.remainingMs=Math.min(30000,this.value.remainingMs+5000)}
 break(){this.value.combo=0;this.value.comboMs=0}
 get running(){return this.state==='idle'&&(this.challenge||this.value.combo>0)}
}
