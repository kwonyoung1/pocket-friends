import {starsOf} from './fusion.ts'
import {elementNames} from './characters.ts'
import {stageById,monsterById} from './stages.ts'
import {Application,Container,Sprite,Texture,Rectangle,Graphics,Text,ImageSource} from 'pixi.js'
import {ASSETS} from './assets'
import type {State,Unit,Action} from './model'
type Actor={root:Container;sprite:Sprite;bar:Graphics;barBg:Graphics;breakBar:Graphics;label:Text;halo:Graphics;barrier:Graphics;aura:Graphics;unit:Unit;pose:number;walking:boolean;time:number;home:{x:number;y:number}}
type Tween={start:number;duration:number;draw:(p:number)=>void;done:()=>void}
export type Cinematic={type:'boss'|'cutin';name:string;art:string;skill?:string}|null
const COLORS={slash:0xb9efff,orb:0xe1d0ff,claw:0xffb58b,kick:0xffcbe2,slam:0xe8bc72,command:0xffe3a1,heal:0x97f2c5,dash:0xff9a66,carrot:0xffb66b,jump:0xffc4e6,shield:0xa3cfff,fire:0xff9554,'enemy-spit':0x84e9ef,vine:0xc591e1,shadow:0xb7a4f9,frost:0xb2eaff,water:0x8bdeef,root:0xa9d990,rally:0xf6df9c,purify:0xd8f4b5,counter:0xd2bc92,nebula:0xc6a6ff,phoenix:0xffa35d,dragon:0xa2d5ff,eclipse:0xb29bea,aegis:0xffe9c9}
export class BattleView{
 app=new Application();camera=new Container();effects=new Container();actors=new Map<string,Actor>();frames=new Map<string,Texture[]>();clock=0;speed=1;quality=true;reduced=false;shortCutin=false;dead=false;selected='';current='';tweens:Tween[]=[];ephemeral=0;private sources=new Set<ImageSource>();private foreground?:Sprite;private inAction=false;private hasBoss=false;private allyCount=0;private height=465;private yScale=1;private preview:string[]=[];private slowFrames=0
 constructor(private host:HTMLElement,private select:(id:string)=>void,private cinematic:(c:Cinematic)=>void){}
 async init(state:State){
  this.quality=(navigator.hardwareConcurrency??8)>4&&((navigator as Navigator&{deviceMemory?:number}).deviceMemory??8)>4
  const box=this.host.getBoundingClientRect();this.height=Math.max(210,Math.min(465,Math.round((box.height||465)*390/(box.width||390))));this.yScale=this.height/465
  await this.app.init({width:390,height:this.height,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,preference:'webgl',powerPreference:'low-power'})
  if(this.dead){this.app.destroy(true);return}
  this.host.appendChild(this.app.canvas);this.app.canvas.setAttribute('aria-label','달빛 숲 도트 전투 필드');this.app.canvas.setAttribute('role','img')
  const load=async(key:string)=>{const img=new Image();img.src=ASSETS[key];await img.decode();if(this.dead)throw Error('Arena closed');const source=new ImageSource({resource:img,scaleMode:key.startsWith('sprite-')||key.startsWith('enemies-')?'nearest':'linear'});this.sources.add(source);return new Texture({source})}
  const stage=state.stageId?stageById(state.stageId):undefined,enemyKey=stage?'enemies-'+stage.region:'enemies'
  for(const id of new Set([...state.units.filter(u=>u.side==='ally').map(u=>u.art),enemyKey])){
   const isEnemy=id==='enemies'||id.startsWith('enemies-'),atlas=await load(id==='enemies'?'sprite-enemies':isEnemy?id:'sprite-'+id),frames:Texture[]=[]
   const count=id==='enemies-christmas'?20:id.startsWith('enemies-')?16:id==='enemies'?12:20,cols=isEnemy?4:5
   for(let n=0;n<count;n++)frames.push(new Texture({source:atlas.source,frame:new Rectangle(n%cols*64,Math.floor(n/cols)*64,64,64)}));this.frames.set(id,frames)
  }
  if(this.dead)return
  const bg=new Sprite(await load(stage&&stage.region!=='forest'?'bg-'+stage.region:'forest'));bg.position.set(-14,-10);bg.width=418;bg.height=this.height+35
  this.camera.pivot.set(195,this.height*.54);this.camera.position.set(195,this.height*.54);this.camera.addChild(bg)
  const pool=new Graphics().ellipse(205,342*this.yScale,168,82*this.yScale).fill({color:0x75c8b5,alpha:.045}).ellipse(205,342*this.yScale,144,70*this.yScale).stroke({color:0xb6e4d4,alpha:.15,width:1});this.camera.addChild(pool)
  this.app.stage.addChild(this.camera);this.camera.addChild(this.effects)
  if(!stage||stage.region==='forest'){const fg=new Sprite(await load('foliage'));fg.width=390;fg.height=this.height;fg.alpha=.68;this.foreground=fg;this.app.stage.addChild(fg)}
  this.app.ticker.add(t=>this.tick(t.deltaMS));document.addEventListener('visibilitychange',this.visibility)
  this.sync(state);this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
 }
 private visibility=()=>{if(this.dead)return;if(document.hidden)this.app.ticker.stop();else this.app.ticker.start()}
 private texture(unit:Unit,frame:number){if(unit.side==='enemy'){const monster=unit.monsterId?monsterById(unit.monsterId):undefined,row=monster?.row??(unit.art==='slime'?0:unit.art==='thorn'?1:2),key=monster?'enemies-'+monster.region:'enemies';const cell=monster?(frame===15||frame===16?3:[10,13,17,18].includes(frame)?1:[11,12,14,19].includes(frame)?2:0):(frame===15?(unit.boss?3:2):frame===16?3:[10,13,17,18].includes(frame)?1:[11,12,14,19].includes(frame)?(unit.boss?2:1):frame<4?frame:0);return this.frames.get(key)![row*4+cell]}return this.frames.get(unit.art)![frame]}
 private actor(u:Unit,index:number):Actor{
  const slots=u.side==='ally'?(this.allyCount===5?[{x:48,y:310},{x:140,y:260},{x:48,y:425},{x:140,y:350},{x:140,y:440}]:[{x:63,y:318},{x:128,y:361},{x:57,y:401},{x:124,y:438}]):u.boss?[{x:286,y:335}]:this.hasBoss?[{x:243,y:204},{x:328,y:232}]:[{x:270,y:215},{x:325,y:292},{x:253,y:364}]
  const slot=slots[index%slots.length],home={x:slot.x,y:Math.min(slot.y*this.yScale,this.height-24)},root=new Container(),shadow=new Graphics().ellipse(0,0,u.boss?32:22,u.boss?8:5).fill({color:0x081521,alpha:.5})
  root.position.set(home.x,home.y);root.zIndex=home.y
  const halo=new Graphics().ellipse(0,0,u.boss?38:27,u.boss?10:8).stroke({color:0xffd88b,width:2,alpha:.9});halo.visible=false
  const sprite=new Sprite(this.texture(u,u.side==='ally'?2:0));sprite.anchor.set(.5,1);sprite.scale.set(u.boss?1.95:u.side==='ally'&&this.allyCount===5?1.1:1.27)
  const h=u.boss?116:u.side==='ally'&&this.allyCount===5?65:76,barBg=new Graphics().roundRect(-21,-h-12,42,4,2).fill({color:0x101b2d,alpha:.95}),bar=new Graphics().roundRect(-21,-h-12,42,4,2).fill(u.side==='ally'?0xa3dfc0:0xf7aaad)
  const breakBar=new Graphics().roundRect(-21,-h-5,42,2,1).fill(0xead28a);breakBar.visible=u.maxToughness>0
  const label=new Text({text:u.name.length>9?u.name.slice(0,9)+'…':u.name,style:{fontFamily:'sans-serif',fontSize:u.boss?11:9,fill:0xf5f1df,stroke:{color:0x122334,width:3},fontWeight:'600'}});label.anchor.set(.5,0);label.position.set(0,5)
  const barrier=new Graphics().ellipse(0,-h*.45,u.boss?48:31,h*.58).fill({color:0x9bcffe,alpha:.06}).stroke({color:0xb7ddff,alpha:.65,width:1.5});barrier.visible=false
  const stars=starsOf(u),aura=new Graphics();if(u.stars&&stars>=2){const color=stars===5?0xffdf87:stars===4?0xd6b4ff:0xbce7ff;aura.ellipse(0,-4,25+stars,8+stars).stroke({color,width:stars>=4?2:1,alpha:.6});for(let n=0;n<stars;n++)aura.star((n-(stars-1)/2)*8,-h-20,4,3,1.5).fill({color,alpha:.85});if(stars>=4)aura.ellipse(0,-25,30,35).stroke({color,width:1,alpha:.25})}
  root.addChild(shadow,aura,halo,sprite,barBg,bar,breakBar,barrier,label);root.eventMode='static';root.cursor='pointer';root.hitArea=new Rectangle(-34,-h,68,h+20);root.on('pointertap',()=>this.select(u.id))
  this.camera.addChild(root);this.camera.sortableChildren=true;this.effects.zIndex=1000
  return{root,sprite,bar,barBg,breakBar,label,halo,barrier,aura,unit:u,pose:-1,walking:false,time:this.clock,home}
 }
 sync(state:State){
  this.allyCount=state.units.filter(u=>u.side==='ally').length;this.hasBoss=state.units.some(u=>u.boss); this.current=state.order[state.cursor]??''
  for(const [id,actor]of this.actors)if(!state.units.some(u=>u.id===id)){this.camera.removeChild(actor.root);actor.root.destroy({children:true});this.actors.delete(id)}
  let a=0,e=0
  for(const u of state.units){let actor=this.actors.get(u.id);if(!actor){actor=this.actor(u,u.side==='ally'?a:e);this.actors.set(u.id,actor)}if(u.side==='ally')a++;else e++
   actor.unit=u;actor.bar.scale.x=Math.max(0,u.hp/u.maxHp);actor.breakBar.scale.x=u.maxToughness?Math.max(0,u.toughness/u.maxToughness):0;actor.breakBar.visible=u.maxToughness>0;actor.label.text=u.broken?'BREAK':u.name.length>9?u.name.slice(0,9)+'…':u.name;actor.root.alpha=u.hp>0?1:.32;actor.barrier.visible=u.hp>0&&(u.shield>0||u.statuses.some(e=>e.type==='counter'))
   if(u.hp<=0){actor.pose=16;actor.root.eventMode='none'}
   else actor.root.eventMode='static'
  }
 }
 choose(id:string,preview:string[]=[]){this.selected=preview.length?'':id;this.preview=preview}
 private tick(dt:number){
  if(this.dead)return;if(dt>45&&dt<250)this.slowFrames++;else this.slowFrames=Math.max(0,this.slowFrames-1);if(this.slowFrames>=45)this.quality=false;this.clock+=Math.min(dt,60)*this.speed
  for(const t of [...this.tweens]){const p=Math.min(1,(this.clock-t.start)/t.duration);t.draw(p);if(p===1){this.tweens.splice(this.tweens.indexOf(t),1);t.done()}}
  for(const a of this.actors.values()){
   let frame=a.pose
   if(a.unit.hp>0&&frame<0)frame=a.unit.side==='enemy'?0:this.reduced?2:Math.floor((this.clock+a.home.y*3)/1100)%5===0?9:2
   if(a.walking)frame=a.unit.side==='enemy'?(Math.floor((this.clock-a.time)/140)%2?10:0):5+Math.floor((this.clock-a.time)/95)%4
   a.sprite.texture=this.texture(a.unit,frame)
   a.halo.visible=a.unit.hp>0&&(a.unit.id===this.selected||a.unit.id===this.current||this.preview.includes(a.unit.id));a.halo.alpha=this.reduced?.8:.65+Math.sin(this.clock/240)*.2
   a.aura.visible=a.unit.hp>0;a.aura.alpha=this.reduced?.8:.65+Math.sin(this.clock/(starsOf(a.unit)===5?420:700))*.2
   if(a.unit.hp>0&&a.pose<0&&!a.walking)a.sprite.y=this.reduced?0:Math.sin(this.clock/850+a.home.y)*.65
  }
  if(this.quality&&!this.reduced&&Math.floor(this.clock/300)!==Math.floor((this.clock-dt*this.speed)/300))this.spark(18+Math.random()*354,(100+Math.random()*310)*this.yScale,0xf2edbd,1,'light')
 }
 private tween(ms:number,draw:(p:number)=>void){return new Promise<void>(done=>{if(this.dead){done();return}this.tweens.push({start:this.clock,duration:Math.max(1,ms),draw,done})})}
 wait(ms:number){return this.tween(ms,()=>{})}
 private async zoom(scale:number,x=195,y=this.height*.54){const before=this.camera.scale.x,bx=this.camera.pivot.x,by=this.camera.pivot.y;await this.tween(this.reduced?1:160,p=>{this.camera.scale.set(before+(scale-before)*p);this.camera.pivot.set(bx+(x-bx)*p,by+(y-by)*p)})}
 private async shake(strength:number){if(this.reduced||!this.quality)return;await this.tween(135,p=>{this.camera.position.set(195+Math.sin(p*32)*strength*(1-p),this.height*.54+Math.cos(p*38)*strength*.4*(1-p));if(this.foreground)this.foreground.x=-Math.sin(p*32)*strength*.3});this.camera.position.set(195,this.height*.54);if(this.foreground)this.foreground.x=0}
 private async move(a:Actor,x:number,y:number,ms=260,jump=0,trail=0){const sx=a.root.x,sy=a.root.y,dx=x-sx;a.walking=true;a.time=this.clock;a.sprite.scale.x=Math.abs(a.sprite.scale.x)*(dx<0?-1:1)*(a.unit.side==='enemy'?-1:1);await this.tween(this.reduced?80:ms,p=>{const e=p*p*(3-2*p);a.root.position.set(sx+(x-sx)*e,sy+(y-sy)*e-Math.sin(p*Math.PI)*jump);a.root.zIndex=a.root.y;if(trail&&this.quality&&Math.floor(p*16)!==Math.floor(Math.max(0,p-.035)*16))this.spark(a.root.x,a.root.y-10,trail,2,trail===0xff9a66?'fire':'spark')});a.walking=false}
 private number(a:Actor,text:string,color:number){const n=new Text({text,style:{fontFamily:'sans-serif',fontSize:text.length>5?12:18,fontWeight:'800',fill:color,stroke:{color:0x142132,width:4}}});n.anchor.set(.5);n.position.set(a.root.x,a.root.y-(a.unit.boss?110:75));this.effects.addChild(n);const y=n.y;void this.tween(650,p=>{n.y=y-p*30;n.alpha=1-p}).then(()=>n.destroy())}
 private spark(x:number,y:number,color:number,count:number,kind='spark'){
  const cap=this.quality?48:16;count=Math.min(count,this.reduced?3:cap-this.ephemeral)
  for(let i=0;i<count;i++){
   this.ephemeral++;const g=new Graphics();if(kind==='rock')g.poly([-3,-4,3,-2,4,2,-2,4]).fill(color);else if(kind==='fire')g.poly([0,-5,3,0,1,3,-2,2,-3,-1]).fill(color);else g.circle(0,0,kind==='light'?1:1.4+Math.random()*1.6).fill(color)
   g.position.set(x,y);this.effects.addChild(g);const vx=(Math.random()-.5)*(kind==='light'?12:65),vy=kind==='light'?-15:-20-Math.random()*45,life=kind==='light'?1300:450
   void this.tween(life,p=>{g.x=x+vx*p;g.y=y+vy*p+(kind==='light'?0:55*p*p);g.alpha=(1-p)*(kind==='light'?.45:1)}).then(()=>{g.destroy();this.ephemeral--})
  }
 }
 private ring(x:number,y:number,color:number,size=1){const g=new Graphics().ellipse(0,0,34*size,12*size).stroke({color,width:3,alpha:.9});g.position.set(x,y);this.effects.addChild(g);void this.tween(this.reduced?120:420,p=>{g.scale.set(1+p*2.3);g.alpha=1-p}).then(()=>g.destroy())}
 private async projectile(a:Actor,b:Actor,carrot:boolean,color:number,style='orb'){
  const g=new Graphics();if(carrot){g.poly([-5,-10,5,-10,1,12,-1,15]).fill(0xffa13e).stroke({color:0xc46d28,width:1});g.poly([-1,-10,-8,-18,-1,-15,3,-21,5,-14,10,-17,5,-9]).fill(0x85c36e);g.moveTo(-3,-4).lineTo(2,-3).moveTo(-2,2).lineTo(2,3).stroke({color:0xe37931,width:1})}else if(style==='nebula')g.circle(0,0,8).fill({color:0xa48be3,alpha:.6}).ellipse(0,0,13,4).stroke({color:0xd4e8ff,width:2});else if(style==='dragon')g.poly([-10,0,-4,-5,5,-4,13,0,5,4,-4,5]).fill(0xa4dcff).stroke({color:0xffe4ae,width:1});else if(style==='phoenix')g.poly([-12,2,-5,-6,0,-2,5,-6,12,2,0,6]).fill(0xffba65);else if(style==='aegis')g.ellipse(0,0,4,12).fill(0xffecca).moveTo(0,-10).lineTo(0,10).stroke({color:0xe0c2ff,width:1});else if(style==='frost')g.poly([0,-10,5,0,0,9,-5,0]).fill(0xbcefff).stroke({color:0xf1ffff,width:1});else if(style==='water')g.moveTo(0,-9).bezierCurveTo(11,1,7,8,0,8).bezierCurveTo(-7,8,-11,1,0,-9).fill(color).stroke({color:0xd8ffff,width:1});else if(style==='root')g.ellipse(0,0,4,9).fill(0xa8d58a).moveTo(0,-7).lineTo(0,7).stroke({color:0x416e42,width:1});else g.circle(0,0,5).fill(color).circle(0,0,9).fill({color,alpha:.18})
  const x=a.root.x,y=a.root.y-44,tx=b.root.x,ty=b.root.y-38;g.position.set(x,y);this.effects.addChild(g)
  await this.tween(this.reduced?150:370,p=>{g.position.set(x+(tx-x)*p,y+(ty-y)*p-Math.sin(p*Math.PI)*(carrot?62:9));g.rotation=carrot?-Math.PI/2+p*.8:0;if(this.quality&&Math.floor(p*12)%2===0)this.spark(g.x,g.y,color,1)})
  g.destroy();this.spark(tx,ty,color,carrot?12:8);if(carrot)this.spark(tx,ty,0xa7d27b,5)
 }
 private async recoil(a:Actor){const x=a.root.x;a.pose=15;await this.tween(this.reduced?80:160,p=>{a.root.x=x+Math.sin(p*Math.PI)*(a.unit.side==='enemy'?7:-5);a.sprite.tint=p<.45?0xffd7d4:0xffffff});a.root.x=x;a.sprite.tint=0xffffff;a.pose=a.unit.hp>0?-1:16}
 private afterimages(a:Actor){if(!this.quality||this.reduced)return;for(let n=1;n<=2;n++){const sprite=new Sprite(a.sprite.texture);sprite.anchor.set(.5,1);sprite.scale.copyFrom(a.sprite.scale);sprite.tint=0x9b83e5;sprite.alpha=.28/n;sprite.position.set(a.root.x-n*14,a.root.y);this.effects.addChild(sprite);const x=sprite.x;void this.tween(300,p=>{sprite.x=x-p*20;sprite.alpha=(1-p)*.28/n}).then(()=>sprite.destroy())}}
 private impact(a:Actor,style:string,color:number,source?:string){
  const g=new Graphics(),x=a.root.x,y=a.root.y;g.position.set(x,y);this.effects.addChild(g)
  if(source==='special-boy'&&style==='slash'){g.star(0,-37,4,25,7).fill({color:0xe7f8ff,alpha:.7});g.moveTo(-30,-15).lineTo(25,-58).stroke({color:0xa7ddff,width:3})}
  else if(style==='nebula'){for(let n=0;n<3;n++)g.ellipse(0,-30,16+n*7,6+n*3).stroke({color:0xcdb6fa,width:2,alpha:.8})}
  else if(style==='dragon'){for(let n=0;n<5;n++){const x=Math.cos(n*Math.PI*.4)*27,y=Math.sin(n*Math.PI*.4)*12-30;g.moveTo(0,-30).lineTo(x,y).stroke({color:0xa7dcff,width:2});g.star(x,y,4,4,2).fill(0xffe6ae)}}
  else if(style==='phoenix'){for(const side of [-1,1])g.moveTo(0,-15).bezierCurveTo(side*32,-24,side*35,-50,side*15,-52).bezierCurveTo(side*22,-35,side*10,-25,0,-15).fill({color:0xffad62,alpha:.7})}
  else if(style==='aegis'){g.poly([0,-68,27,-53,25,-25,0,-5,-25,-25,-27,-53]).stroke({color:0xffecc9,width:3}).circle(0,-37,10).stroke({color:0xe6c6fa,width:2})}
  else if(style==='frost'){for(let n=-2;n<=2;n++)g.poly([n*9-4,0,n*9,-22-Math.abs(n)*4,n*9+4,0]).fill({color:0xb1e5ff,alpha:.65}).stroke({color:0xe2ffff,width:1})}
  else if(style==='water'){for(let n=0;n<3;n++)g.ellipse(0,-n*7,18+n*8,6+n*2).stroke({color:0x9eeaff,alpha:.8,width:2})}
  else if(style==='root'||style==='heal'&&source==='lulu'){for(const n of [-1,1])g.moveTo(0,0).bezierCurveTo(n*20,-7,n*9,-30,n*23,-43).stroke({color:0xa6d38c,width:2}).ellipse(n*19,-29,6,3).fill(0xb2df8c)}
  else if(style==='slam'){for(let n=0;n<5;n++){const angle=n*Math.PI*.4;g.moveTo(0,0).lineTo(Math.cos(angle)*13,Math.sin(angle)*5).lineTo(Math.cos(angle+.1)*27,Math.sin(angle+.1)*11).lineTo(Math.cos(angle)*42,Math.sin(angle)*16).stroke({color:0xe7bd80,width:2})}}
  else if(['slash','claw','fire','shadow','dash','eclipse'].includes(style)){for(let n=0;n<(style==='claw'||style==='shadow'||style==='eclipse'?3:1);n++)g.moveTo(-19+n*8,-57).bezierCurveTo(7+n*4,-40,-4+n*4,-25,21+n*3,-20).stroke({color,alpha:.9,width:style==='shadow'?3:2})}
  else if(style==='purify'){for(let n=-1;n<=1;n++)g.moveTo(n*12,-60).bezierCurveTo(n*12+12,-40,n*12-8,-20,n*12,0).stroke({color:0xe5ffe0,width:2,alpha:.8})}
  else if(style==='rally'||style==='command'){g.poly([0,-22,5,-10,19,-8,9,1,12,14,0,7,-12,14,-9,1,-19,-8,-5,-10]).stroke({color:0xffe6a7,width:2})}
  else if(style==='counter'||style==='shield')g.arc(0,-34,29,-Math.PI*.9,-Math.PI*.1).stroke({color:0xc9e2ff,width:3})
  else{g.circle(0,-35,15).stroke({color,width:2,alpha:.8})}
  void this.tween(this.reduced?120:380,p=>{g.alpha=1-p;g.scale.set(1+p*.2)}).then(()=>g.destroy())
 }
 async intro(boss=false){
  if(boss){const a=[...this.actors.values()].find(a=>a.unit.boss);if(!a)return;a.sprite.tint=0x101e29;this.cinematic({type:'boss',name:a.unit.name,art:a.unit.art});await this.zoom(1.12,235,280*this.yScale);await this.wait(450);a.sprite.tint=0xffffff;this.ring(a.root.x,a.root.y,0x99e3cd);void this.shake(3);await this.wait(500);this.cinematic(null);await this.zoom(1)}else{await this.wait(250)}
 }
 async previewCutin(unit:Unit,skillName:string){const highest=!!unit.stars&&starsOf(unit)===5;if(highest){const a=this.actors.get(unit.id);if(a){this.ring(a.root.x,a.root.y,0xffe3a1,1.8);this.spark(a.root.x,a.root.y-40,0xffe3a1,this.quality?16:4,'light')}}this.cinematic({type:'cutin',name:unit.name,art:unit.art,skill:(highest?'★★★★★ · ':'')+skillName});await this.wait(this.shortCutin||this.reduced?260:850);this.cinematic(null)}
 async play(action:Action,onImpact:()=>void){
  if(this.dead||this.inAction)return;this.inAction=true
  const a=this.actors.get(action.actor)!,targets=action.targets.map(id=>this.actors.get(id)!).filter(Boolean),k=action.skill,color=k.style==='dash'?(a.unit.element==='dark'?0xb7a4f9:a.unit.element==='light'?0xffe3a1:0xff9a66):COLORS[k.style],ranged=['orb','carrot','enemy-spit','heal','shield','command','water','frost','root','rally','purify','counter','nebula','dragon','phoenix','aegis'].includes(k.style)
  try{
   if(action.ultimate)await this.previewCutin(a.unit,k.name)
   await this.zoom(action.ultimate?1.1:k.style==='dragon'?1.075:k.style==='eclipse'?1.065:k.style==='phoenix'?1.05:k.style==='aegis'?1.025:1.035,k.style==='eclipse'?230:195,(k.style==='dragon'?260:285)*this.yScale)
   a.pose=k.style==='counter'?17:['carrot','slam','dash','shadow'].includes(k.style)?18:ranged?13:10
   await this.wait(k.style==='slam'?230:140)
   if(k.style==='shadow'||k.style==='eclipse'||a.unit.heroId==='dudu')this.afterimages(a)
   if(k.style==='dash'){this.spark(a.root.x,a.root.y-8,color,10);this.ring(a.root.x,a.root.y,color)}
   if(!ranged&&targets.length){const target=targets[0];if(this.allyCount===5&&a.unit.side==='ally'&&a.home.x<80)await this.move(a,a.home.x,140*this.yScale,110);await this.move(a,target.root.x+(a.unit.side==='ally'?-48:48),target.root.y+5,k.style==='dash'||k.style==='shadow'?180:280,k.style==='jump'?65:k.style==='kick'?24:0,k.style==='dash'?color:0);a.pose=k.style==='slam'||k.style==='dash'?19:11;await this.wait(k.style==='slam'?110:75)}
   else{a.pose=k.style==='carrot'?19:14;if(['orb','carrot','enemy-spit','water','frost','root','nebula','dragon','phoenix','aegis'].includes(k.style))await Promise.all(targets.map(t=>this.projectile(a,t,k.style==='carrot',color,k.style)));else{await Promise.all(targets.map(t=>this.projectile(a,t,false,color)));for(const t of targets){this.ring(t.root.x,t.root.y,color);this.spark(t.root.x,t.root.y-35,color,9)}await this.wait(180)}}
   if(k.style==='dash'&&targets.length){this.spark(a.root.x,a.root.y-12,color,15);await this.move(a,Math.min(357,targets[targets.length-1].root.x+35),targets[targets.length-1].root.y,125,0,color);a.pose=19}
   for(const t of targets)this.impact(t,k.style,color,a.unit.heroId)
   for(const t of targets){const tier=a.unit.stars?starsOf(a.unit):1,flare=Math.max(0,tier-2);this.ring(t.root.x,t.root.y,color,1+flare*.15);this.spark(t.root.x,t.root.y-20,color,(k.style==='slam'?15:8)+flare*2,k.style==='slam'?'rock':'spark')}
   if(k.style==='slam'&&k.id!=='basic'){this.ring(a.root.x,a.root.y,color,1.8);this.spark(a.root.x,a.root.y,color,15,'rock')}
   if(['slam','dash','fire','jump'].includes(k.style))void this.shake(k.style==='slam'?5:3)
   // Painted contact pose is held briefly at impact, before recoil/return.
   await this.wait(this.reduced?1:55);onImpact()
   for(const hit of action.hits){const t=this.actors.get(hit.id);if(!t)continue;this.number(t,hit.miss?'회피':hit.heal?`+${hit.heal}`:hit.shield?'보호막':hit.buff?'공격 강화':`${hit.critical?'CRIT ':''}${hit.damage}`,hit.heal?0xa2efc3:hit.shield||hit.buff?0xc7dbff:0xffe2ac);if(hit.damage||hit.miss)void this.recoil(t);if(hit.break)this.number(t,'BREAK',0xf5de95);if(hit.counter){this.number(a,`${hit.counter}`,0xffbc96);void this.recoil(a)}}
   if(k.hits>1){for(let n=1;n<k.hits;n++){a.pose=ranged?13:10;await this.wait(60);a.pose=ranged?14:11;if(ranged)await Promise.all(targets.map(t=>this.projectile(a,t,k.style==='carrot',color,k.style)));else await this.wait(40);for(const t of targets)this.spark(t.root.x,t.root.y-30,color,5)}}
   const echoes=action.resonances??[]
   for(const element of [...new Set(echoes.map(h=>h.element))]){
    const style=({fire:'phoenix',water:'frost',nature:'root',earth:'slam',light:'dragon',dark:'nebula'} as const)[element],color=({fire:0xffa35d,water:0xb2eaff,nature:0xa9d990,earth:0xe8bc72,light:0xffe5a8,dark:0xc6a6ff})[element]
    for(const hit of echoes.filter(h=>h.element===element)){const t=this.actors.get(hit.id);if(!t)continue;this.impact(t,style,color);this.ring(t.root.x,t.root.y,color,.65);this.spark(t.root.x,t.root.y-30,color,this.quality?5:2,element==='fire'?'fire':element==='earth'?'rock':'spark');this.number(t,`${elementNames[element]} +${hit.damage}`,color);if(hit.break)this.number(t,'BREAK',0xf5de95)}
    await this.wait(this.reduced?35:95)
   }
   await this.wait(200)
   if(!ranged){if(this.allyCount===5&&a.unit.side==='ally'&&a.home.x<80)await this.move(a,a.home.x,140*this.yScale,110);await this.move(a,a.home.x,a.home.y,260);a.pose=0;await this.wait(70)}
   a.sprite.scale.x=Math.abs(a.sprite.scale.x);a.pose=a.unit.hp>0?-1:16;await this.zoom(1)
  }finally{this.inAction=false}
 }
 victory(){for(const a of this.actors.values())if(a.unit.side==='ally'&&a.unit.hp>0)a.pose=4;this.spark(195,150*this.yScale,0xf9dfa0,30)}
 destroy(){this.dead=true;document.removeEventListener('visibilitychange',this.visibility);for(const t of this.tweens)t.done();this.tweens=[];if(this.app.renderer){this.app.ticker.stop();setTimeout(()=>{this.app.destroy(true,{children:true,texture:false,textureSource:false});for(const source of this.sources)source.destroy();this.sources.clear();this.frames.clear()},0)}}
}
