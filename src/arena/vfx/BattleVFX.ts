import {Container,Graphics,Sprite,Texture,Text} from 'pixi.js'
import {ParticleManager} from './ParticleManager'
import {budgets,elements} from './presets'
import type {Preset,Quality,Family} from './presets'
import type {Unit} from '../types.ts'
export type Point={x:number;y:number;height:number;width:number;depth?:number}
type Shape={g:Graphics;age:number;life:number;draw:(g:Graphics,p:number)=>void}
type Float={text:Text;age:number;life:number;x:number;y:number;rise:number}
/** Display-only consumer of resolved combat results. Coordinates are foot anchors, never a fixed screen centre. */
export class BattleVFX{
 readonly ground=new Container();readonly air=new Container();readonly particles:ParticleManager
 quality:Quality='medium';reduced=false;private live:Shape[]=[];private free:Graphics[]=[];private labels:Float[]=[];private textPool:Text[]=[];private statuses=new Map<string,{key:string;g:Graphics;unit:Unit;point:Point}>();private time=0;private lastStatus=0;private serial=0;private dead=false;eventCounts:Record<string,number>={};events:{phase:string;family:string;x:number;y:number;hit?:number}[]=[];peakShapes=0;peakTexts=0;peakFrameMs=0;frames=0;totalFrameMs=0
 constructor(parent:Container){this.ground.zIndex=1;this.air.zIndex=1003;parent.addChild(this.ground,this.air);this.particles=new ParticleManager(parent)}
 event(phase:string,p:Preset,a:Point,hit?:number){this.eventCounts[phase]=(this.eventCounts[phase]??0)+1;this.events.push({phase,family:p.family,x:Math.round(a.x),y:Math.round(a.y),...(hit===undefined?{}:{hit})});if(this.events.length>48)this.events.shift()}
 get metrics(){return{active:this.particles.count,allocated:this.particles.allocated,peak:this.particles.peak,shapes:this.live.length,peakShapes:this.peakShapes,texts:this.labels.length,peakTexts:this.peakTexts,tier:this.quality,frames:this.frames,averageFrameMs:this.frames?this.totalFrameMs/this.frames:0,peakFrameMs:this.peakFrameMs,timings:'render ticker; not physical device FPS',events:this.events,eventCounts:this.eventCounts}}
 private shape(parent:Container,life:number,draw:Shape['draw']){if(this.dead||this.live.length>=budgets[this.quality].shapes)return;const g=this.free.pop()??new Graphics();g.visible=true;g.alpha=1;g.scale.set(1);g.rotation=0;g.position.set(0,0);parent.addChild(g);draw(g,0);this.live.push({g,age:0,life:this.reduced?Math.min(120,life):life,draw});this.peakShapes=Math.max(this.peakShapes,this.live.length)}
 prepare(p:Preset,a:Point){this.event('prepare',p,a);const color=p.color,r=Math.max(18,a.width*.65),life=p.windup+180;this.particles.emit(p.motif,a.x,a.y-a.height*.6,color,8+p.tier*2,7,22,life,-6)
  this.shape(this.ground,life,(g,t)=>{g.clear().ellipse(a.x,a.y,r*(.7+t*.3),r*.27).stroke({color,width:1.5,alpha:(1-t)*.7});for(let n=0;n<6;n++){const angle=n*Math.PI/3+t*.4;g.moveTo(a.x+Math.cos(angle)*r*.7,a.y+Math.sin(angle)*r*.2).lineTo(a.x+Math.cos(angle)*r,a.y+Math.sin(angle)*r*.27).stroke({color,width:1,alpha:.65*(1-t)})}})
 }
 projectile(p:Preset,from:Point,to:Point,progress:number){const dx=to.x-from.x,dy=(to.y-to.height*.5)-(from.y-from.height*.5),arc=p.family==='alchemy'||p.family==='carrot'?48:p.family==='arrow'?8:22,x=from.x+dx*progress,y=from.y-from.height*.5+dy*progress-Math.sin(progress*Math.PI)*arc
  if(progress===0)this.event('release',p,from)
  if(this.serial++%2===0)this.particles.emit(p.motif,x,y,p.color,2,7,14,220,0)
  return{x,y,angle:Math.atan2(dy,dx)}
 }
 launch(p:Preset,from:Point,to:Point,travel:number){
  this.event('release',p,from);this.shape(this.air,travel,(g,t)=>{const pos=this.projectile(p,from,to,t),r=p.family==='alchemy'?8:p.family==='carrot'?6:5;g.clear();g.position.set(pos.x,pos.y);g.rotation=pos.angle
   if(p.family==='arrow'){g.moveTo(-23,0).lineTo(13,0).stroke({color:p.core,width:2}).poly([14,0,5,-5,5,5]).fill(p.color).moveTo(-19,-5).lineTo(-13,0).lineTo(-19,5).stroke({color:p.color,width:2})}
   else if(p.family==='carrot'){g.rotation+=Math.PI/2;g.poly([-6,-9,6,-9,0,14]).fill(0xffa653).moveTo(0,-9).lineTo(-7,-16).moveTo(0,-9).lineTo(5,-18).stroke({color:0xa8df84,width:3})}
   else if(p.family==='alchemy'){g.rotation=t*6;g.roundRect(-7,-6,14,16,4).fill({color:0xd4b6ff,alpha:.75}).stroke({color:0xfce2ff,width:1}).rect(-3,-11,6,6).fill(0xeedcb6).circle(1,3,4).fill(0x9adb99)}
   else if(p.family==='frost')g.poly([-14,0,0,-6,12,0,0,6]).fill(p.core).poly([-8,0,0,-9,6,0,0,9]).stroke({color:p.color,width:2})
   else{g.ellipse(-6,0,17,5).fill({color:p.color,alpha:.2}).ellipse(0,0,r+3,r).fill(p.color).star(2,0,4,r+4,2).fill(p.core);if(p.family==='nebula')g.ellipse(0,0,13,6).stroke({color:p.core,width:1})}
  })
 }
 impact(p:Preset,a:Point,hit=0,critical=false,broken=false){this.event('impact',p,a,hit);const size=Math.max(18,Math.min(46,a.width*.7))*(p.ultimate?1.25:1),life=p.ultimate?600:360,c=p.color,core=p.core
  this.particles.emit(p.motif,a.x,a.y-a.height*.4,c,10+p.tier*3+Math.min(4,p.stars),9,60,life,p.family==='quake'?110:15)
  if(!this.reduced)this.particles.emit('spark',a.x,a.y-a.height*.5,core,5,10,25,180)
  this.shape(this.ground,life,(g,t)=>{g.clear();g.position.set(a.x,a.y);g.alpha=(1-t)*.7;const r=size*(.5+t),flat=r*.3
   if(['flame','wing'].includes(p.family)){for(let n=0;n<5;n++){const x=(n-2)*r*.4;g.moveTo(x,3).bezierCurveTo(x-r*.2,-r*.25,x+r*.2,-r*.5,x,-r*.65).bezierCurveTo(x+r*.35,-r*.2,x+r*.25,3,x,3).fill({color:c,alpha:.7})}}
   else if(p.family==='quake'){for(let n=0;n<6;n++){const angle=n*Math.PI/3;g.moveTo(0,0).lineTo(Math.cos(angle)*r*.55,Math.sin(angle)*flat*.5).lineTo(Math.cos(angle+.15)*r,Math.sin(angle+.15)*flat).stroke({color:core,width:2})}}
   else if(p.family==='frost'){for(let n=0;n<6;n++){const x=Math.cos(n*Math.PI/3)*r,y=Math.sin(n*Math.PI/3)*flat;g.moveTo(0,0).lineTo(x,y).lineTo(x*.6-y*.2,y*.6-4).stroke({color:core,width:1.5})}}
   else if(p.family==='bloom'){for(let n=0;n<5;n++){const x=Math.cos(n*1.26)*r,y=Math.sin(n*1.26)*flat;g.moveTo(0,0).quadraticCurveTo(x,y-12,x,y).stroke({color:c,width:2}).ellipse(x,y,5,2).fill(core)}}
   else{g.ellipse(0,0,r,flat).stroke({color:c,width:2,alpha:.8});if(p.tier>=3||p.ultimate)g.ellipse(0,0,r*1.22,flat*1.22).stroke({color:core,width:1,alpha:.5})}
  })
  this.shape(this.air,life,(g,t)=>{g.clear();g.position.set(a.x,a.y-a.height*.48);g.alpha=1-t;this.drawImpact(g,p.family,size*(.65+t*.35),c,core,t,hit)
   if(critical||broken)g.star(0,0,broken?6:4,size*1.1,size*.3).stroke({color:broken?0xffe5a1:core,width:1.5,alpha:(1-t)*.7})
  })
 }
 private drawImpact(g:Graphics,f:Family,r:number,c:number,core:number,t:number,hit:number){
  if(f==='blade'||f==='rift'){g.rotation=(hit%2?-.65:.4);for(let n=0;n<(f==='rift'?3:2);n++){const y=(n-1)*10;g.moveTo(-r,y+r*.45).bezierCurveTo(-r*.3,y-r,r*.6,y-r*.7,r,y-r*.3).bezierCurveTo(r*.4,y-r*.35,-r*.2,y-r*.1,-r,y+r*.45).fill({color:c,alpha:.8-n*.16});g.moveTo(-r*.8,y+r*.15).quadraticCurveTo(0,y-r*.65,r*.9,y-r*.35).stroke({color:core,width:2})}}
  else if(f==='flame'||f==='wing'){for(const side of [-1,1]){g.moveTo(0,r*.3).bezierCurveTo(side*r*1.5,-r*.1,side*r*1.4,-r*1.4,side*r*.2,-r).bezierCurveTo(side*r*.8,-r*.45,side*r*.35,-r*.2,0,r*.3).fill({color:c,alpha:.65});for(let n=0;n<3;n++)g.moveTo(side*5,-n*7).quadraticCurveTo(side*r,-r*.3-n*6,side*r*(.65+n*.12),-r*(.5+n*.2)).stroke({color:core,width:2,alpha:.7})}}
  else if(f==='frost'){for(let n=0;n<5;n++){const x=(n-2)*r*.35,h=r*(.6+Math.sin(n+1)*.35);g.poly([x-6,r*.5,x,-h,x+8,r*.5]).fill({color:c,alpha:.45}).stroke({color:core,width:1.4});g.moveTo(x,-h).lineTo(x+2,r*.3).stroke({color:0xffffff,width:1,alpha:.5})}}
  else if(f==='nebula'){g.ellipse(0,0,r,r*.35).fill({color:0x684bb2,alpha:.3}).stroke({color:c,width:3});for(let n=0;n<3;n++){const angle=t*3+n*2.1,x=Math.cos(angle)*r,y=Math.sin(angle)*r*.45;g.star(x,y,4,7,2).fill(core).ellipse(x,y,10,3).stroke({color:c,width:1})}g.ellipse(0,0,r*.55,r).stroke({color:core,width:1,alpha:.7})}
  else if(f==='alchemy'){g.poly([0,-r,r*.85,-r*.5,r*.85,r*.5,0,r,-r*.85,r*.5,-r*.85,-r*.5]).stroke({color:c,width:2});for(let n=0;n<6;n++){const angle=n*1.05+t,x=Math.cos(angle)*r*.75,y=Math.sin(angle)*r*.75;g.circle(x,y,5+n%3).fill({color:[0xffa578,0xd3b2ff,0x9ee0a0][n%3],alpha:.7}).circle(x-1,y-2,2).fill(core)}}
  else if(f==='guardian'){g.arc(0,-r*.45,r*.7,0,Math.PI*2).stroke({color:core,width:2});for(const side of [-1,1])for(let n=0;n<4;n++){const x=side*(r*.25+n*5),y=-r*.1-n*5;g.moveTo(side*3,r*.6).quadraticCurveTo(x*1.4,y-r*.5,x,y).quadraticCurveTo(side*r*.2,y+r*.25,side*3,r*.6).fill({color:core,alpha:.35+n*.1}).stroke({color:c,width:1})}}
  else if(f==='moon'){g.arc(0,-5,r*.8,Math.PI*.15,Math.PI*1.8).stroke({color:core,width:4}).arc(r*.18,-r*.1,r*.55,Math.PI*.5,Math.PI*1.5).stroke({color:c,width:2});g.poly([0,-r,r*.7,-r*.55,r*.6,r*.4,0,r,-r*.6,r*.4,-r*.7,-r*.55]).stroke({color:core,width:1.5,alpha:.7})}
  else if(f==='bloom'){for(const side of [-1,1])g.moveTo(0,r*.7).bezierCurveTo(side*r,-r*.2,-side*r*.2,-r*.5,side*r*.5,-r).stroke({color:c,width:3}).ellipse(side*r*.35,-r*.3,8,3).fill(core);g.star(0,-r*.5,5,8,3).fill({color:0xffc5db,alpha:.7})}
  else if(f==='quake'){for(let n=0;n<4;n++){const x=(n-1.5)*r*.5;g.poly([x-6,r*.4,x-9,-r*.25,x,-r*.65,x+9,-r*.2,x+6,r*.4]).fill({color:c,alpha:.7}).stroke({color:core,width:1})}}
  else if(f==='arrow'||f==='carrot'){for(let n=0;n<3;n++){const x=(n-1)*r*.5;g.moveTo(x-r*.25,-r).lineTo(x+r*.15,r*.4).stroke({color:core,width:2});g.star(x+r*.15,r*.4,4,7,2).fill(c)}}
  else{const points=6;for(let n=0;n<points;n++){const a=n*Math.PI/3,b=(n+2)*Math.PI/3;g.moveTo(Math.cos(a)*r,Math.sin(a)*r).lineTo(Math.cos(b)*r,Math.sin(b)*r).stroke({color:c,width:1,alpha:.5});g.star(Math.cos(a)*r,Math.sin(a)*r,4,5,2).fill(core)}g.star(0,0,4,r*.5,r*.12).fill(core)}
 }
 ultimate(p:Preset,a:Point,targets:Point[]){this.event('ultimate',p,a);const life=650;this.shape(this.air,life,(g,t)=>{g.clear().rect(0,0,390,600).fill({color:p.color,alpha:Math.sin(t*Math.PI)*.09});g.position.set(0,0)})
  targets.forEach((target,i)=>{this.shape(this.ground,life+i*30,(g,t)=>{g.clear();g.position.set(target.x,target.y);g.alpha=Math.sin(t*Math.PI)*.55;this.drawImpact(g,p.family,Math.min(46,target.width*.8)*(1+t*.4),p.color,p.core,t,i);g.scale.y=.45})});this.particles.emit(p.motif,a.x,a.y-a.height*.6,p.core,20,12,35,800,-15)
 }
 ghost(texture:Texture,p:Point,scaleX:number,scaleY:number,offsetX:number,offsetY:number){if(this.quality==='low'||this.reduced)return;for(let n=1;n<=2;n++){if(this.live.length>=budgets[this.quality].shapes)break;const s=new Sprite(texture);s.anchor.set(.5,1);s.scale.set(scaleX,scaleY);s.position.set(p.x+offsetX-n*9,p.y+offsetY);s.tint=0xc0bcff;s.alpha=.25/n;this.air.addChild(s);const x=s.x;this.shape(this.air,180+n*50,(g,t)=>{g.visible=false;s.x=x-t*15;s.alpha=(1-t)*.25/n;if(t>=1)s.destroy()})}}
 number(a:Point,value:string,kind:'damage'|'critical'|'heal'|'shield'|'block'|'break'|'dot'='damage',strike=0,color?:number){if(this.labels.length>=16){const old=this.labels.shift()!;old.text.visible=false;old.text.removeFromParent();this.textPool.push(old.text)}const text=this.textPool.pop()??new Text({text:'',style:{fontFamily:'sans-serif',fontSize:15,fontWeight:'800',stroke:{color:0x132133,width:3}}});text.style.fontSize=kind==='critical'?20:kind==='dot'?11:kind==='block'?13:15;text.style.fill=color??({damage:0xffebcb,critical:0xffd480,heal:0xaffece,shield:0xc9e9ff,block:0xfff2ba,break:0xffdd90,dot:0xc7a4ef})[kind];text.text=value;text.anchor.set(.5);text.visible=true;text.alpha=1;text.scale.set(1);const x=Math.max(text.width/2+7,Math.min(383-text.width/2,a.x+(strike%3-1)*11)),baseY=Math.max(48,a.y-a.height-34-(strike%3)*16);let y=baseY;for(let attempt=0;attempt<4&&this.labels.some(l=>Math.abs(l.x-x)<(l.text.width+text.width)/2+3&&Math.abs(l.text.y-y)<18);attempt++)y=Math.max(34,y-18);text.position.set(x,y);this.air.addChild(text);this.labels.push({text,age:0,life:this.reduced?260:kind==='heal'?650:530,x,y,rise:kind==='heal'?26:18});this.peakTexts=Math.max(this.peakTexts,this.labels.length)}
 sync(units:readonly Unit[],point:(u:Unit)=>Point|undefined){const alive=new Set<string>();for(const u of units){const a=point(u);if(!a||u.hp<=0)continue;alive.add(u.id);const key=JSON.stringify([u.statuses.map(s=>s.type),u.shield>0,!!u.moonGrace]),old=this.statuses.get(u.id);if(old&&old.key===key){old.point=a;old.unit=u;old.g.position.set(a.x,a.y);continue}if(old){if(old.unit.statuses.some(s=>s.type==='freeze')&&!u.statuses.some(s=>s.type==='freeze'))this.particles.emit('ice',a.x,a.y-a.height*.4,0xbceaff,7,7,35,350,70);old.g.destroy()}const g=new Graphics(),r=Math.max(12,a.width*.55),h=a.height*.65;g.position.set(a.x,a.y);this.air.addChild(g)
   if(u.shield>0||u.moonGrace)g.ellipse(0,-h*.65,r,h).fill({color:0xb9dbff,alpha:.035}).stroke({color:u.moonGrace?0xffeac6:0xb9dbff,width:1,alpha:.4})
   const types=new Set(u.statuses.map(s=>s.type));if(types.has('freeze'))for(let n=-1;n<=1;n++)g.poly([n*8-4,0,n*8,-h+Math.abs(n)*8,n*8+5,0]).fill({color:0xa9e4ff,alpha:.25}).stroke({color:0xe1f8ff,width:1})
   if(types.has('stun'))for(let n=-1;n<=1;n++)g.star(n*9,-a.height-25,5,3,1.5).fill(0xffe9a2)
   if(types.has('defense-down'))g.poly([-8,-h-12,0,-h-15,8,-h-12,5,-h-3,0,-h,-5,-h-3]).stroke({color:0xeea2ac,width:1.5}).moveTo(2,-h-14).lineTo(-2,-h-9).lineTo(2,-h-6).stroke({color:0xffe6e6,width:1})
   if(types.has('attack-up'))g.moveTo(-r,-h).lineTo(-r+4,-h-7).lineTo(-r+8,-h).moveTo(r-8,-h).lineTo(r-4,-h-7).lineTo(r,-h).stroke({color:0xffdc9e,width:2})
   this.statuses.set(u.id,{key,g,unit:u,point:a})
  }for(const[id,s]of this.statuses)if(!alive.has(id)){s.g.destroy();this.statuses.delete(id)}
 }
 tick(ms:number,rawMs:number,w:number,h:number){if(this.dead)return;this.time+=ms;if(rawMs>0&&rawMs<250){this.frames++;this.totalFrameMs+=rawMs;this.peakFrameMs=Math.max(this.peakFrameMs,rawMs)}this.particles.quality=this.quality;this.particles.reduced=this.reduced;this.particles.tick(ms,w,h);while(this.live.length>budgets[this.quality].shapes){const l=this.live.pop()!;l.draw(l.g,1);l.g.removeFromParent();l.g.clear();this.free.push(l.g)}
  for(let i=this.live.length-1;i>=0;i--){const l=this.live[i];l.age+=ms;const t=Math.min(1,l.age/l.life);l.draw(l.g,t);if(t>=1){l.g.removeFromParent();l.g.clear();l.g.visible=true;l.g.scale.set(1);this.free.push(l.g);this.live.splice(i,1)}}
  for(let i=this.labels.length-1;i>=0;i--){const l=this.labels[i];l.age+=ms;const p=Math.min(1,l.age/l.life);l.text.y=l.y-l.rise*p;l.text.alpha=Math.min(1,(1-p)*3);if(!this.reduced)l.text.scale.set(1+Math.sin(Math.min(1,p*4)*Math.PI)*.16);if(p>=1){l.text.visible=false;l.text.removeFromParent();this.textPool.push(l.text);this.labels.splice(i,1)}}
  if(this.time-this.lastStatus>420){this.lastStatus=this.time;for(const s of this.statuses.values()){const a=s.point;for(const status of s.unit.statuses){const kind=status.type;if(kind==='burn'||kind==='poison'||kind==='bleed'||kind==='regen'){const e=elements[kind==='burn'?'fire':kind==='regen'?'nature':'dark'];this.particles.emit(kind==='bleed'?'drop':e.motif,a.x,a.y-a.height*.35,kind==='bleed'?0xe88799:e.color,2,5,9,450,-4)}}}}
 }
 residue(p:Preset,a:Point){this.event('residue',p,a);this.particles.emit(p.family==='frost'?'ice':p.family==='moon'?'petal':p.motif,a.x,a.y-6,p.color,6,6,18,420,-10)}
 clear(){this.particles.clear();for(const s of this.live){s.g.removeFromParent();s.g.destroy()}this.live=[];for(const l of this.labels){l.text.visible=false;l.text.removeFromParent();this.textPool.push(l.text)}this.labels=[];for(const s of this.statuses.values())s.g.destroy();this.statuses.clear();for(const c of this.air.children.slice())c.destroy();for(const c of this.ground.children.slice())c.destroy()}
 destroy(){this.dead=true;this.clear();for(const g of this.free)g.destroy();for(const t of this.textPool)t.destroy();this.free=[];this.textPool=[];this.particles.destroy();this.ground.destroy();this.air.destroy()}
}
