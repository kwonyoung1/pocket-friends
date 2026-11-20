export type Direction='right'|'left'|'front'|'back'
export const directionRow=(direction:Direction)=>direction==='back'?2:direction==='front'?1:0
/** Presentation-only heading. No targets, saved facing writes or timer-only steps. */
export class TravelDirection{
 direction:Direction='front'
 private initialized=false
 get tracked(){return this.initialized}
 private candidate?:Direction
 private candidateTime=0
 private candidateDistance=0
 update(dx:number,dy:number,dt:number,active:boolean){
  if(!active||dt<=0||dt>.25||Math.hypot(dx,dy)>64){this.candidate=undefined;return false}
  const distance=Math.hypot(dx,dy)
  if(distance<.05||distance/dt<2)return false
  const ax=Math.abs(dx),ay=Math.abs(dy),vertical=this.direction==='front'||this.direction==='back'
  // Preserve the current axis near a diagonal; require 25% dominance to switch.
  const useVertical=this.initialized?(vertical?ax<=ay*1.25:ay>ax*1.25):ay>ax
  const next:Direction=useVertical?(dy<0?'back':'front'):(dx<0?'left':'right')
  if(next===this.direction){this.initialized=true;this.candidate=undefined;return false}
  if(!this.initialized){this.initialized=true;this.direction=next;return false}
  if(this.candidate!==next){this.candidate=next;this.candidateTime=0;this.candidateDistance=0}
  this.candidateTime+=dt;this.candidateDistance+=distance
  if(this.candidateTime<.075||this.candidateDistance<1)return false
  this.direction=next;this.candidate=undefined;return true
 }
}
