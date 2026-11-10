import {useEffect,useId,useRef,useState} from 'react'
export function winterDaypart(at:number){const hour=(new Date(at).getUTCHours()+9)%24;return hour<6||hour>=21?'night':hour<10?'morning':hour<17?'day':'evening'}
export function WinterDecor({now=Date.now,crowded=false,suspended=false}:{now?:()=>number;crowded?:boolean;suspended?:boolean}){
 const id=useId().replaceAll(':',''),ref=useRef<SVGGElement>(null),[phase,setPhase]=useState(()=>winterDaypart(now())),[active,setActive]=useState(false),[low,setLow]=useState(crowded)
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion:reduce)'),memory=(navigator as Navigator&{deviceMemory?:number}).deviceMemory;setLow(crowded||(memory??8)<=4||navigator.hardwareConcurrency<=4);let visible=false,timer:ReturnType<typeof setInterval>|undefined
 const update=()=>{clearInterval(timer);const enabled=visible&&!document.hidden&&!suspended;setActive(enabled&&!media.matches);if(enabled){setPhase(winterDaypart(now()));timer=setInterval(()=>setPhase(winterDaypart(now())),60000)}}
 const io=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);update()});if(ref.current)io.observe(ref.current);document.addEventListener('visibilitychange',update);media.addEventListener('change',update)
 return()=>{clearInterval(timer);io.disconnect();document.removeEventListener('visibilitychange',update);media.removeEventListener('change',update)}},[now,crowded,suspended])
 return <g ref={ref} data-testid="winter-decor" data-daypart={phase} data-snow-active={active&&!suspended}>
 <defs><clipPath id={`winter-window-${id}`}><rect x="358" y="28" width="130" height="62"/><rect x="498" y="28" width="120" height="62"/><rect x="358" y="101" width="130" height="57"/><rect x="498" y="101" width="120" height="57"/></clipPath><radialGradient id={`winter-glow-${id}`}><stop stopColor="#ffc776" stopOpacity=".32"/><stop offset="1" stopColor="#ffcb8a" stopOpacity="0"/></radialGradient></defs>
 <g className="winter-window-effects" clipPath={`url(#winter-window-${id})`} data-testid="winter-window-clip"><rect x="350" y="20" width="280" height="145" className={`winter-sky sky-${phase}`}/>{active&&!suspended&&Array.from({length:low?4:8},(_,i)=><circle key={i} className="winter-snow" cx={365+(i*37)%248} cy={20+(i*19)%130} r={i%3===0?1.9:1.2} fill="#fff" style={{animationDuration:`${10+i%4*2}s`,animationDelay:`-${i*1.7}s`}}/>)}</g>
 {['evening','night'].includes(phase)&&<g className="winter-lamplight"><ellipse cx="490" cy="160" rx="220" ry="125" fill={`url(#winter-glow-${id})`}/><ellipse cx="875" cy="155" rx="100" ry="110" fill={`url(#winter-glow-${id})`}/></g>}
 </g>
}
