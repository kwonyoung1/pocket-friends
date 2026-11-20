import {directionRow} from '../../animation/direction'
import {DirectionalArt} from '../../animation/directionalArt'
import {directionArt} from '../../animation/assets'
import {useEffect,useRef} from 'react'
import type {ReactNode} from 'react'
import type {Friend} from '../../game'
import {sleeping} from '../../expansion/model'
import {animateAnimal as animateVisibleActor} from '../../animals/scheduler'
import {HumanWalk} from './motion'
import './styles.css'
const ready=new Map<string,Promise<boolean>>()
function prepare(url:string){if(!ready.has(url)){const img=new Image();img.src=url;ready.set(url,img.decode().then(()=>true,()=>false))}return ready.get(url)!}
export function CalmWalk({friend,mini,children}:{friend:Pick<Friend,'kind'> & Partial<Friend>;mini:boolean;children:ReactNode}){
 const root=useRef<HTMLSpanElement>(null),current=useRef(friend);current.current=friend
 useEffect(()=>{const el=root.current;if(!el||mini)return;const media=matchMedia('(prefers-reduced-motion:reduce)'),motion=new HumanWalk(),layer=el.querySelector<HTMLElement>('.human-walk-strip')!,still=el.querySelector<HTMLElement>('.human-still')!,facingStill=el.querySelector<HTMLElement>('.human-facing-still')!,directed=new DirectionalArt(layer.querySelector<HTMLElement>('.direction-current')!,layer.querySelector<HTMLElement>('.direction-previous')!,friend.kind==='boy'?directionArt.boy:directionArt.girl);let visible=false,dead=false,loaded=false,preparing=false,stop:(()=>void)|undefined
 const draw=(time:number,dt:number)=>{const f=current.current,reduced=media.matches||!!el.closest('[data-living-motion=reduced]'),held=!!f.interaction?.gesture,resting=(f.furnitureUntil??0)>Date.now()&&/휴식|쉬기|쿠션/.test(f.furnitureActivity??'');const out=motion.update({x:f.x??0,y:f.y??0,moving:!!f.moving,facing:f.facing??1,held,resting,sleeping:!!f.id&&sleeping(f as Friend,Date.now()),reduced},time,dt);const oriented=!held&&!sleeping(f as Friend,Date.now())&&(!!f.moving||out.oriented);const opacity=loaded&&!reduced&&oriented?1:0;if(loaded)directed.draw(out.direction,out.frame,!!f.moving&&!held&&out.state!=='turning',time,reduced);el.dataset.artFacing=out.direction;el.dataset.walkState=out.state;el.dataset.walkFrame=String(out.frame);if(layer.style.opacity!==String(opacity))layer.style.opacity=String(opacity);const pos=`${out.frame/7*100}% 100%`;if(layer.style.backgroundPosition!==pos)layer.style.backgroundPosition=pos;const frozen=loaded&&reduced&&oriented;el.dataset.directionalStill=String(frozen);facingStill.style.opacity=frozen?'1':'0';if(frozen){facingStill.style.backgroundImage=`url("${f.kind==='boy'?directionArt.boy:directionArt.girl}")`;facingStill.style.backgroundSize='400% 300%';facingStill.style.backgroundPosition=`0% ${directionRow(out.direction)/2*100}%`;facingStill.style.scale=out.direction==='left'?'-1 1':'1'}still.style.opacity=String(frozen?0:1-opacity)}
 const start=()=>{stop?.();stop=undefined;if(!dead&&visible){if(!preparing){preparing=true;prepare(friend.kind==='boy'?directionArt.boy:directionArt.girl).then(available=>{if(dead)return;loaded=available;el.dataset.walkReady=String(available);start()})}draw(performance.now(),0);stop=animateVisibleActor(draw)}}
 const io=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);start()});io.observe(el);media.addEventListener('change',start)
 return()=>{dead=true;stop?.();io.disconnect();media.removeEventListener('change',start)}},[friend.kind,mini])
 return <span className="human-walk-controller" ref={root}><span className="human-still">{children}</span>{!mini&&<span className="human-walk-strip" aria-hidden="true"><span className="direction-previous"/><span className="direction-current"/></span>}{!mini&&<span className="human-facing-still" aria-hidden="true"/>}</span>
}
