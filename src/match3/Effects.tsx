import {memo,useEffect,useRef} from 'react'
import type {Frame} from './engine'
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;color:string;size:number}
type Beam={from:number;to:number;kind:string}
const center=(i:number,w:number)=>({x:(i%8+.5)*w/8,y:(Math.floor(i/8)+.5)*w/8})
const tones=['#ffb0c2','#9edcff','#b6f2d0','#e1bafa','#ffeba4','#c5f5ff','#ffcca4']
class Painter{
 private pool:Particle[]=Array.from({length:128},()=>({x:0,y:0,vx:0,vy:0,life:0,max:1,color:'#fff',size:1}));private beams:Beam[]=[];private rings:number[]=[];private beamLife=0;private raf=0;private stamp=0;private width=0;private observer:ResizeObserver;private paused=false;private last:Frame|null=null;private slow=0;private limit=128;private disposed=false
 constructor(private canvas:HTMLCanvasElement,private reduced:boolean){this.limit=reduced?0:matchMedia('(pointer:coarse)').matches?48:128;this.observer=new ResizeObserver(([entry])=>{this.width=entry.contentRect.width;const ratio=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(this.width*ratio);canvas.height=canvas.width;canvas.getContext('2d')?.setTransform(ratio,0,0,ratio,0,0)});this.observer.observe(canvas)}
 update(frame:Frame|null,paused:boolean){
  this.paused=paused;if(frame&&frame!==this.last&&frame.phase==='CLEARING'&&!this.reduced){
   for(const [n,i] of frame.removed.entries()){const p=center(i,this.width);for(let j=0;j<3;j++){const slot=this.pool.find((p,index)=>index<this.limit&&p.life<=0);if(!slot)break;const angle=(n*2.4+j*2.1);Object.assign(slot,{...p,vx:Math.cos(angle)*45,vy:Math.sin(angle)*45-20,life:420,max:420,color:frame.combo>=5?'#ffdf86':tones[frame.board[i]?.color??0],size:2+j})}}
   this.beams=frame.effects.flatMap(e=>e.targets.map(to=>({from:e.from,to,kind:e.kind}))).slice(0,96);this.rings=[...new Set(this.beams.filter(b=>b.kind==='bomb'||b.kind==='all').map(b=>b.from))];this.beamLife=300
  }this.last=frame;cancelAnimationFrame(this.raf);if(!paused){this.stamp=performance.now();this.raf=requestAnimationFrame(this.draw)}
 }
 private draw=(now:number)=>{
  if(this.disposed||this.paused)return
  const dt=Math.min(50,now-this.stamp);this.stamp=now;if(dt>28&&++this.slow>6)this.limit=Math.min(this.limit,32)
  const ctx=this.canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,this.width,this.width)
  let active=false;for(const [index,p] of this.pool.entries()){if(p.life<=0)continue;if(index>=this.limit){p.life=0;continue}active=true;p.life-=dt;p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=65*dt/1000;ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(p.x,p.y-p.size);ctx.lineTo(p.x+p.size,p.y);ctx.lineTo(p.x,p.y+p.size);ctx.lineTo(p.x-p.size,p.y);ctx.closePath();ctx.fill()}
  if(this.beamLife>0){active=true;this.beamLife-=dt;ctx.globalAlpha=Math.max(0,this.beamLife/300);for(const b of this.beams){const a=center(b.from,this.width),z=center(b.to,this.width);ctx.strokeStyle=b.kind==='lightning'?'#d6aeff':b.kind==='rainbow'||b.kind==='all'?tones[b.to%7]:'#fff4b1';ctx.lineWidth=b.kind==='row'||b.kind==='column'?4:2;ctx.beginPath();ctx.moveTo(a.x,a.y);if(b.kind==='lightning'){ctx.lineTo((a.x+z.x)/2+8,(a.y+z.y)/2-8);ctx.lineTo((a.x+z.x)/2-5,(a.y+z.y)/2+5)}ctx.lineTo(z.x,z.y);ctx.stroke();}}
  for(const i of this.rings){if(this.beamLife<=0)break;const p=center(i,this.width);ctx.strokeStyle='#fff1bd';ctx.beginPath();ctx.arc(p.x,p.y,(1-this.beamLife/300)*this.width*.28,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;if(active)this.raf=requestAnimationFrame(this.draw)
 }
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.beams=[]}
}
export const Effects=memo(function Effects({frame,paused,reduced}:{frame:Frame|null;paused:boolean;reduced:boolean}){const canvas=useRef<HTMLCanvasElement>(null),painter=useRef<Painter|null>(null)
 useEffect(()=>{const p=painter.current=new Painter(canvas.current!,reduced);return()=>{p.dispose();painter.current=null}},[reduced])
 useEffect(()=>painter.current?.update(frame,paused),[frame,paused,reduced])
 return <canvas ref={canvas} className="tm-effects" aria-hidden="true"/>
})
