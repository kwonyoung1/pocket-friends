import {Application,Container,Graphics,Sprite,Texture} from 'pixi.js'
import type {Frame} from './engine'
import {particleBudget} from './CanvasPainter'
type Mote={sprite:Sprite;life:number;max:number;vx:number;vy:number;size:number;ring:boolean}
const colors=[0xff759a,0x72baff,0x70efbd,0xc590ff,0xffd65f,0x9deaff,0xffb378]
const center=(i:number)=>({x:(i%8+.5)*64,y:(Math.floor(i/8)+.5)*64})
/** Presentation only: consumes confirmed frames, never changes a board or reward. */
export class PixiEffects{
 private app=new Application();private fx=new Container();private beam=new Graphics();private motes:Mote[]=[];private textures:Texture[]=[];private ready=false;private initialized=false;private disposed=false;private paused=true;private last:Frame|null=null;private raf=0;private stamp=0;private beamLife=0;private slow=0;private limit:number;private observer?:ResizeObserver;private parent:HTMLElement|null=null;private pointer:number|null=null;private trailStamp=0
 constructor(private canvas:HTMLCanvasElement,intensity:'normal'|'strong',private fail:()=>void){this.limit=particleBudget(false,intensity,matchMedia('(pointer:coarse)').matches)}
 async init(){
  await this.app.init({canvas:this.canvas,width:512,height:512,resolution:this.resolution(),backgroundAlpha:0,antialias:true,preference:'webgl',autoStart:false})
  this.initialized=true;if(this.disposed){this.destroy();return}
  this.app.stage.addChild(this.beam,this.fx)
  for(const kind of ['shard','star','glow','ring']){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!;ctx.translate(64,64);ctx.fillStyle='#fff';ctx.strokeStyle='#fff';ctx.beginPath()
   if(kind==='glow'){const g=ctx.createRadialGradient(0,0,0,0,0,64);g.addColorStop(0,'#fff');g.addColorStop(.2,'#ffffffcc');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(-64,-64,128,128)}
   else if(kind==='ring'){ctx.lineWidth=3;ctx.arc(0,0,55,0,Math.PI*2);ctx.stroke()}
   else{if(kind==='star')for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?10:55;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}else{ctx.moveTo(-35,-48);ctx.lineTo(43,-17);ctx.lineTo(18,49);ctx.lineTo(-24,17)}ctx.closePath();ctx.fill()}
   this.textures.push(Texture.from(c))
  }
  for(let i=0;i<192;i++){const ring=i>=160,s=new Sprite(this.textures[ring?3:i%3]);s.anchor.set(.5);s.visible=false;s.blendMode=ring||i%3===2?'add':'normal';this.fx.addChild(s);this.motes.push({sprite:s,life:0,max:1,vx:0,vy:0,size:1,ring})}
  this.ready=true;this.canvas.dataset.renderer='pixi';this.observer=new ResizeObserver(()=>{if(this.disposed)return;try{this.app.renderer.resolution=this.resolution();this.app.renderer.resize(512,512);this.app.render()}catch{this.fail()}});this.observer.observe(this.canvas)
  this.parent=this.canvas.parentElement;this.parent?.addEventListener('pointerdown',this.down);this.parent?.addEventListener('pointermove',this.move);window.addEventListener('pointerup',this.up);window.addEventListener('pointercancel',this.up);window.addEventListener('blur',this.up);this.canvas.addEventListener('webglcontextlost',this.lost)
  this.app.render()
 }
 private resolution(){return Math.max(.25,Math.min(2,devicePixelRatio||1)*this.canvas.getBoundingClientRect().width/512)}
 private down=(e:PointerEvent)=>{if(!this.paused&&(e.target as HTMLElement).closest('.tm-tile'))this.pointer=e.pointerId}
 private up=()=>{this.pointer=null}
 private move=(e:PointerEvent)=>{if(this.pointer!==e.pointerId||this.paused||performance.now()-this.trailStamp<16)return;this.trailStamp=performance.now();const r=this.canvas.getBoundingClientRect();if(!r.width)return;this.emit((e.clientX-r.left)*512/r.width,(e.clientY-r.top)*512/r.height,0xffe7ad,2,false);this.wake()}
 private lost=()=>this.fail()
 private emit(x:number,y:number,color:number,count:number,big:boolean){let n=0;for(let i=0;i<Math.min(160,this.limit)&&n<count;i++){const p=this.motes[i];if(p.life>0)continue;const a=n*2.399963;Object.assign(p,{life:400+n%5*45,max:400+n%5*45,vx:Math.cos(a)*(big?190:110),vy:Math.sin(a)*(big?190:110)-35,size:i%3===2?48:7+n%4*3});p.sprite.position.set(x,y);p.sprite.tint=color;p.sprite.rotation=a;p.sprite.visible=true;n++}}
 private ring(x:number,y:number,color:number,size:number){const p=this.motes.find(p=>p.ring&&p.life<=0);if(!p)return;Object.assign(p,{life:440,max:440,size});p.sprite.position.set(x,y);p.sprite.tint=color;p.sprite.visible=true}
 update(frame:Frame|null,paused:boolean){if(!this.ready||this.disposed)return;this.paused=paused
  if(frame&&frame!==this.last&&frame.phase==='CLEARING'){
   const big=frame.removed.length>=10,per=Math.max(2,Math.floor(this.limit/Math.max(1,frame.removed.length)))
   for(const [n,i] of frame.removed.entries()){const p=center(i),color=colors[(frame.directCombo??0)>=10?n%7:frame.board[i]?.color??6];this.emit(p.x,p.y,color,per,big);this.ring(p.x,p.y,color,big?110:70)}
   if(big){this.ring(256,256,0xffd781,620);this.ring(256,256,0xb1d7ff,420)}
   this.beam.clear();this.beamLife=450
   for(const e of frame.effects)for(const [n,i] of e.targets.slice(0,64).entries()){const a=center(e.from),b=center(i),color=e.kind==='rainbow'||e.kind==='all'?colors[n%7]:0xffe4a0;this.beam.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width:10,color,alpha:.2}).moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width:2,color:0xffffff,alpha:.9})}
  }
  this.last=frame;cancelAnimationFrame(this.raf);this.raf=0;if(paused)this.up();else this.wake()
 }
 private wake=()=>{if(this.disposed||this.paused||this.raf)return;this.stamp=performance.now();this.raf=requestAnimationFrame(this.draw)}
 private draw=(now:number)=>{this.raf=0;if(this.disposed||this.paused)return;try{const dt=Math.min(50,now-this.stamp);this.stamp=now;if(dt>28&&++this.slow>6)this.limit=Math.min(this.limit,64);let active=false,count=0
  for(const [i,p] of this.motes.entries()){if(!p.ring&&i>=this.limit){p.life=0;p.sprite.visible=false}if(p.life<=0)continue;p.life=Math.max(0,p.life-dt);const t=1-p.life/p.max;p.sprite.visible=p.life>0;active=true;if(p.ring){p.sprite.width=p.sprite.height=Math.max(1,p.size*t);p.sprite.alpha=(1-t)*.85}else{count++;p.sprite.x+=p.vx*dt/1000;p.sprite.y+=p.vy*dt/1000;p.vy+=110*dt/1000;p.sprite.rotation+=dt*.003;p.sprite.width=p.sprite.height=p.size*(1-t*.6);p.sprite.alpha=(1-t)**1.4}}
  this.beamLife=Math.max(0,this.beamLife-dt);this.beam.alpha=this.beamLife/450;active||=this.beamLife>0;this.canvas.dataset.particles=String(count);this.canvas.dataset.budget=String(this.limit);this.app.render();if(active)this.raf=requestAnimationFrame(this.draw)
 }catch{this.fail()}}
 private destroy(){if(this.initialized){this.app.destroy(false,{children:true});this.initialized=false}for(const t of this.textures)t.destroy(true);this.textures=[]}
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.observer?.disconnect();this.parent?.removeEventListener('pointerdown',this.down);this.parent?.removeEventListener('pointermove',this.move);window.removeEventListener('pointerup',this.up);window.removeEventListener('pointercancel',this.up);window.removeEventListener('blur',this.up);this.canvas.removeEventListener('webglcontextlost',this.lost);this.destroy()}
}
