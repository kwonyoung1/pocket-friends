import {memo,useEffect,useRef,useState} from 'react'
import type {Frame} from './engine'
import {Painter} from './CanvasPainter'
export {Painter,particleBudget} from './CanvasPainter'
export const Effects=memo(function Effects({frame,paused,reduced,intensity='strong'}:{frame:Frame|null;paused:boolean;reduced:boolean;intensity?:'low'|'normal'|'strong'}){
 const canvas=useRef<HTMLCanvasElement>(null),painter=useRef<{update:(f:Frame|null,p:boolean)=>void;dispose:()=>void}|null>(null),latest=useRef({frame,paused}),[fallback,setFallback]=useState(false)
 latest.current={frame,paused}
 const modern=!fallback&&!reduced&&intensity!=='low'
 useEffect(()=>{let cancelled=false;const fail=()=>{if(!cancelled)setFallback(true)}
  if(modern){void import('./PixiEffects').then(async({PixiEffects})=>{if(cancelled)return;const p=new PixiEffects(canvas.current!,intensity as 'normal'|'strong',fail);painter.current=p;try{await p.init();if(!cancelled)p.update(latest.current.frame,latest.current.paused)}catch{p.dispose();fail()}}).catch(fail)}
  else{const p=new Painter(canvas.current!,reduced,intensity);painter.current=p;p.update(latest.current.frame,latest.current.paused)}
  return()=>{cancelled=true;painter.current?.dispose();painter.current=null}
 },[modern,reduced,intensity])
 useEffect(()=>painter.current?.update(frame,paused),[frame,paused]);return <canvas key={modern?'pixi':'canvas'} ref={canvas} className="tm-effects" data-renderer={modern?'loading':'canvas'} aria-hidden="true"/>
})
