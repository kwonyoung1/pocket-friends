import {resolvedStrikes} from './vfx/presentation'
import {BattleVFX} from './vfx/BattleVFX'
import type {Point} from './vfx/BattleVFX'
import {SkillTimeline,AnimationCancelled} from './vfx/SkillTimeline'
import {elements as elementsForVFX,vfxPreset} from './vfx/presets'
import type {Quality} from './vfx/presets'
import {sceneLayout,backgroundFrame,alphaFootprint} from './battle-layout.ts'
import type {SceneLayout,Footprint,Slot} from './battle-layout.ts'
import {hdMonster,monsterArtRow,monsterArtCell} from './monster-art.ts'
import {starsOf} from './fusion.ts'
import {elementNames} from './characters.ts'
import {stageById,monsterById} from './stages.ts'
import {Application,Container,Sprite,Texture,Rectangle,Graphics,Text,ImageSource} from 'pixi.js'
import {ASSETS} from './assets'
import type {State,Unit,Action} from './model'
type Actor={shadow:Graphics;bodyHeight:number;slot:Slot;root:Container;sprite:Sprite;bar:Graphics;barBg:Graphics;breakBar:Graphics;label:Text;halo:Graphics;barrier:Graphics;aura:Graphics;unit:Unit;pose:number;walking:boolean;time:number;home:{x:number;y:number}}
export type Cinematic={type:'boss'|'cutin';name:string;art:string;skill?:string;tier?:number;element?:string}|null
export class BattleView{
 app=new Application();camera=new Container();effects=new Container();actors=new Map<string,Actor>();frames=new Map<string,Texture[]>();clock=0;speed=1;quality=true;reduced=false;shortCutin=false;dead=false;selected='';current='';timeline=new SkillTimeline();private vfx?:BattleVFX;private qualityChoice:Quality='medium';private metricStamp=0;ephemeral=0;private sources=new Set<ImageSource>();private foreground?:Sprite;private inAction=false;private enemyCount=0;private layout?:SceneLayout;private layoutKey='';private displayState?:State;private background?:Sprite;private resizeObserver?:ResizeObserver;private pendingHeight=0;private metrics=new Map<Texture,Footprint>();private height=465;private yScale=1;private preview:string[]=[];private slowFrames=0;private actionPoses=new Map<string,number>()
 constructor(private host:HTMLElement,private select:(id:string)=>void,private cinematic:(c:Cinematic)=>void){}
 async init(state:State){
  this.quality=(navigator.hardwareConcurrency??8)>4&&((navigator as Navigator&{deviceMemory?:number}).deviceMemory??8)>4
  const box=this.host.getBoundingClientRect();this.height=Math.max(260,Math.min(560,Math.round((box.height||465)*390/(box.width||390))));this.yScale=this.height/465
  await this.app.init({width:390,height:this.height,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,preference:'webgl',powerPreference:'low-power'})
  if(this.dead){this.app.destroy(true);return}
  this.host.appendChild(this.app.canvas);this.app.canvas.setAttribute('aria-label','별빛 아레나 · 지면 진형 전투 필드');this.app.canvas.setAttribute('role','img')
  const load=async(key:string)=>{const img=new Image();img.src=ASSETS[key];await img.decode();if(this.dead)throw Error('Arena closed');const source=new ImageSource({resource:img,scaleMode:key.startsWith('sprite-')||key.startsWith('enemies-')?'nearest':'linear'});this.sources.add(source);return new Texture({source})}
  const stage=state.stageId?stageById(state.stageId):undefined,enemyKey=stage?'enemies-'+stage.region:'enemies'
  for(const id of new Set([...state.units.filter(u=>u.side==='ally').map(u=>u.art),enemyKey,...state.units.filter(u=>u.side==='enemy'&&u.monsterId).map(u=>'enemies-'+monsterById(u.monsterId!)!.region)])){
   const isEnemy=id==='enemies'||id.startsWith('enemies-'),atlas=await load(id==='enemies'?'sprite-enemies':isEnemy?id:'sprite-'+id),frames:Texture[]=[]
   const hd=hdMonster(id.replace('enemies-','')),tile=hd?128:64,count=hd||id==='enemies-christmas'?20:id.startsWith('enemies-')?16:id==='enemies'?12:20,cols=isEnemy?4:5
   const measure=document.createElement('canvas');measure.width=measure.height=tile;const ctx=measure.getContext('2d',{willReadFrequently:true})!
   for(let n=0;n<count;n++){const frame=new Rectangle(n%cols*tile,Math.floor(n/cols)*tile,tile,tile),texture=new Texture({source:atlas.source,frame});frames.push(texture);ctx.clearRect(0,0,tile,tile);ctx.drawImage(atlas.source.resource as HTMLImageElement,frame.x,frame.y,tile,tile,0,0,tile,tile);this.metrics.set(texture,alphaFootprint(ctx.getImageData(0,0,tile,tile).data,tile,tile,tile))}this.frames.set(id,frames)
  }
  if(this.dead)return
  const bg=new Sprite(await load(stage&&stage.region!=='forest'?'bg-'+stage.region:'forest'));this.background=bg
  this.camera.pivot.set(195,this.height*.57);this.camera.position.set(195,this.height*.57);this.camera.addChild(bg)
  this.app.stage.addChild(this.camera);this.camera.addChild(this.effects);this.vfx=new BattleVFX(this.camera)
  if(!stage||stage.region==='forest'){const fg=new Sprite(await load('foliage'));fg.width=390;fg.height=this.height;fg.alpha=.18;this.foreground=fg;this.app.stage.addChild(fg)}
  this.app.ticker.add(t=>this.tick(t.deltaMS));document.addEventListener('visibilitychange',this.visibility)
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.sync(state)
  this.resizeObserver=new ResizeObserver(()=>{const b=this.host.getBoundingClientRect(),next=Math.max(260,Math.min(560,Math.round(b.height*390/Math.max(1,b.width))));if(this.inAction){this.pendingHeight=Math.abs(next-this.height)>1?next:0;return}if(Math.abs(next-this.height)>1)this.resize(next)});this.resizeObserver.observe(this.host)
 }
 private alignFoot(a:Actor){const fp=this.metrics.get(a.sprite.texture);if(!fp)return;a.sprite.x=(fp.tile/2-fp.footX)*a.sprite.scale.x;a.sprite.y=(fp.tile-fp.footY)*a.sprite.scale.y}
 private baseTint(u:Unit){return u.towerSpecial==='gold'?0xffd369:0xffffff}
 private footprint(u:Unit){const a=this.metrics.get(this.texture(u,u.side==='ally'?2:0))!,b=this.metrics.get(this.texture(u,u.side==='ally'?9:1))??a;return{...a,width:Math.max(a.width,b.width),height:Math.max(a.height,b.height)}}
 private arrange(state:State){
  const region=state.stageId?stageById(state.stageId)?.region:'forest',key=this.height+'|'+region+'|'+state.units.map(u=>u.id).join(',');if(key===this.layoutKey)return;this.layoutKey=key
  this.layout=sceneLayout(state.units.map(u=>({...u,footprint:this.footprint(u)})),this.height,region)
  const bg=this.background!,frame=backgroundFrame(390,this.height,bg.texture.width,bg.texture.height,this.layout.preset);bg.position.set(frame.x,frame.y);bg.width=frame.width;bg.height=frame.height
  this.camera.pivot.set(195,this.height*.57);this.camera.position.set(195,this.height*.57)
  this.host.dataset.scene=JSON.stringify(this.layout)
 }
 private resize(height:number){if(this.dead||!this.displayState||height===this.height)return;this.vfx?.clear();this.height=height;this.yScale=height/465;this.app.renderer.resize(390,height);for(const a of this.actors.values()){this.camera.removeChild(a.root);a.root.destroy({children:true})}this.actors.clear();if(this.foreground)this.foreground.height=height;this.sync(this.displayState)}
 setQuality(value:Quality){this.qualityChoice=value;this.quality=value!=='low';if(this.vfx)this.vfx.quality=value}
 private point(a:Actor):Point{return{x:a.root.x,y:a.root.y,width:a.slot.width,height:a.bodyHeight,depth:a.slot.depth}}
 private visibility=()=>{if(this.dead)return;if(document.hidden)this.app.ticker.stop();else this.app.ticker.start()}
 private texture(unit:Unit,frame:number){if(unit.side==='enemy'){const monster=unit.monsterId?monsterById(unit.monsterId):undefined,row=monster?monsterArtRow(monster.region,monster.row,monster.id,unit.boss):(unit.art==='slime'?0:unit.art==='thorn'?1:2),key=monster?'enemies-'+monster.region:'enemies';const cell=monster?monsterArtCell(frame,hdMonster(monster.region)):(frame===15?(unit.boss?3:2):frame===16?3:[10,13,17,18].includes(frame)?1:[11,12,14,19].includes(frame)?(unit.boss?2:1):frame<4?frame:0);return this.frames.get(key)![row*4+cell]}if(unit.art.startsWith('adv-')&&![15,16].includes(frame)&&frame>=10)frame=this.actionPoses.get(unit.id)??frame;return this.frames.get(unit.art)![frame]}
 private actor(u:Unit,index:number):Actor{
  const slot=this.layout!.slots.find(s=>s.id===u.id)!,home={x:slot.x,y:slot.y},root=new Container(),shadow=new Graphics().ellipse(0,0,slot.shadow.width/2,slot.shadow.height).fill({color:0x07111e,alpha:slot.shadow.alpha*.55}).ellipse(0,0,slot.shadow.width*.37,slot.shadow.height*.6).fill({color:0x07111e,alpha:slot.shadow.alpha})
  root.position.set(home.x,home.y);root.zIndex=home.y
  const halo=new Graphics().ellipse(0,0,slot.width*.57,Math.max(5,slot.width*.16)).stroke({color:0xffd88b,width:2,alpha:.9});halo.visible=false
  const sprite=new Sprite(this.texture(u,u.side==='ally'?2:0));sprite.tint=this.baseTint(u);sprite.anchor.set(.5,1);sprite.scale.set(slot.scale)
  const h=slot.height,hx=slot.label.x+slot.label.width/2-slot.x,hy=slot.label.y-slot.y,plate=new Graphics().roundRect(hx-slot.label.width/2-2,hy-2,slot.label.width+4,19,4).fill({color:0x10233b,alpha:.8}).stroke({color:0xa4bdc9,alpha:.25,width:.6}),barBg=new Graphics().roundRect(hx-20,hy+10,40,3,1.5).fill({color:0x101b2d,alpha:.95}),bar=new Graphics().roundRect(0,0,40,3,1.5).fill(u.side==='ally'?0xa3dfc0:0xf7aaad)
  bar.position.set(hx-20,hy+10)
  const breakBar=new Graphics().roundRect(hx-20,hy+15,40,2,1).fill(0xead28a);breakBar.visible=u.maxToughness>0
  const label=new Text({text:`${index+1} · ${u.name.length>4?u.name.slice(0,4)+'…':u.name}`,style:{fontFamily:'sans-serif',fontSize:7.5,fill:0xf5f1df,stroke:{color:0x10233b,width:1},fontWeight:'600'}});label.anchor.set(.5,1);label.position.set(slot.label.x+slot.label.width/2-slot.x,slot.label.y-slot.y+8)
  const barrier=new Graphics().ellipse(0,-h*.45,slot.width*.64,h*.58).fill({color:0x9bcffe,alpha:.06}).stroke({color:0xb7ddff,alpha:.65,width:1.5});barrier.visible=false
  const stars=starsOf(u),aura=new Graphics();if(u.side==='enemy'&&u.boss){aura.ellipse(0,-3,34,10).stroke({color:0xd1b3f0,width:2,alpha:.55});for(let i=0;i<(this.enemyCount>=4?0:5);i++)aura.star((i-2)*12,-h-20,4,3,1.5).fill({color:0xffdfa5,alpha:.7})}if(u.stars&&stars>=2){const color=stars===5?0xffdf87:stars===4?0xd6b4ff:0xbce7ff;aura.ellipse(0,-4,25+stars,8+stars).stroke({color,width:stars>=4?2:1,alpha:.6});for(let n=0;n<(this.enemyCount>=4?0:stars);n++)aura.star((n-(stars-1)/2)*8,-h-20,4,3,1.5).fill({color,alpha:.85});if(stars>=4)aura.ellipse(0,-25,30,35).stroke({color,width:1,alpha:.25})}
  root.addChild(shadow,aura,halo,sprite,plate,barBg,bar,breakBar,barrier,label);root.eventMode='static';root.cursor='pointer';root.hitArea=new Rectangle(-Math.max(24,slot.width/2),-Math.max(32,h),Math.max(48,slot.width),Math.max(44,h+12));root.on('pointertap',()=>this.select(u.id))
  this.camera.addChild(root);this.camera.sortableChildren=true;this.effects.zIndex=1000
  return{shadow,bodyHeight:h,slot,root,sprite,bar,barBg,breakBar,label,halo,barrier,aura,unit:u,pose:-1,walking:false,time:this.clock,home}
 }
 sync(state:State){
  this.displayState=state;this.enemyCount=state.units.filter(u=>u.side==='enemy').length;this.arrange(state); this.current=state.order[state.cursor]??''
  for(const [id,actor]of this.actors)if(!state.units.some(u=>u.id===id)){this.camera.removeChild(actor.root);actor.root.destroy({children:true});this.actors.delete(id)}
  let a=0,e=0
  for(const u of state.units){let actor=this.actors.get(u.id);if(!actor){actor=this.actor(u,u.side==='ally'?a:e);this.actors.set(u.id,actor)}if(u.side==='ally')a++;else e++
   actor.unit=u;actor.bar.scale.x=Math.max(0,u.hp/u.maxHp);actor.breakBar.scale.x=u.maxToughness?Math.max(0,u.toughness/u.maxToughness):0;actor.breakBar.visible=u.maxToughness>0;actor.label.text=u.broken?'BREAK':`${actor.slot.index+1} · ${u.name.length>4?u.name.slice(0,4)+'…':u.name}`;actor.root.alpha=u.hp>0?1:.32;actor.barrier.visible=u.hp>0&&(u.shield>0||!!u.moonGrace||u.statuses.some(e=>e.type==='counter'))
   if(u.hp<=0){if(actor.pose!==16){void this.tween(this.reduced?120:520,p=>{actor!.sprite.alpha=1-p*.85}).catch(e=>{if(!(e instanceof AnimationCancelled))console.error(e)})}actor.pose=16;actor.root.eventMode='none'}
   else actor.root.eventMode='static'
  }
  this.vfx?.sync(state.units,u=>{const a=this.actors.get(u.id);return a?this.point(a):undefined})
 }
 choose(id:string,preview:string[]=[]){this.selected=id;this.preview=preview}
 private tick(dt:number){
  if(this.dead)return;if(dt>45&&dt<250)this.slowFrames++;else this.slowFrames=Math.max(0,this.slowFrames-1);if(this.slowFrames>=45)this.quality=false;this.clock+=Math.min(dt,60)*this.speed
  const elapsed=Math.min(dt,60)*this.speed;this.timeline.tick(elapsed);if(this.vfx){this.vfx.quality=this.reduced||!this.quality?'low':this.qualityChoice;this.vfx.reduced=this.reduced;this.vfx.tick(elapsed,dt,390,this.height);if(this.clock-this.metricStamp>200){this.metricStamp=this.clock;this.host.dataset.vfx=JSON.stringify({...this.vfx.metrics,timelines:this.timeline.active});}}
  for(const a of this.actors.values()){
   let frame=a.pose
   if(a.unit.hp>0&&frame<0)frame=a.unit.side==='enemy'?(this.reduced?0:Math.floor(this.clock/850)%2):this.reduced?2:Math.floor((this.clock+a.home.y*3)/1100)%5===0?9:2
   if(a.walking)frame=a.unit.side==='enemy'?(Math.floor((this.clock-a.time)/140)%2?10:0):5+Math.floor((this.clock-a.time)/95)%4
   a.sprite.texture=this.texture(a.unit,frame);this.alignFoot(a)
   a.halo.visible=a.unit.hp>0&&(a.unit.id===this.selected||a.unit.id===this.current||this.preview.includes(a.unit.id));a.halo.tint=a.unit.id===this.selected?0xffdb98:0x9fd9eb;a.halo.alpha=a.unit.id===this.selected?.95:this.preview.includes(a.unit.id)?.6:.35
   a.aura.visible=a.unit.hp>0;a.aura.alpha=this.reduced?.8:.65+Math.sin(this.clock/(starsOf(a.unit)===5?420:700))*.2
   a.label.visible=a.unit.hp>0;(a.root.hitArea as Rectangle).width=Math.max(48,a.slot.width)
  }
  if(this.quality&&!this.reduced&&Math.floor(this.clock/300)!==Math.floor((this.clock-dt*this.speed)/300))this.vfx?.particles.emit('star',18+Math.random()*354,(100+Math.random()*310)*this.yScale,0xf2edbd,1,3,3,1000,-1)
 }
 private tween(ms:number,draw:(p:number)=>void,ease='none'){return this.timeline.tween(ms,draw,ease)}
 wait(ms:number){return this.tween(ms,()=>{})}
 private async zoom(scale:number,x=195,y=this.height*.57){scale=Math.min(scale,this.layout?.camera.maxZoom??1.025);x=Math.max(191,Math.min(199,x));y=Math.max(this.height*.55,Math.min(this.height*.59,y));const before=this.camera.scale.x,bx=this.camera.pivot.x,by=this.camera.pivot.y;await this.tween(this.reduced?1:160,p=>{this.camera.scale.set(before+(scale-before)*p);this.camera.pivot.set(bx+(x-bx)*p,by+(y-by)*p)})}
 private async shake(strength:number){if(this.reduced||!this.quality)return;await this.tween(135,p=>{this.camera.position.set(195+Math.sin(p*32)*strength*(1-p),this.height*.57+Math.cos(p*38)*strength*.4*(1-p));if(this.foreground)this.foreground.x=-Math.sin(p*32)*strength*.3});this.camera.position.set(195,this.height*.57);if(this.foreground)this.foreground.x=0}
 private async move(a:Actor,x:number,y:number,ms=260,jump=0,trail=0){const v=this.layout!.viewport;x=Math.max(v.x+a.slot.width/2,Math.min(v.x+v.width-a.slot.width/2,x));y=Math.max(v.y+a.bodyHeight+18,Math.min(this.height-18,y));const sx=a.root.x,sy=a.root.y,dx=x-sx;a.walking=true;a.time=this.clock;a.sprite.scale.x=Math.abs(a.sprite.scale.x)*(dx<0?-1:1)*(a.unit.side==='enemy'?-1:1);await this.tween(this.reduced?80:ms,p=>{const e=p*p*(3-2*p);a.root.position.set(sx+(x-sx)*e,sy+(y-sy)*e-Math.sin(p*Math.PI)*jump);a.shadow.y=a.halo.y=Math.sin(p*Math.PI)*jump;a.root.zIndex=sy+(y-sy)*e;if(trail&&this.quality&&Math.floor(p*16)!==Math.floor(Math.max(0,p-.035)*16))this.vfx?.particles.emit('blade',a.root.x,a.root.y-a.bodyHeight*.5,trail,2,12,5,200)});a.shadow.y=a.halo.y=0;a.walking=false}
 async intro(boss=false){
  this.inAction=true;try{if(boss){const a=[...this.actors.values()].find(a=>a.unit.boss);if(!a)return;const p=vfxPreset(a.unit,{id:'intro',name:'',style:'rally',target:'enemy',cost:0,power:0,hits:0,unlock:1,description:''},true);this.cinematic({type:'boss',name:a.unit.name,art:a.unit.art,tier:3,element:a.unit.element});this.vfx?.prepare(p,this.point(a));await this.wait(this.reduced?200:650);this.vfx?.ultimate(p,this.point(a),[this.point(a)]);this.cinematic(null)}else await this.wait(150)}finally{this.inAction=false;this.applyResize()}
 }
 private applyResize(){if(this.pendingHeight&&!this.dead){const h=this.pendingHeight;this.pendingHeight=0;this.resize(h)}}
 async previewCutin(unit:Unit,skillName:string,inspect=false){const a=this.actors.get(unit.id),p=vfxPreset(unit,{id:'ultimate',name:skillName,style:'orb',target:'enemy',cost:0,power:0,hits:0,unlock:1,description:''},true);if(a)this.vfx?.prepare(p,this.point(a));this.cinematic({type:'cutin',name:unit.name,art:unit.art,skill:(unit.stars&&starsOf(unit)===5?'★★★★★ · ':'')+skillName,tier:p.tier,element:unit.element});try{await this.wait(inspect?800*this.speed:this.shortCutin||this.reduced?180:p.cutin||320)}finally{if(!this.dead)this.cinematic(null)}}
 async play(action:Action,onImpact:()=>void){
  if(this.dead)throw new AnimationCancelled('Battle closed');if(this.inAction)throw Error('Animation already running');this.inAction=true
  const a=this.actors.get(action.actor);if(!a){this.inAction=false;throw Error('Missing display actor')}
  const targets=action.targets.map(id=>this.actors.get(id)).filter((t):t is Actor=>!!t),k=action.skill,p=vfxPreset(a.unit,k,action.ultimate),friendly=k.target==='ally'||k.target==='all-allies',ranged=friendly||['orb','carrot','enemy-spit','water','frost','root','vine','nebula','dragon','phoenix','aegis','meteor','supernova','arrow','arrow-rain','potion','alchemy'].includes(k.style)
  const previous=this.displayState,events=resolvedStrikes(action),hits=new Map(action.hits.map(h=>[h.id,h])),strikes=Math.max(1,...events.map(h=>h.index+1));let settled=false
  const settle=()=>{if(!settled&&!this.dead){settled=true;onImpact()}}
  if(a.unit.art.startsWith('adv-'))this.actionPoses.set(a.unit.id,k.id==='basic'?10:k.id==='active1'?11:14)
  try{
   if(action.ultimate)await this.previewCutin(a.unit,k.name)
   this.vfx?.prepare(p,this.point(a));a.pose=ranged?13:10
   const windup=this.reduced?30:p.windup;const startRotation=a.sprite.rotation
   await this.tween(windup,t=>{if(!this.reduced)a.sprite.rotation=startRotation-Math.sin(t*Math.PI)*.09*(a.unit.side==='ally'?1:-1)},'power2.in');a.sprite.rotation=startRotation
   if(action.ultimate)this.vfx?.ultimate(p,this.point(a),targets.map(t=>this.point(t)))
   if(!this.reduced&&k.id!=='basic')await this.zoom(action.ultimate?1.06:1.02,targets[0]?.root.x??195,targets[0]?.root.y??this.height*.57)
   if(!ranged&&targets.length){const target=targets[0];if(this.quality&&!this.reduced)this.vfx?.ghost(a.sprite.texture,this.point(a),a.sprite.scale.x,a.sprite.scale.y,a.sprite.x,a.sprite.y);await this.move(a,target.root.x+(a.unit.side==='ally'?-45:45),target.root.y,p.travel,k.style==='jump'?34:0,p.color);a.pose=11}
   for(let n=0;n<strikes;n++){
    const actual=targets.filter(t=>events.some(h=>h.id===t.unit.id&&h.index===n))
    if(ranged){for(const t of actual)this.vfx?.launch(p,this.point(a),this.point(t),this.reduced?45:p.travel);await this.wait(this.reduced?45:p.travel)}else if(n>0){a.pose=10;await this.wait(this.reduced?25:65);a.pose=11;if(a.unit.heroId==='special-boy')this.vfx?.ghost(a.sprite.texture,this.point(a),a.sprite.scale.x,a.sprite.scale.y,a.sprite.x,a.sprite.y)}
    // One data commit, even for multi-hit effects; each displayed amount comes from the resolved Hit.
    if(n===0)settle()
    for(const h of events.filter(h=>h.index===n)){const t=this.actors.get(h.id);if(!t)continue;const blocked=h.blocked,crit=h.critical,amount=h.damage,point=this.point(t),supporting=amount===0&&(h.heal>0||h.shield>0||h.buff),hitPreset=supporting?{...p,family:h.shield?'guardian' as const:'moon' as const,color:h.heal?0xa9e6c4:0xcce9ff,core:0xfff2d8}:p;this.vfx?.impact(hitPreset,point,n,crit,!!h.break);if(blocked){const shield={...p,family:'moon' as const,color:0xd9eaff,core:0xfff2d6};this.vfx?.impact(shield,point,n);this.vfx?.number(point,'완전 차단','block',n)}else this.vfx?.number(point,h.miss?'회피':h.heal||k.style==='heal'?`+${h.heal}`:h.shield?'보호막':h.buff?'강화':`${crit?'CRIT ':''}${amount}`,h.heal||k.style==='heal'?'heal':h.shield||h.buff?'shield':crit?'critical':'damage',n)
     if(n===0&&h.break)this.vfx?.number(point,'BREAK','break',n+1);if(!friendly&&!h.miss&&!blocked)void this.recoil(t).catch(()=>{});if(n===0&&h.counter){this.vfx?.number(this.point(a),String(h.counter),'damage',1);void this.recoil(a).catch(()=>{})}
    }
    if(!friendly&&!this.reduced&&(action.ultimate||k.style==='slam'||actual.some(t=>hits.get(t.unit.id)?.critical))){await this.wait(action.ultimate?38:22);void this.shake(action.ultimate?3:1.5).catch(()=>{})}
    if(n+1<strikes)await this.wait(this.reduced?25:85)
   }
   settle()
   for(const hit of action.resonances??[]){const t=this.actors.get(hit.id);if(!t)continue;const echo={...p,...elementsForVFX[hit.element],ultimate:false};this.vfx?.impact(echo,this.point(t));this.vfx?.number(this.point(t),`${elementNames[hit.element]} +${hit.damage}`,'dot',1,echo.color);if(hit.break)this.vfx?.number(this.point(t),'BREAK','break',2)}
   // DOT/regen is already resolved in next state. Display the residual difference, never calculate or award it.
   for(const next of action.next.units){const before=previous?.units.find(u=>u.id===next.id),actor=this.actors.get(next.id);if(before&&actor&&!hits.has(next.id)&&before.hp!==next.hp)this.vfx?.number(this.point(actor),next.hp>before.hp?`+${next.hp-before.hp}`:String(before.hp-next.hp),next.hp>before.hp?'heal':'dot')}
   for(const t of targets)this.vfx?.residue(p,this.point(t));await this.wait(this.reduced?35:p.linger)
   if(!ranged){await this.move(a,a.home.x,a.home.y,this.reduced?60:140);a.pose=0}
   await this.zoom(1)
  }finally{this.inAction=false;this.actionPoses.delete(a.unit.id);a.sprite.rotation=0;a.sprite.tint=this.baseTint(a.unit);a.sprite.scale.x=Math.abs(a.sprite.scale.x);a.pose=a.unit.hp>0?-1:16;if(!this.dead)this.cinematic(null);this.applyResize()}
 }
 private async recoil(a:Actor){const x=a.root.x;a.pose=15;try{await this.tween(this.reduced?45:120,p=>{a.root.x=x+Math.sin(p*Math.PI)*(a.unit.side==='enemy'?5:-4);a.sprite.tint=p<.35?0xffe8df:this.baseTint(a.unit)},'power1.out')}finally{a.root.x=x;a.sprite.tint=this.baseTint(a.unit);a.pose=a.unit.hp>0?-1:16}}
 victory(){for(const a of this.actors.values())if(a.unit.side==='ally'&&a.unit.hp>0)a.pose=4;this.vfx?.particles.emit('star',195,this.height*.4,0xffe8b8,24,9,45,700)}
 destroy(){this.dead=true;this.resizeObserver?.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.timeline.destroy();if(this.app.renderer){this.app.ticker.stop();setTimeout(()=>{this.vfx?.destroy();this.app.destroy(true,{children:true,texture:false,textureSource:false});for(const source of this.sources)source.destroy();this.sources.clear();this.frames.clear();this.metrics.clear()},0)}}
}
