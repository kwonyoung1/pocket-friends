import {Container,ImageSource,Particle,ParticleContainer,Rectangle,Texture} from 'pixi.js'
import {budgets} from './presets'
import type {Motif,Quality} from './presets'
const motifs:Motif[]=['spark','flame','ice','star','smoke','leaf','rock','drop','feather','blade','moon','petal']
type Live={p:Particle;x:number;y:number;vx:number;vy:number;age:number;life:number;size:number;spin:number;gravity:number}
/** One original procedural atlas, one texture source, bounded active/free pools. No fetched art. */
export class ParticleManager{
 readonly layer:ParticleContainer;private textures=new Map<Motif,Texture>();private source:ImageSource;private live:Live[]=[];private free:Particle[]=[];private made=0;peak=0;quality:Quality='medium';reduced=false
 constructor(parent:Container){const canvas=document.createElement('canvas');canvas.width=32*motifs.length;canvas.height=32;const c=canvas.getContext('2d')!
  motifs.forEach((m,i)=>{c.save();c.translate(i*32+16,16);c.fillStyle='white';c.strokeStyle='white';c.lineWidth=2;c.beginPath()
   if(m==='spark'||m==='smoke'){const g=c.createRadialGradient(0,0,0,0,0,15);g.addColorStop(0,'#fff');g.addColorStop(.2,'#ffffffdd');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.arc(0,0,15,0,Math.PI*2)}
   else if(m==='star'){for(let n=0;n<8;n++){const a=n*Math.PI/4,r=n%2?3:15;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}}
   else if(m==='flame'||m==='drop'){c.moveTo(0,-15);c.bezierCurveTo(18,1,8,15,0,13);c.bezierCurveTo(-12,12,-10,-2,0,-15)}
   else if(m==='ice'){c.moveTo(0,-15);c.lineTo(8,0);c.lineTo(0,15);c.lineTo(-6,0)}
   else if(m==='rock'){c.moveTo(-12,-6);c.lineTo(1,-13);c.lineTo(12,-4);c.lineTo(8,10);c.lineTo(-8,12)}
   else if(m==='blade'){c.moveTo(-15,9);c.quadraticCurveTo(-2,-14,15,-11);c.quadraticCurveTo(1,-5,-15,9)}
   else if(m==='moon'){c.arc(0,0,13,.2,Math.PI*1.8);c.bezierCurveTo(-3,-3,-3,8,12,3)}
   else{c.moveTo(-10,12);c.bezierCurveTo(-13,-11,5,-17,11,-12);c.bezierCurveTo(17,1,6,12,-10,12)}
   c.closePath();c.fill();c.restore()
  });this.source=new ImageSource({resource:canvas,scaleMode:'linear'});motifs.forEach((m,i)=>this.textures.set(m,new Texture({source:this.source,frame:new Rectangle(i*32,0,32,32)})))
  this.layer=new ParticleContainer({dynamicProperties:{position:true,rotation:true,vertex:true,color:true,uvs:true}});this.layer.blendMode='add';this.layer.zIndex=1002;parent.addChild(this.layer)
 }
 get count(){return this.live.length}get allocated(){return this.made}
 emit(motif:Motif,x:number,y:number,color:number,count:number,size=8,speed=45,life=500,gravity=15){const cap=this.reduced?12:budgets[this.quality].particles,countNow=Math.max(0,Math.min(cap-this.count,Math.round(count*(this.reduced?.2:budgets[this.quality].density))))
  for(let i=0;i<countNow;i++){let p=this.free.pop();if(!p){if(this.made>=144)break;p=new Particle({texture:this.textures.get(motif)!,anchorX:.5,anchorY:.5});this.made++}p.texture=this.textures.get(motif)!;p.x=x;p.y=y;p.tint=color;p.alpha=1;p.rotation=Math.random()*6.28;p.scaleX=p.scaleY=size/32;const angle=Math.random()*Math.PI*2,r=.4+Math.random()*.6;this.layer.addParticle(p);this.live.push({p,x,y,vx:Math.cos(angle)*speed*r,vy:Math.sin(angle)*speed*r-speed*.35,age:0,life,size,spin:(Math.random()-.5)*4,gravity})}this.peak=Math.max(this.peak,this.count)
 }
 tick(ms:number,w:number,h:number){const cap=this.reduced?12:budgets[this.quality].particles;while(this.live.length>cap){const l=this.live.pop()!;this.layer.removeParticle(l.p);l.p.alpha=0;this.free.push(l.p)}for(let i=this.live.length-1;i>=0;i--){const l=this.live[i];l.age+=ms;const t=l.age/1000,p=l.age/l.life;l.p.x=l.x+l.vx*t;l.p.y=l.y+l.vy*t+l.gravity*t*t;l.p.alpha=Math.max(0,(1-p)*.85);l.p.rotation+=l.spin*ms/1000;l.p.scaleX=l.p.scaleY=l.size/32*(1-p*.5);if(p>=1||l.p.x<0||l.p.x>w||l.p.y<0||l.p.y>h){this.layer.removeParticle(l.p);l.p.alpha=0;this.free.push(l.p);this.live.splice(i,1)}}}
 clear(){for(const l of this.live){this.layer.removeParticle(l.p);l.p.alpha=0;this.free.push(l.p)}this.live=[]}
 destroy(){this.clear();this.layer.destroy();this.free=[];for(const t of this.textures.values())t.destroy();this.source.destroy();this.textures.clear();this.made=0}
}
