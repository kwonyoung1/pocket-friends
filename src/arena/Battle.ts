import {Application,Container,Sprite,Texture,Rectangle,Graphics,Text,ImageSource} from 'pixi.js'
import {ASSETS} from './assets'
import type {State,Unit,Action} from './model'
type Actor={root:Container;sprite:Sprite;bar:Graphics;barBg:Graphics;label:Text;halo:Graphics;barrier:Graphics;unit:Unit;pose:number;walking:boolean;time:number;home:{x:number;y:number}}
type Tween={start:number;duration:number;draw:(p:number)=>void;done:()=>void}
export type Cinematic={type:'boss'|'cutin';name:string;art:string;skill?:string}|null
const COLORS={slash:0xb9efff,orb:0xe1d0ff,claw:0xffb58b,kick:0xffcbe2,slam:0xe8bc72,command:0xffe3a1,heal:0x97f2c5,dash:0xff9a66,carrot:0xffb66b,jump:0xffc4e6,shield:0xa3cfff,fire:0xff9554,'enemy-spit':0x84e9ef,vine:0xc591e1}
export class BattleView{
 app=new Application();camera=new Container();effects=new Container();actors=new Map<string,Actor>();frames=new Map<string,Texture[]>();clock=0;speed=1;quality=true;reduced=false;shortCutin=false;dead=false;selected='';current='';tweens:Tween[]=[];ephemeral=0;private sources=new Set<ImageSource>();private foreground?:Sprite;private inAction=false
 constructor(private host:HTMLElement,private select:(id:string)=>void,private cinematic:(c:Cinematic)=>void){}
 async init(state:State){
  await this.app.init({width:390,height:465,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,preference:'webgl',powerPreference:'low-power'})
  if(this.dead){this.app.destroy(true);return}
  this.host.appendChild(this.app.canvas);this.app.canvas.setAttribute('aria-label','달빛 숲 도트 전투 필드');this.app.canvas.setAttribute('role','img')
  const load=async(key:string)=>{const img=new Image();img.src=ASSETS[key];await img.decode();if(this.dead)throw Error('Arena closed');const source=new ImageSource({resource:img,scaleMode:key.startsWith('sprite-')?'nearest':'linear'});this.sources.add(source);return new Texture({source})}
  for(const id of [...state.units.filter(u=>u.side==='ally').map(u=>u.art),'enemies']){
   const atlas=await load('sprite-'+id),frames:Texture[]=[]
   const count=id==='enemies'?12:20,cols=id==='enemies'?4:5
   for(let n=0;n<count;n++)frames.push(new Texture({source:atlas.source,frame:new Rectangle(n%cols*64,Math.floor(n/cols)*64,64,64)}))
   this.frames.set(id,frames)
  }
  if(this.dead)return
  const bg=new Sprite(await load('forest'));bg.position.set(-14,-10);bg.width=418;bg.height=500
  this.camera.pivot.set(195,250);this.camera.position.set(195,250);this.camera.addChild(bg)
  const pool=new Graphics().ellipse(205,342,168,82).fill({color:0x75c8b5,alpha:.045}).ellipse(205,342,144,70).stroke({color:0xb6e4d4,alpha:.15,width:1});this.camera.addChild(pool)
  this.app.stage.addChild(this.camera);this.camera.addChild(this.effects)
  const fg=new Sprite(await load('foliage'));fg.width=390;fg.height=465;fg.alpha=.78;this.foreground=fg;this.app.stage.addChild(fg)
  this.app.ticker.add(t=>this.tick(t.deltaMS));document.addEventListener('visibilitychange',this.visibility)
  this.sync(state);this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
 }
 private visibility=()=>{if(this.dead)return;if(document.hidden)this.app.ticker.stop();else this.app.ticker.start()}
 private texture(unit:Unit,frame:number){if(unit.side==='enemy'){const row=unit.art==='slime'?0:unit.art==='thorn'?1:2;const cell=frame===15?(unit.boss?3:2):frame===16?3:[10,13,17,18].includes(frame)?1:[11,12,14,19].includes(frame)?(unit.boss?2:1):frame<4?frame:0;return this.frames.get('enemies')![row*4+cell]}return this.frames.get(unit.art)![frame]}
 private actor(u:Unit,index:number):Actor{
  const slots=u.side==='ally'?[{x:63,y:318},{x:128,y:361},{x:57,y:401},{x:124,y:438}]:u.boss?[{x:286,y:309}]:[{x:270,y:225},{x:315,y:298}]
  const home=slots[index%slots.length],root=new Container(),shadow=new Graphics().ellipse(0,0,u.boss?32:22,u.boss?8:5).fill({color:0x081521,alpha:.5})
  root.position.set(home.x,home.y);root.zIndex=home.y
  const halo=new Graphics().ellipse(0,0,u.boss?38:27,u.boss?10:8).stroke({color:0xffd88b,width:2,alpha:.9});halo.visible=false
  const sprite=new Sprite(this.texture(u,u.side==='ally'?2:0));sprite.anchor.set(.5,1);sprite.scale.set(u.boss?1.95:1.27)
  const h=u.boss?116:76,barBg=new Graphics().roundRect(-21,-h-12,42,4,2).fill({color:0x101b2d,alpha:.95}),bar=new Graphics().roundRect(-21,-h-12,42,4,2).fill(u.side==='ally'?0xa3dfc0:0xf7aaad)
  const label=new Text({text:u.name,style:{fontFamily:'sans-serif',fontSize:u.boss?11:9,fill:0xf5f1df,stroke:{color:0x122334,width:3},fontWeight:'600'}});label.anchor.set(.5,0);label.position.set(0,5)
  const barrier=new Graphics().ellipse(0,-h*.45,u.boss?48:31,h*.58).fill({color:0x9bcffe,alpha:.06}).stroke({color:0xb7ddff,alpha:.65,width:1.5});barrier.visible=false
  root.addChild(shadow,halo,sprite,barBg,bar,barrier,label);root.eventMode='static';root.cursor='pointer';root.hitArea=new Rectangle(-34,-h,68,h+20);root.on('pointertap',()=>this.select(u.id))
  this.camera.addChild(root);this.camera.sortableChildren=true;this.effects.zIndex=1000
  return{root,sprite,bar,barBg,label,halo,barrier,unit:u,pose:-1,walking:false,time:this.clock,home}
 }
 sync(state:State){
  this.current=state.order[state.cursor]??''
  for(const [id,actor]of this.actors)if(!state.units.some(u=>u.id===id)){this.camera.removeChild(actor.root);actor.root.destroy({children:true});this.actors.delete(id)}
  let a=0,e=0
  for(const u of state.units){let actor=this.actors.get(u.id);if(!actor){actor=this.actor(u,u.side==='ally'?a:e);this.actors.set(u.id,actor)}if(u.side==='ally')a++;else e++
   actor.unit=u;actor.bar.scale.x=Math.max(0,u.hp/u.maxHp);actor.root.alpha=u.hp>0?1:.32;actor.barrier.visible=u.hp>0&&u.shield>0
   if(u.hp<=0){actor.pose=16;actor.root.eventMode='none'}
   else actor.root.eventMode='static'
  }
 }
 choose(id:string){this.selected=id}
 private tick(dt:number){
  if(this.dead)return;this.clock+=Math.min(dt,60)*this.speed
  for(const t of [...this.tweens]){const p=Math.min(1,(this.clock-t.start)/t.duration);t.draw(p);if(p===1){this.tweens.splice(this.tweens.indexOf(t),1);t.done()}}
  for(const a of this.actors.values()){
   let frame=a.pose
   if(a.unit.hp>0&&frame<0)frame=a.unit.side==='enemy'?0:this.reduced?2:Math.floor((this.clock+a.home.y*3)/1100)%5===0?9:2
   if(a.walking)frame=a.unit.side==='enemy'?(Math.floor((this.clock-a.time)/140)%2?10:0):5+Math.floor((this.clock-a.time)/95)%4
   a.sprite.texture=this.texture(a.unit,frame)
   a.halo.visible=a.unit.hp>0&&(a.unit.id===this.selected||a.unit.id===this.current);a.halo.alpha=this.reduced?.8:.65+Math.sin(this.clock/240)*.2
   if(a.unit.hp>0&&a.pose<0&&!a.walking)a.sprite.y=this.reduced?0:Math.sin(this.clock/850+a.home.y)*.65
  }
  if(this.quality&&!this.reduced&&Math.floor(this.clock/300)!==Math.floor((this.clock-dt*this.speed)/300))this.spark(18+Math.random()*354,100+Math.random()*310,0xf2edbd,1,'light')
 }
 private tween(ms:number,draw:(p:number)=>void){return new Promise<void>(done=>{if(this.dead){done();return}this.tweens.push({start:this.clock,duration:Math.max(1,ms),draw,done})})}
 wait(ms:number){return this.tween(ms,()=>{})}
 private async zoom(scale:number,x=195,y=250){const before=this.camera.scale.x,bx=this.camera.pivot.x,by=this.camera.pivot.y;await this.tween(this.reduced?1:160,p=>{this.camera.scale.set(before+(scale-before)*p);this.camera.pivot.set(bx+(x-bx)*p,by+(y-by)*p)})}
 private async shake(strength:number){if(this.reduced||!this.quality)return;await this.tween(135,p=>{this.camera.position.set(195+Math.sin(p*32)*strength*(1-p),250+Math.cos(p*38)*strength*.4*(1-p));if(this.foreground)this.foreground.x=-Math.sin(p*32)*strength*.3});this.camera.position.set(195,250);if(this.foreground)this.foreground.x=0}
 private async move(a:Actor,x:number,y:number,ms=260,jump=0,trail=false){const sx=a.root.x,sy=a.root.y,dx=x-sx;a.walking=true;a.time=this.clock;a.sprite.scale.x=Math.abs(a.sprite.scale.x)*(dx<0?-1:1)*(a.unit.side==='enemy'?-1:1);await this.tween(this.reduced?80:ms,p=>{const e=p*p*(3-2*p);a.root.position.set(sx+(x-sx)*e,sy+(y-sy)*e-Math.sin(p*Math.PI)*jump);a.root.zIndex=a.root.y;if(trail&&this.quality&&Math.floor(p*16)!==Math.floor(Math.max(0,p-.035)*16))this.spark(a.root.x,a.root.y-10,0xffa465,2)});a.walking=false}
 private number(a:Actor,text:string,color:number){const n=new Text({text,style:{fontFamily:'sans-serif',fontSize:text.length>5?12:18,fontWeight:'800',fill:color,stroke:{color:0x142132,width:4}}});n.anchor.set(.5);n.position.set(a.root.x,a.root.y-(a.unit.boss?110:75));this.effects.addChild(n);const y=n.y;void this.tween(650,p=>{n.y=y-p*30;n.alpha=1-p}).then(()=>n.destroy())}
 private spark(x:number,y:number,color:number,count:number,kind='spark'){
  const cap=this.quality?48:16;count=Math.min(count,this.reduced?3:cap-this.ephemeral)
  for(let i=0;i<count;i++){
   this.ephemeral++;const g=new Graphics();if(kind==='rock')g.poly([-3,-4,3,-2,4,2,-2,4]).fill(color);else g.circle(0,0,kind==='light'?1:1.4+Math.random()*1.6).fill(color)
   g.position.set(x,y);this.effects.addChild(g);const vx=(Math.random()-.5)*(kind==='light'?12:65),vy=kind==='light'?-15:-20-Math.random()*45,life=kind==='light'?1300:450
   void this.tween(life,p=>{g.x=x+vx*p;g.y=y+vy*p+(kind==='light'?0:55*p*p);g.alpha=(1-p)*(kind==='light'?.45:1)}).then(()=>{g.destroy();this.ephemeral--})
  }
 }
 private ring(x:number,y:number,color:number,size=1){const g=new Graphics().ellipse(0,0,34*size,12*size).stroke({color,width:3,alpha:.9});g.position.set(x,y);this.effects.addChild(g);void this.tween(this.reduced?120:420,p=>{g.scale.set(1+p*2.3);g.alpha=1-p}).then(()=>g.destroy())}
 private async projectile(a:Actor,b:Actor,carrot:boolean,color:number){
  const g=new Graphics();if(carrot){g.poly([-5,-10,5,-10,1,12,-1,15]).fill(0xffa13e).stroke({color:0xc46d28,width:1});g.poly([-1,-10,-8,-18,-1,-15,3,-21,5,-14,10,-17,5,-9]).fill(0x85c36e);g.moveTo(-3,-4).lineTo(2,-3).moveTo(-2,2).lineTo(2,3).stroke({color:0xe37931,width:1})}else g.circle(0,0,5).fill(color).circle(0,0,9).fill({color,alpha:.18})
  const x=a.root.x,y=a.root.y-44,tx=b.root.x,ty=b.root.y-38;g.position.set(x,y);this.effects.addChild(g)
  await this.tween(this.reduced?150:370,p=>{g.position.set(x+(tx-x)*p,y+(ty-y)*p-Math.sin(p*Math.PI)*(carrot?62:9));g.rotation=carrot?-Math.PI/2+p*.8:0;if(this.quality&&Math.floor(p*12)%2===0)this.spark(g.x,g.y,color,1)})
  g.destroy();this.spark(tx,ty,color,carrot?12:8);if(carrot)this.spark(tx,ty,0xa7d27b,5)
 }
 private async recoil(a:Actor){const x=a.root.x;a.pose=15;await this.tween(this.reduced?80:160,p=>{a.root.x=x+Math.sin(p*Math.PI)*(a.unit.side==='enemy'?7:-5);a.sprite.tint=p<.45?0xffd7d4:0xffffff});a.root.x=x;a.sprite.tint=0xffffff;a.pose=a.unit.hp>0?-1:16}
 async intro(boss=false){
  if(boss){const a=[...this.actors.values()].find(a=>a.unit.boss);if(!a)return;a.sprite.tint=0x101e29;this.cinematic({type:'boss',name:'숲의 수호자',art:'guardian'});await this.zoom(1.12,235,280);await this.wait(450);a.sprite.tint=0xffffff;this.ring(a.root.x,a.root.y,0x99e3cd);void this.shake(3);await this.wait(500);this.cinematic(null);await this.zoom(1)}else{await this.wait(250)}
 }
 async previewCutin(unit:Unit,skillName:string){this.cinematic({type:'cutin',name:unit.name,art:unit.art,skill:skillName});await this.wait(this.shortCutin||this.reduced?260:850);this.cinematic(null)}
 async play(action:Action,onImpact:()=>void){
  if(this.dead||this.inAction)return;this.inAction=true
  const a=this.actors.get(action.actor)!,targets=action.targets.map(id=>this.actors.get(id)!).filter(Boolean),k=action.skill,color=COLORS[k.style],ranged=['orb','carrot','enemy-spit','heal','shield','command'].includes(k.style)
  try{
   if(action.ultimate)await this.previewCutin(a.unit,k.name)
   await this.zoom(action.ultimate?1.1:1.035,195,285)
   a.pose=k.style==='carrot'||k.style==='slam'||k.style==='dash'?18:ranged?13:10
   await this.wait(k.style==='slam'?230:140)
   if(k.style==='dash'){this.spark(a.root.x,a.root.y-8,color,10);this.ring(a.root.x,a.root.y,color)}
   if(!ranged&&targets.length){const target=targets[0];await this.move(a,target.root.x+(a.unit.side==='ally'?-48:48),target.root.y+5,k.style==='dash'?180:280,k.style==='jump'?65:k.style==='kick'?24:0,k.style==='dash');a.pose=k.style==='slam'||k.style==='dash'?19:11;await this.wait(k.style==='slam'?110:75)}
   else{a.pose=k.style==='carrot'?19:14;if(['orb','carrot','enemy-spit'].includes(k.style))await Promise.all(targets.map(t=>this.projectile(a,t,k.style==='carrot',color)));else{await Promise.all(targets.map(t=>this.projectile(a,t,false,color)));for(const t of targets){this.ring(t.root.x,t.root.y,color);this.spark(t.root.x,t.root.y-35,color,9)}await this.wait(180)}}
   if(k.style==='dash'&&targets.length){this.spark(a.root.x,a.root.y-12,color,15);await this.move(a,Math.min(357,targets[targets.length-1].root.x+35),targets[targets.length-1].root.y,125,0,true);a.pose=19}
   for(const t of targets){this.ring(t.root.x,t.root.y,color);this.spark(t.root.x,t.root.y-20,color,k.style==='slam'?15:8,k.style==='slam'?'rock':'spark')}
   if(k.style==='slam'&&k.id!=='basic'){this.ring(a.root.x,a.root.y,color,1.8);this.spark(a.root.x,a.root.y,color,15,'rock')}
   if(['slam','dash','fire','jump'].includes(k.style))void this.shake(k.style==='slam'?5:3)
   // Painted contact pose is held briefly at impact, before recoil/return.
   await this.wait(this.reduced?1:55);onImpact()
   for(const hit of action.hits){const t=this.actors.get(hit.id);if(!t)continue;this.number(t,hit.miss?'회피':hit.heal?`+${hit.heal}`:hit.shield?'보호막':hit.buff?'공격 강화':`${hit.critical?'CRIT ':''}${hit.damage}`,hit.heal?0xa2efc3:hit.shield||hit.buff?0xc7dbff:0xffe2ac);if(hit.damage||hit.miss)void this.recoil(t)}
   if(k.hits>1){for(let n=1;n<k.hits;n++){a.pose=ranged?13:10;await this.wait(60);a.pose=ranged?14:11;if(ranged)await Promise.all(targets.map(t=>this.projectile(a,t,k.style==='carrot',color)));else await this.wait(40);for(const t of targets)this.spark(t.root.x,t.root.y-30,color,5)}}
   await this.wait(200)
   if(!ranged){await this.move(a,a.home.x,a.home.y,260);a.pose=0;await this.wait(70)}
   a.sprite.scale.x=Math.abs(a.sprite.scale.x);a.pose=a.unit.hp>0?-1:16;await this.zoom(1)
  }finally{this.inAction=false}
 }
 victory(){for(const a of this.actors.values())if(a.unit.side==='ally'&&a.unit.hp>0)a.pose=4;this.spark(195,150,0xf9dfa0,30)}
 destroy(){this.dead=true;document.removeEventListener('visibilitychange',this.visibility);for(const t of this.tweens)t.done();this.tweens=[];if(this.app.renderer){this.app.ticker.stop();setTimeout(()=>{this.app.destroy(true,{children:true,texture:false,textureSource:false});for(const source of this.sources)source.destroy();this.sources.clear();this.frames.clear()},0)}}
}
