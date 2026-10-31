import {memo,useEffect,useRef} from 'react'
import type {Frame} from './engine'
type Particle={shape:number;x:number;y:number;vx:number;vy:number;life:number;max:number;color:string;size:number}
type Ring={x:number;y:number;life:number;max:number;radius:number;color:string}
type Beam={from:number;to:number;kind:string}
const center=(i:number,w:number)=>({x:(i%8+.5)*w/8,y:(Math.floor(i/8)+.5)*w/8})
const tones=['#ffb0c2','#9edcff','#b6f2d0','#e1bafa','#ffeba4','#c5f5ff','#ffcca4']
export const particleBudget=(reduced:boolean,intensity:'low'|'normal'|'strong',mobile:boolean)=>reduced?0:Math.round((mobile?96:160)*(intensity==='low'?.3:intensity==='normal'?.6:1))
export class Painter{
 private pool:Particle[]=Array.from({length:160},()=>({x:0,y:0,vx:0,vy:0,life:0,max:1,color:'#fff',size:1,shape:0}));private rings:Ring[]=Array.from({length:32},()=>({x:0,y:0,life:0,max:1,radius:0,color:'#fff'}));private beams:Beam[]=[];private beamLife=0;private raf=0;private stamp=0;private width=0;private observer:ResizeObserver;private paused=false;private last:Frame|null=null;private slow=0;private limit=160;private disposed=false
 constructor(private canvas:HTMLCanvasElement,private reduced:boolean,private intensity:'low'|'normal'|'strong'){
  this.limit=particleBudget(reduced,intensity,matchMedia('(pointer:coarse)').matches)
  this.observer=new ResizeObserver(([entry])=>{this.width=entry.contentRect.width;const ratio=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(this.width*ratio);canvas.height=canvas.width;canvas.getContext('2d')?.setTransform(ratio,0,0,ratio,0,0)});this.observer.observe(canvas)
 }
 private ring(at:number,radius:number,color='#fff4be'){const free=this.rings.find(r=>r.life<=0);if(free)Object.assign(free,{...center(at,this.width),life:230,max:230,radius,color})}
 update(frame:Frame|null,paused:boolean){
  this.paused=paused
  if(frame&&frame!==this.last&&frame.phase==='CLEARING'&&!this.reduced){
   const impact=Math.max(frame.impact??0,frame.removed.length>=20?5:frame.removed.length>=10?3:frame.removed.length>=4?1:0),per=impact>=3?9:impact?7:5,stride=Math.max(1,Math.ceil(frame.removed.length/Math.max(1,this.limit/per)))
   for(let n=0;n<frame.removed.length;n+=stride){const i=frame.removed[n],p=center(i,this.width),color=(frame.directCombo??0)>=10?tones[(n+frame.directCombo!)%7]:(frame.directCombo??0)>=5?'#ffe394':tones[frame.board[i]?.color??0];this.ring(i,this.width/8*(impact?0.8:0.48),color)
    for(let j=0;j<per;j++){const slot=this.pool.find((p,index)=>index<this.limit&&p.life<=0);if(!slot)break;const angle=n*2.4+j*2.1;Object.assign(slot,{...p,vx:Math.cos(angle)*(75+impact*12),vy:Math.sin(angle)*(75+impact*12)-18,life:260+j*12,max:260+j*12,color,size:2.5+j*.4,shape:j%3})}
   }
   if(frame.removed.length>=10){this.ring(27,this.width*(frame.removed.length>=20?.85:.55));this.ring(36,this.width*.35,'#b8eaff')}
   for(const c of frame.created??[])this.ring(c.at,this.width/8,'#fff')
   this.beams=this.intensity==='low'?[]:frame.effects.flatMap(e=>e.targets.map(to=>({from:e.from,to,kind:e.kind}))).slice(0,96);this.beamLife=240
   for(const e of frame.effects){if(e.kind==='bomb'||e.kind==='all')this.ring(e.from,this.width/8*(frame.specialPair?3:2.1));if(e.kind==='lightning'){e.targets.forEach((i,n)=>this.ring(i,this.width/8*(n===e.targets.length-1?1.1:.55),'#e4c0ff'))}}
  }
  this.last=frame;cancelAnimationFrame(this.raf);if(!paused){this.stamp=performance.now();this.raf=requestAnimationFrame(this.draw)}
 }
 private draw=(now:number)=>{
  if(this.disposed||this.paused)return;const dt=Math.min(50,now-this.stamp);this.stamp=now;if(dt>28&&++this.slow>6)this.limit=Math.min(this.limit,32)
  const ctx=this.canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,this.width,this.width);let active=false,particleCount=0
  for(const [index,p] of this.pool.entries()){if(p.life<=0)continue;if(index>=this.limit){p.life=0;continue}active=true;particleCount++;p.life-=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=100*dt/1000;ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.save();ctx.translate(p.x,p.y);ctx.rotate((1-p.life/p.max)*4+index);ctx.beginPath();if(p.shape===0){ctx.moveTo(0,-p.size*1.7);ctx.lineTo(p.size,.3*p.size);ctx.lineTo(-p.size,p.size);ctx.closePath()}else if(p.shape===1){for(let j=0;j<8;j++){const angle=j*Math.PI/4,r=j%2?p.size*.3:p.size*1.4;ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r)}ctx.closePath()}else{ctx.rect(-p.size*.4,-p.size*.4,p.size*.8,p.size*.8)}ctx.fill();ctx.restore()}
  for(const r of this.rings){if(r.life<=0)continue;active=true;r.life-=dt;const t=1-Math.max(0,r.life/r.max);ctx.globalAlpha=(1-t)*.85;ctx.strokeStyle=r.color;ctx.lineWidth=2.5*(1-t)+.5;ctx.beginPath();ctx.arc(r.x,r.y,Math.max(.1,r.radius*t),0,Math.PI*2);ctx.stroke();if(t<.3&&this.intensity!=='low'){ctx.globalAlpha=(.3-t)*2;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r.x-10,r.y);ctx.lineTo(r.x+10,r.y);ctx.moveTo(r.x,r.y-10);ctx.lineTo(r.x,r.y+10);ctx.stroke()}}
  if(this.beamLife>0){active=true;this.beamLife-=dt;const opacity=Math.max(0,this.beamLife/240),progress=Math.min(1,(1-opacity)*5);for(const b of this.beams){const a=center(b.from,this.width),z=center(b.to,this.width),x=a.x+(z.x-a.x)*progress,y=a.y+(z.y-a.y)*progress;ctx.strokeStyle=b.kind==='lightning'?'#d2a3ff':b.kind==='rainbow'||b.kind==='all'?tones[b.to%7]:'#fff4b1';ctx.globalAlpha=opacity;ctx.lineWidth=b.kind==='row'||b.kind==='column'?5.5:2.5;ctx.beginPath();ctx.moveTo(a.x,a.y);if(b.kind==='lightning'){ctx.lineTo((a.x+x)/2+8,(a.y+y)/2-8);ctx.lineTo((a.x+x)/2-5,(a.y+y)/2+5)}ctx.lineTo(x,y);ctx.stroke();ctx.globalAlpha=opacity*.95;ctx.strokeStyle='#fff';ctx.lineWidth=b.kind==='row'||b.kind==='column'?1.8:1;ctx.stroke()}}
  this.canvas.dataset.particles=String(particleCount);this.canvas.dataset.budget=String(this.limit);ctx.globalAlpha=1;if(active)this.raf=requestAnimationFrame(this.draw)
 }
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.beams=[];this.pool.forEach(p=>p.life=0);this.canvas.getContext('2d')?.clearRect(0,0,this.width,this.width)}
}
export const Effects=memo(function Effects({frame,paused,reduced,intensity='strong'}:{frame:Frame|null;paused:boolean;reduced:boolean;intensity?:'low'|'normal'|'strong'}){const canvas=useRef<HTMLCanvasElement>(null),painter=useRef<Painter|null>(null)
 useEffect(()=>{const p=painter.current=new Painter(canvas.current!,reduced,intensity);return()=>{p.dispose();painter.current=null}},[reduced,intensity])
 useEffect(()=>painter.current?.update(frame,paused),[frame,paused,reduced,intensity]);return <canvas ref={canvas} className="tm-effects" aria-hidden="true"/>
})
