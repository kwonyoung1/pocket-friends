import {useEffect,useRef,useState} from 'react'
import type {ReactNode,CSSProperties} from 'react'
import {visualRandom} from './visualRandom'
import {rhythm} from './presence'
const motions=['look','tilt','wave','bounce','sit','sway','yawn']
/** Timers and animation exist only for visible, awake, idle characters. */
export function LivingMotion({id,quiet,children,gentle=false}:{id:string;quiet:boolean;children:ReactNode;gentle?:boolean}){
 const ref=useRef<HTMLSpanElement>(null),[motion,setMotion]=useState('still'),[onScreen,setOnScreen]=useState(false),[blink,setBlink]=useState(false)
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>,blinkTimer:ReturnType<typeof setTimeout>,visible=false,stopped=false
  const media=matchMedia('(prefers-reduced-motion:reduce)')
  const clear=()=>{clearTimeout(timer);clearTimeout(blinkTimer);setMotion('still');setBlink(false)}
  const blinkLater=()=>{if(stopped||quiet||!visible||document.hidden||media.matches)return;blinkTimer=setTimeout(()=>{setBlink(true);blinkTimer=setTimeout(()=>{setBlink(false);blinkLater()},160)},(gentle?5000:2500)+visualRandom()*(gentle?7000:4500))}
  const schedule=()=>{setOnScreen(visible&&!document.hidden);clear();if(stopped||quiet||!visible||document.hidden||media.matches)return;blinkLater();timer=setTimeout(()=>{setMotion(gentle?['look','tilt'][Math.floor(visualRandom()*2)]:motions[Math.floor(visualRandom()*motions.length)]);timer=setTimeout(schedule,1700)},(gentle?5000:3000)+visualRandom()*(gentle?7000:5000))}
  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);setOnScreen(visible);schedule()})
  if(ref.current)observer.observe(ref.current)
  document.addEventListener('visibilitychange',schedule);media.addEventListener('change',schedule)
  return()=>{stopped=true;clearTimeout(timer);clearTimeout(blinkTimer);observer.disconnect();document.removeEventListener('visibilitychange',schedule);media.removeEventListener('change',schedule)}
 },[id,quiet,gentle])
 return <span ref={ref} className="living-motion" data-blink={blink} data-visible={onScreen} data-idle={motion} style={{'--living-rhythm':`${4+rhythm(id)*.65}s`,'--living-delay':`${-rhythm(id)}s`} as CSSProperties}>{children}</span>
}
