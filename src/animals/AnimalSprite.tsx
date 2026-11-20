import {memo,useEffect,useLayoutEffect,useRef} from 'react'
import type {CSSProperties} from 'react'
import type {Friend} from '../game'
import type {Feeling} from '../cozy/presence'
import {visualRandom} from '../cozy/visualRandom'
import {sleeping} from '../expansion/model'
import {animalAppearance,lifeFrames} from './assets'
import type {AnimalKind} from './assets'
import {AnimalMotion} from './motion'
import type {LifePose} from './motion'
import {animateAnimal} from './scheduler'
import './styles.css'
const preloads=new Map<string,Promise<boolean>>()
function preload(url:string){if(!preloads.has(url)){const image=new Image();image.src=url;preloads.set(url,image.decode().then(()=>true,()=>false))}return preloads.get(url)!}
const habits:Record<AnimalKind,LifePose[]>={cat:['stretch','groom','look','sit'],dog:['look','yawn','sit','groom'],bear:['sit','yawn','groom','look'],fox:['look','sit','stretch','groom'],bunny:['groom','look','stretch','sit'],hamster:['groom','sit','look','yawn']}
type Appearance=Pick<Friend,'color'|'name'>&{kind:Friend['kind']|'hamster'}&Partial<Omit<Friend,'kind'|'color'|'name'>>
type Props={friend:Appearance;mini?:boolean;emotion?:string;feeling?:Feeling;sleepingOverride?:boolean;restingOverride?:boolean}
export const AnimalSprite=memo(function AnimalSprite({friend,mini=false,emotion='normal',feeling,sleepingOverride,restingOverride}:Props){
 const expression=emotion==='closed'?'closed':['joy','excited'].includes(feeling??'')?'happy':emotion
 const kind=friend.kind as AnimalKind,art=animalAppearance(friend),root=useRef<HTMLSpanElement>(null),live=useRef({friend,emotion:expression,feeling,sleepingOverride,restingOverride});live.current={friend,emotion:expression,feeling,sleepingOverride,restingOverride}
 const refreshExpression=useRef<(()=>void)|null>(null)
 // Care can commit after the shared animation frame. Paint its expression in
 // the same commit, without advancing gait time or starting another RAF loop.
 useLayoutEffect(()=>{refreshExpression.current?.()},[expression])
 useEffect(()=>{
  const el=root.current;if(!el||mini)return
  const walk=el.querySelector<HTMLElement>('.animal-walk')!,life=el.querySelector<HTMLElement>('.animal-life')!,previous=el.querySelector<HTMLElement>('.animal-previous')!,standing=el.querySelector<HTMLElement>('.animal-static')!
  const media=matchMedia('(prefers-reduced-motion:reduce)'),motion=new AnimalMotion(kind)
  let visible=false,ready=false,preparing=false,dispose:(()=>void)|undefined,removed=false,pose:LifePose='idle',poseUntil=0,nextHabit=0,nextBlink=0,blinkUntil=0,lastLife=0,lastReducedDraw=0
  function prepare(){
   if(preparing||removed)return;preparing=true
   Promise.all([preload(art.walk),preload(art.life)]).then(results=>{if(removed)return;if(!results.every(Boolean)){el!.dataset.artError='true';return}ready=true;el!.style.setProperty('--animal-life',`url("${art.life}")`);el!.style.setProperty('--animal-walk',`url("${art.walk}")`);el!.dataset.artReady='true';updateVisibility()})
  }
  function draw(time:number,dt:number){
   const {friend:f,emotion:expression}=live.current,now=Date.now(),held=!!f.interaction?.gesture,asleep=live.current.sleepingOverride??(kind!=='hamster'&&!!f.id&&sleeping(f as Friend,now))
   const reduced=media.matches||!!el!.closest('[data-living-motion=reduced]')
   if(!nextHabit)nextHabit=time+15000+visualRandom()*15000
   if(!nextBlink)nextBlink=time+3000+visualRandom()*4000
   if(reduced&&dt>0&&time-lastReducedDraw<200)return;lastReducedDraw=time
   const free=!asleep&&!f.moving&&!held&&!reduced
   if(free&&time>=nextHabit){pose=habits[kind][Math.floor(visualRandom()*habits[kind].length)];poseUntil=time+1100;nextHabit=time+15000+visualRandom()*15000}
   if(free&&time>=nextBlink){blinkUntil=time+150;nextBlink=time+3000+visualRandom()*4000}
   if(time>=poseUntil)pose='idle'
   const activity:LifePose|undefined=!free?undefined:time<blinkUntil?'blink':pose
   const resting=live.current.restingOverride??(!f.moving&&(f.furnitureUntil??0)>now&&/휴식|쉬기|쿠션/.test(f.furnitureActivity??''))
   const out=motion.update({x:f.x??0,y:f.y??0,moving:!!f.moving&&!reduced,facing:f.facing??1,held,sleeping:asleep,resting,expression,activity},time,dt)
   const eating=!asleep&&!held&&!f.moving&&((f.eatingUntil??0)>now||(f.foodReaction?.until??0)>now)
   const playing=!asleep&&!held&&!f.moving&&live.current.feeling==='excited'
   const poseKey=eating?(Math.floor(time/180)%2?'eatOpen':'eatClosed'):playing?'play':out.life==='blink'&&expression==='happy'?'happy':out.life
   const walkVisible=!reduced&&ready?out.walkOpacity:0,lifeIndex=lifeFrames[poseKey]
   standing.style.opacity=ready?'0':'1'
   el!.dataset.carePose=eating?'eating':playing?'playing':poseKey
   el!.dataset.motionState=out.state;el!.dataset.gaitFrame=String(out.frame);el!.dataset.travelDirection=out.direction;el!.dataset.artFacing=(f.facing??1)<0?'left':'right';el!.dataset.lifePose=out.life;el!.dataset.walkOpacity=String(walkVisible);el!.dataset.motionReduced=String(reduced)
   // Retain legacy semantic hooks for existing care/accessibility checks.
   el!.dataset.expression=expression==='happy'?'smile':expression
   el!.dataset.artExpression=expression
   walk.style.backgroundPosition=`${out.frame/7*100}% 100%`;walk.style.opacity=String(walkVisible)
   if(lifeIndex!==lastLife){previous.style.backgroundPosition=`${lastLife/11*100}% 100%`;previous.style.opacity='1';life.style.opacity='0';lastLife=lifeIndex;el!.dataset.poseChangedAt=String(time)}
   const blend=Math.min(1,(time-Number(el!.dataset.poseChangedAt??-1000))/140)
   previous.style.opacity=String((1-blend)*(1-walkVisible));life.style.opacity=String(blend*(1-walkVisible));life.style.backgroundPosition=`${lifeIndex/11*100}% 100%`
  }
  function updateVisibility(){dispose?.();dispose=undefined;if(removed)return;if(visible){prepare();draw(performance.now(),0);dispose=animateAnimal(draw)}}
  refreshExpression.current=()=>{if(visible&&!document.hidden&&!el.closest('[hidden],[data-suspended=true]'))draw(performance.now(),0)}
  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);el.dataset.animationVisible=String(visible);updateVisibility()});observer.observe(el);media.addEventListener('change',updateVisibility)
  return()=>{removed=true;refreshExpression.current=null;dispose?.();observer.disconnect();media.removeEventListener('change',updateVisibility)}
 },[kind,mini,art])
 return <span ref={root} className={`animal-art character-art animal-${kind} ${mini?'animal-mini':''}`} data-art-version="5" data-art-set="plush-A-20261120" data-art-kind={kind} data-art-source={art.png} data-expression={expression==='happy'?'smile':expression} data-art-expression={expression} aria-hidden="true" style={{'--animal-idle':`url("${art.png}")`,'--animal-life':'none','--animal-walk':'none'} as CSSProperties}>
  <span className="animal-static"/>{!mini&&<><span className="animal-previous"/><span className="animal-life"/><span className="animal-walk"/></>}
 </span>
})
