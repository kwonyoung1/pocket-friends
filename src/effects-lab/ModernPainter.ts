import {Application,Assets,Container,Graphics,Sprite,Texture} from 'pixi.js'
import {gsap} from 'gsap'
import type {Frame} from '../match3/engine'
import {board,center,colors,names} from './scenes'
type Mote={sprite:Sprite;life:number;max:number;vx:number;vy:number;spin:number;size:number;ring:boolean}
/** Lab-only renderer. Receives immutable presentation events, never calculates a match or reward. */
export class ModernPainter{
 private app=new Application();private gems:Sprite[]=[];private motes:Mote[]=[];private beam=new Graphics();private fx=new Container();private jewels=new Container();private owned:Texture[]=[];private paths=names.map(name=>new URL(`assets/gem-${name}.svg`,document.baseURI).href);private raf=0;private stamp=0;private enabled=true;private ready=false;private disposed=false;private initialized=false;private observer?:ResizeObserver;private dragging:number|null=null;private until=0;private slow=0
 limit=160;activeParticles=0;rendererName='WebGL';
 constructor(private canvas:HTMLCanvasElement,private reduced:boolean,limit:number){this.limit=limit}
 async init(){
  await this.app.init({canvas:this.canvas,width:512,height:512,resolution:this.resolution(),autoDensity:false,preference:'webgl',antialias:true,backgroundAlpha:0,autoStart:false})
  this.initialized=true
  if(this.disposed){this.destroyApp();return}
  const textures=await Promise.all(this.paths.map(path=>Assets.load<Texture>(path)))
  if(this.disposed){this.destroyApp();return}
  this.rendererName=`PixiJS WebGL · ${this.app.renderer.name}`
  this.app.stage.addChild(this.jewels,this.beam,this.fx)
  for(const g of board){const s=new Sprite(textures[g.color??6]);s.anchor.set(.5);s.position.copyFrom(center(g.id));s.width=57;s.height=61;this.gems.push(s);this.jewels.addChild(s)}
  const texture=(kind:'glow'|'shard'|'star'|'ring')=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;x.translate(64,64);if(kind==='glow'){const g=x.createRadialGradient(0,0,0,0,0,64);g.addColorStop(0,'#fff');g.addColorStop(.14,'#ffffffee');g.addColorStop(.4,'#ffffff55');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.fillRect(-64,-64,128,128)}else{x.fillStyle='#fff';x.strokeStyle='#fff';if(kind==='ring'){x.lineWidth=3;x.beginPath();x.arc(0,0,55,0,Math.PI*2);x.stroke()}else{ x.beginPath();if(kind==='star')for(let n=0;n<8;n++){const a=n*Math.PI/4,r=n%2?10:55;x.lineTo(Math.cos(a)*r,Math.sin(a)*r)}else{x.moveTo(-35,-48);x.lineTo(43,-17);x.lineTo(18,49);x.lineTo(-24,17)}x.closePath();x.fill()}}const t=Texture.from(c);this.owned.push(t);return t}
  const tex=[texture('shard'),texture('star'),texture('glow'),texture('ring')]
  for(let i=0;i<384;i++){const ring=i>=360,sprite=new Sprite(tex[ring?3:i%3]);sprite.anchor.set(.5);sprite.visible=false;sprite.blendMode=i%3===2||ring?'add':'normal';this.fx.addChild(sprite);this.motes.push({sprite,life:0,max:1,vx:0,vy:0,spin:0,size:1,ring})}
  this.ready=true;this.observer=new ResizeObserver(()=>{if(!this.ready||this.disposed)return;this.app.renderer.resolution=this.resolution();this.app.renderer.resize(512,512);this.app.render()});this.observer.observe(this.canvas);this.app.render();this.wake()
 }
 private emit(x:number,y:number,color:number,count:number,big=false){
  if(this.reduced)return
  let emitted=0
  for(let n=0;n<this.motes.length&&emitted<count;n++){const p=this.motes[n];if(p.ring||n>=this.limit||p.life>0)continue;const angle=emitted*2.399963,power=big?170:110;p.life=p.max=400+(emitted%5)*60;p.vx=Math.cos(angle)*power;p.vy=Math.sin(angle)*power-35;p.spin=(emitted%2?1:-1)*3;p.size=n%3===2?42:6+(emitted%4)*2;p.sprite.position.set(x,y);p.sprite.tint=color;p.sprite.rotation=angle;p.sprite.visible=true;emitted++}
 }
 private ring(x:number,y:number,color:number,size:number){if(this.reduced)return;const p=this.motes.find(p=>p.ring&&p.life<=0);if(!p)return;p.life=p.max=440;p.size=size;p.sprite.position.set(x,y);p.sprite.tint=color;p.sprite.visible=true}
 fire(frame:Frame){
  if(!this.ready||this.disposed)return
  this.reset();const big=frame.removed.length>=10;this.until=performance.now()+1600
  for(const [n,i] of frame.removed.entries()){const at=center(i),s=this.gems[i],color=frame.directCombo!>=10?colors[n%6]:colors[frame.board[i]?.color??6];this.emit(at.x,at.y,color,Math.floor(this.limit/Math.max(1,frame.removed.length)),big);this.ring(at.x,at.y,color,big?100:65)
   if(this.reduced)s.alpha=.4;else gsap.to(s.scale,{x:s.scale.x*1.24,y:s.scale.y*1.24,duration:.09,onUpdate:this.wake});gsap.to(s,{alpha:0,duration:this.reduced?.05:.16,delay:this.reduced?0:.09,onUpdate:this.wake})
  }
  if(big){this.ring(256,256,0xffd781,620);this.ring(256,256,0xb1d7ff,420);if(!this.reduced)gsap.fromTo(this.jewels,{x:-3,y:2},{x:0,y:0,duration:.36,ease:'elastic.out(1,.2)',onUpdate:this.wake})}
  this.beam.clear();this.beam.alpha=1
  for(const e of frame.effects)for(const [n,to] of e.targets.entries()){const a=center(e.from),b=center(to),color=e.kind==='rainbow'?colors[n%6]:0xffdf98;this.beam.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width:9,color,alpha:.16}).moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width:2,color:0xffffff,alpha:.9})}
  gsap.to(this.beam,{alpha:0,duration:this.reduced?.08:.5,onUpdate:this.wake});this.wake()
 }
 reset(){if(!this.ready)return;this.dragging=null;gsap.killTweensOf(this.jewels);this.jewels.position.set(0,0);for(const [i,s] of this.gems.entries()){gsap.killTweensOf(s);gsap.killTweensOf(s.scale);s.position.copyFrom(center(i));s.width=57;s.height=61;s.alpha=1;s.rotation=0}gsap.killTweensOf(this.beam);this.beam.clear();for(const p of this.motes){p.life=0;p.sprite.visible=false}this.activeParticles=0;this.app.render()}
 drag(index:number,x:number,y:number){if(!this.ready)return;const s=this.gems[index];if(this.dragging!==index){this.reset();this.dragging=index;s.width=65;s.height=69;this.jewels.setChildIndex(s,this.jewels.children.length-1)}const before=s.x;s.position.set(Math.max(30,Math.min(482,x)),Math.max(30,Math.min(482,y)));s.rotation=this.reduced?0:Math.max(-.18,Math.min(.18,(x-before)*.008));this.emit(s.x,s.y,colors[board[index].color??6],2);this.until=performance.now()+300;this.wake()}
 release(){if(this.dragging===null)return;const index=this.dragging,s=this.gems[index];this.dragging=null;this.until=performance.now()+850;gsap.to(s,{...center(index),rotation:0,duration:this.reduced?.01:.65,ease:'elastic.out(1,.35)',onUpdate:this.wake});gsap.to(s.scale,{x:57/s.texture.width,y:61/s.texture.height,duration:this.reduced?.01:.4,ease:'back.out(2)',onUpdate:this.wake});this.wake()}
 setEnabled(on:boolean){this.enabled=on;cancelAnimationFrame(this.raf);this.raf=0;for(const target of [this.jewels,this.beam,...this.gems,...this.gems.map(s=>s.scale)])for(const tween of gsap.getTweensOf(target))tween.paused(!on);if(on){this.stamp=performance.now();this.wake()}}
 private wake=()=>{if(!this.ready||!this.enabled||this.disposed||this.raf)return;this.stamp=performance.now();this.raf=requestAnimationFrame(this.draw)}
 private draw=(now:number)=>{this.raf=0;if(!this.enabled||this.disposed)return;const dt=Math.min(50,now-this.stamp);this.stamp=now;if(dt>28&&++this.slow>6)this.limit=Math.min(this.limit,64);this.activeParticles=0;let active=false
  for(const [index,p] of this.motes.entries()){if(!p.ring&&index>=this.limit){p.life=0;p.sprite.visible=false}if(p.life<=0)continue;active=true;p.life=Math.max(0,p.life-dt);const t=1-p.life/p.max;p.sprite.visible=p.life>0;if(p.ring){p.sprite.width=p.sprite.height=Math.max(1,p.size*t);p.sprite.alpha=(1-t)*.85}else{this.activeParticles++;p.sprite.x+=p.vx*dt/1000;p.sprite.y+=p.vy*dt/1000;p.vy+=110*dt/1000;p.sprite.rotation+=p.spin*dt/1000;p.sprite.width=p.sprite.height=p.size*(1-t*.6);p.sprite.alpha=(1-t)**1.4}}
  this.canvas.dataset.particles=String(this.activeParticles);this.canvas.dataset.budget=String(this.limit);this.app.render();if(active||this.dragging!==null||now<this.until)this.raf=requestAnimationFrame(this.draw)
 }
 private resolution(){return Math.max(.25,Math.min(2,devicePixelRatio||1)*this.canvas.getBoundingClientRect().width/512)}
 private destroyApp(){if(this.initialized){this.app.destroy(false,{children:true});this.initialized=false}}
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.observer?.disconnect();if(!this.ready){this.destroyApp();return;}for(const target of [this.jewels,this.beam,...this.gems,...this.gems.map(s=>s.scale)])gsap.killTweensOf(target);this.destroyApp();for(const t of this.owned)t.destroy(true)}
}
