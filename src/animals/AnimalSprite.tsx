import {memo,useEffect,useRef} from 'react'
import type {CSSProperties} from 'react'
import type {Friend} from '../game'
import type {Feeling} from '../cozy/presence'
import {visualRandom} from '../cozy/visualRandom'
import {sleeping} from '../expansion/model'
import {animalArt,lifeFrames} from './assets'
import type {AnimalKind} from './assets'
import {AnimalMotion} from './motion'
import type {LifePose} from './motion'
import {animateAnimal} from './scheduler'
import './styles.css'
const preloads=new Map<string,Promise<void>>()
function preload(url:string){if(!preloads.has(url)){const image=new Image();image.src=url;preloads.set(url,image.decode().catch(()=>{}))}return preloads.get(url)!}
const habits:Record<AnimalKind,LifePose[]>={cat:['stretch','groom','look','sit'],dog:['look','yawn','sit','groom'],bear:['sit','yawn','groom','look'],fox:['look','sit','stretch','groom'],bunny:['groom','look','stretch','sit']}
type Props={friend:Pick<Friend,'kind'|'color'|'name'>&Partial<Friend>;mini?:boolean;emotion?:string;feeling?:Feeling}
export const AnimalSprite=memo(function AnimalSprite({friend,mini=false,emotion='normal',feeling}:Props){
 const expression=emotion==='closed'?'closed':['joy','excited'].includes(feeling??'')?'happy':emotion
 const kind=friend.kind as AnimalKind,art=animalArt[kind],root=useRef<HTMLSpanElement>(null),live=useRef({friend,emotion:expression,feeling});live.current={friend,emotion:expression,feeling}
 const palette=friend.color==='#f4dfb8'?'saturate(.55) brightness(1.1)':friend.color==='#b48c71'?'brightness(.85)':friend.color==='#c4afe4'?'hue-rotate(325deg) saturate(1.15)':'none'
 useEffect(()=>{
  const el=root.current;if(!el||mini)return
  const walk=el.querySelector<HTMLElement>('.animal-walk')!,life=el.querySelector<HTMLElement>('.animal-life')!,previous=el.querySelector<HTMLElement>('.animal-previous')!
  const media=matchMedia('(prefers-reduced-motion:reduce)'),motion=new AnimalMotion(kind)
  let visible=false,ready=false,dispose:(()=>void)|undefined,removed=false,pose:LifePose='idle',poseUntil=0,nextHabit=0,nextBlink=0,blinkUntil=0,lastLife=0,lastReducedDraw=0
  Promise.all([preload(art.walk),preload(art.life)]).then(()=>{ready=true;el.dataset.artReady='true';updateVisibility()})
  function draw(time:number,dt:number){
   const {friend:f,emotion:expression}=live.current,now=Date.now(),held=!!f.interaction?.gesture,asleep=!!f.id&&sleeping(f as Friend,now)
   const reduced=media.matches||!!el!.closest('[data-living-motion=reduced]')
   if(!nextHabit)nextHabit=time+4000+visualRandom()*6000
   if(!nextBlink)nextBlink=time+2500+visualRandom()*4500
   if(reduced&&dt>0&&time-lastReducedDraw<200)return;lastReducedDraw=time
   const free=!asleep&&!f.moving&&!held&&!reduced
   if(free&&time>=nextHabit){pose=habits[kind][Math.floor(visualRandom()*habits[kind].length)];poseUntil=time+1100;nextHabit=time+4000+visualRandom()*6000}
   if(free&&time>=nextBlink){blinkUntil=time+150;nextBlink=time+2500+visualRandom()*4500}
   if(time>=poseUntil)pose='idle'
   const activity:LifePose|undefined=!free?undefined:time<blinkUntil?'blink':pose
   const resting=!f.moving&&(f.furnitureUntil??0)>now&&/휴식|쉬기|쿠션/.test(f.furnitureActivity??'')
   const out=motion.update({x:f.x??0,y:f.y??0,moving:!!f.moving&&!reduced,facing:f.facing??1,held,sleeping:asleep,resting,expression,activity},time,dt)
   const walkVisible=!reduced&&ready?out.walkOpacity:0,lifeIndex=lifeFrames[out.life]
   el!.dataset.motionState=out.state;el!.dataset.gaitFrame=String(out.frame);el!.dataset.travelDirection=out.direction;el!.dataset.artFacing=(f.facing??1)<0?'left':'right';el!.dataset.lifePose=out.life;el!.dataset.walkOpacity=String(walkVisible);el!.dataset.motionReduced=String(reduced)
   // Retain legacy semantic hooks for existing care/accessibility checks.
   el!.dataset.expression=expression==='happy'?'smile':expression
   el!.dataset.artExpression=expression
   walk.style.backgroundPosition=`${out.frame/7*100}% 100%`;walk.style.opacity=String(walkVisible)
   if(lifeIndex!==lastLife){previous.style.backgroundPosition=`${lastLife/7*100}% 100%`;previous.style.opacity='1';life.style.opacity='0';lastLife=lifeIndex;el!.dataset.poseChangedAt=String(time)}
   const blend=Math.min(1,(time-Number(el!.dataset.poseChangedAt??-1000))/140)
   previous.style.opacity=String((1-blend)*(1-walkVisible));life.style.opacity=String(blend*(1-walkVisible));life.style.backgroundPosition=`${lifeIndex/7*100}% 100%`
  }
  function updateVisibility(){dispose?.();dispose=undefined;if(removed)return;if(visible){draw(performance.now(),0);dispose=animateAnimal(draw)}}
  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);el.dataset.animationVisible=String(visible);updateVisibility()});observer.observe(el);media.addEventListener('change',updateVisibility)
  return()=>{removed=true;dispose?.();observer.disconnect();media.removeEventListener('change',updateVisibility)}
 },[kind,mini,art])
 return <span ref={root} className={`animal-art character-art animal-${kind} ${mini?'animal-mini':''}`} data-art-version="4" data-art-kind={kind} data-art-source={art.png} data-expression={expression==='happy'?'smile':expression} data-art-expression={expression} aria-hidden="true" style={{'--animal-life':`url("${art.life}")`,'--animal-walk':`url("${art.walk}")`,'--animal-palette':palette} as CSSProperties}>
  <span className="animal-previous"/><span className="animal-life"/><span className="animal-walk"/>
 </span>
})
