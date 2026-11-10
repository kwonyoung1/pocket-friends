export type HumanWalkState='idle'|'walk-start'|'walking'|'walk-stop'|'turning'|'resting'|'sleeping'
export type HumanWalkInput={x:number;y:number;moving:boolean;facing:number;held:boolean;resting:boolean;sleeping:boolean;reduced:boolean}
/** Human-only bipedal phase; no animal rig, saved state or position writes. */
export class HumanWalk{
 private previous?:HumanWalkInput
 private phase=0
 private state:HumanWalkState='idle'
 private until=0
 update(input:HumanWalkInput,now:number,dt:number){const old=this.previous,d=old?Math.hypot(input.x-old.x,input.y-old.y):0;this.previous={...input};const moving=input.moving&&!input.held&&!input.reduced&&!input.sleeping
 if(moving&&dt>0&&dt<.25&&d<64)this.phase=(this.phase+d/40*8)%8
 if(input.sleeping)this.state='sleeping'
 else if(input.held||input.reduced){this.state=input.resting?'resting':'idle';this.until=0}
 else if(moving){if(old&&old.facing!==input.facing){this.state='turning';this.until=now+180}else if(!['walk-start','walking','turning'].includes(this.state)){this.state='walk-start';this.until=now+200}else if(now>=this.until)this.state='walking'}
 else if(['walk-start','walking','turning'].includes(this.state)){this.state='walk-stop';this.until=now+200}
 else if(now>=this.until)this.state=input.resting?'resting':'idle'
 const opacity=this.state==='walk-start'?Math.max(0,Math.min(1,1-(this.until-now)/200)):this.state==='walk-stop'?Math.max(0,Math.min(1,(this.until-now)/200)):this.state==='walking'?1:this.state==='turning'?.45:0
 return{state:this.state,frame:Math.floor(this.phase),opacity}
 }
}
