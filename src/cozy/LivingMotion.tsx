import {useEffect,useRef,useState} from 'react'
import type {ReactNode,CSSProperties} from 'react'
import {visualRandom} from './visualRandom'
import {rhythm} from './presence'
const motions=['look','tilt','wave','bounce','sit','sway']
/** Timers and animation exist only for visible, awake, idle characters. */
export function LivingMotion({id,quiet,children}:{id:string;quiet:boolean;children:ReactNode}){
 const ref=useRef<HTMLSpanElement>(null),[motion,setMotion]=useState('still'),[onScreen,setOnScreen]=useState(false)
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>,visible=false,stopped=false
  const media=matchMedia('(prefers-reduced-motion:reduce)')
  const clear=()=>{clearTimeout(timer);setMotion('still')}
  const schedule=()=>{clear();if(stopped||quiet||!visible||document.hidden||media.matches)return;timer=setTimeout(()=>{setMotion(motions[Math.floor(visualRandom()*motions.length)]);timer=setTimeout(schedule,1700)},3000+visualRandom()*5000)}
  const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);setOnScreen(visible);schedule()})
  if(ref.current)observer.observe(ref.current)
  document.addEventListener('visibilitychange',schedule);media.addEventListener('change',schedule)
  return()=>{stopped=true;clearTimeout(timer);observer.disconnect();document.removeEventListener('visibilitychange',schedule);media.removeEventListener('change',schedule)}
 },[id,quiet])
 return <span ref={ref} className="living-motion" data-visible={onScreen} data-idle={motion} style={{'--living-rhythm':`${4+rhythm(id)*.65}s`,'--living-delay':`${-rhythm(id)}s`} as CSSProperties}>{children}</span>
}
