import {useLayoutEffect,useState} from 'react'
import type {CSSProperties,RefObject} from 'react'
import type {MatchEffect} from './effects'
export function MatchOverlay({effect,frame}:{effect:MatchEffect;frame:RefObject<HTMLDivElement|null>}){
 const [geometry,setGeometry]=useState<{width:number;height:number;points:string;centres:{x:number;y:number}[]}>()
 useLayoutEffect(()=>{
  const el=frame.current;if(!el)return
  const measure=()=>{const grid=el.querySelector('.sichuan-board')!,tile=grid.querySelector('button')!.getBoundingClientRect(),outer=el.getBoundingClientRect(),style=getComputedStyle(grid),dx=tile.width+parseFloat(style.columnGap),dy=tile.height+parseFloat(style.rowGap),point=(x:number,y:number)=>({x:tile.left-outer.left+tile.width/2+x*dx,y:tile.top-outer.top+tile.height/2+y*dy})
   setGeometry({width:outer.width,height:outer.height,points:effect.route.map(p=>{const q=point(p.x,p.y);return`${q.x},${q.y}`}).join(' '),centres:[effect.a,effect.b].map(i=>point(i%effect.board.width,Math.floor(i/effect.board.width)))})}
  measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()
 },[effect.id,frame])
 if(!geometry)return null
 return <svg className="sichuan-match-overlay" aria-hidden="true" viewBox={`0 0 ${geometry.width} ${geometry.height}`} data-testid="match-overlay" data-grid-path={JSON.stringify(effect.route)}>
  <polyline className="match-line-glow" points={geometry.points}/><polyline className="match-line" pathLength="1" points={geometry.points}/>
  {geometry.centres.map((c,j)=><g key={j} transform={`translate(${c.x} ${c.y})`} className="match-burst">{Array.from({length:6},(_,i)=><path key={i} d="M0-5 1.5-1.5 5 0 1.5 1.5 0 5-1.5 1.5-5 0-1.5-1.5Z" fill={i%2?'#a4d9e6':'#f4cf7d'} style={{'--spark-x':`${Math.cos(i*Math.PI/3)*25}px`,'--spark-y':`${Math.sin(i*Math.PI/3)*25}px`} as CSSProperties}/>)}</g>)}
 </svg>
}
