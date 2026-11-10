import {useEffect,useRef} from 'react'
import type {ReactNode} from 'react'
import type {Friend} from '../../game'
import {sleeping} from '../../expansion/model'
import {animateAnimal as animateVisibleActor} from '../../animals/scheduler'
import {HumanWalk} from './motion'
import boy from '../../assets/humans/calm/boy/walk-atlas.webp'
import girl from '../../assets/humans/calm/girl/walk-atlas.webp'
import './styles.css'
const ready=new Map<string,Promise<boolean>>()
function prepare(url:string){if(!ready.has(url)){const img=new Image();img.src=url;ready.set(url,img.decode().then(()=>true,()=>false))}return ready.get(url)!}
export function CalmWalk({friend,mini,children}:{friend:Pick<Friend,'kind'> & Partial<Friend>;mini:boolean;children:ReactNode}){
 const root=useRef<HTMLSpanElement>(null),current=useRef(friend);current.current=friend
 useEffect(()=>{const el=root.current;if(!el||mini)return;const media=matchMedia('(prefers-reduced-motion:reduce)'),motion=new HumanWalk(),layer=el.querySelector<HTMLElement>('.human-walk-strip')!,still=el.querySelector<HTMLElement>('.human-still')!;let visible=false,dead=false,loaded=false,stop:(()=>void)|undefined
 const draw=(time:number,dt:number)=>{const f=current.current,reduced=media.matches||!!el.closest('[data-living-motion=reduced]'),held=!!f.interaction?.gesture,resting=(f.furnitureUntil??0)>Date.now()&&/휴식|쉬기|쿠션/.test(f.furnitureActivity??'');const out=motion.update({x:f.x??0,y:f.y??0,moving:!!f.moving,facing:f.facing??1,held,resting,sleeping:!!f.id&&sleeping(f as Friend,Date.now()),reduced},time,dt);const opacity=loaded?out.opacity:0;el.dataset.walkState=out.state;el.dataset.walkFrame=String(out.frame);if(layer.style.opacity!==String(opacity))layer.style.opacity=String(opacity);const pos=`${out.frame/7*100}% 100%`;if(layer.style.backgroundPosition!==pos)layer.style.backgroundPosition=pos;still.style.opacity=String(1-opacity)}
 const start=()=>{stop?.();stop=undefined;if(!dead&&visible){draw(performance.now(),0);stop=animateVisibleActor(draw)}}
 const io=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);start()});io.observe(el);media.addEventListener('change',start);prepare(friend.kind==='boy'?boy:girl).then(available=>{loaded=available;el.dataset.walkReady=String(available);start()})
 return()=>{dead=true;stop?.();io.disconnect();media.removeEventListener('change',start)}},[friend.kind,mini])
 return <span className="human-walk-controller" ref={root}><span className="human-still">{children}</span>{!mini&&<span className="human-walk-strip" style={{backgroundImage:`url("${friend.kind==='boy'?boy:girl}")`}} aria-hidden="true"/>}</span>
}
