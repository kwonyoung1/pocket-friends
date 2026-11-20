import {directionRow} from './direction'
import type {Direction} from './direction'
/** Two painted full-body views crossfade; no head-only rotation or 3D skew. */
export class DirectionalArt{
 private direction:Direction='front'
 private changedAt=-1000
 private painted=false
 private walking=false
 constructor(private incoming:HTMLElement,private outgoing:HTMLElement,private url:string){
  for(const layer of [incoming,outgoing]){layer.style.backgroundSize='400% 300%'}
 }
 draw(direction:Direction,frame:number,walking:boolean,time:number,reduced:boolean){
  if(!this.painted)for(const layer of [this.incoming,this.outgoing])layer.style.backgroundImage=`url("${this.url}")`
  if(this.painted&&(direction!==this.direction||this.walking&&!walking)){this.outgoing.style.cssText=this.incoming.style.cssText;this.changedAt=time}
  this.direction=direction;this.painted=true;this.walking=walking
  const blend=reduced?1:Math.min(1,(time-this.changedAt)/140)
  const step=walking&&blend===1?Math.floor(frame/2)%4:0
  this.incoming.style.backgroundPosition=`${step/3*100}% ${directionRow(direction)/2*100}%`
  this.incoming.style.transform=direction==='left'?'scaleX(-1)':'none'
  this.incoming.style.opacity=String(blend)
  this.outgoing.style.opacity=String(1-blend)
 }
}
