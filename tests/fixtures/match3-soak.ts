import {moves} from '../../src/match3/engine'
import type {Board,Special} from '../../src/match3/engine'
export function installSoak(){
 let timer:ReturnType<typeof setInterval>|undefined,raf=0,running=false,previous=0,start=0,frames=0,turns=0,longTasks=0,longest=0
 const intervals:number[]=[];let observer:PerformanceObserver|undefined
 const tick=(t:number)=>{if(!running)return;if(previous&&intervals.length<40000)intervals.push(t-previous);previous=t;frames++;raf=requestAnimationFrame(tick)}
 const play=()=>{const grid=document.querySelector<HTMLElement>('.tm-board');if(!grid||grid.dataset.phase!=='IDLE'||grid.closest<HTMLElement>('.tm-board-wrap')?.dataset.paused==='true')return
  if(grid.dataset.status!=='playing'){[...document.querySelectorAll('button')].find(b=>b.textContent==='다시 도전')?.click();return}
  const tiles=[...grid.querySelectorAll<HTMLElement>('[data-index]')].sort((a,b)=>Number(a.dataset.index)-Number(b.dataset.index))
  const board:Board=tiles.map(t=>({id:Number(t.dataset.gemId),color:t.dataset.color==='rainbow'?null:Number(t.dataset.color),special:t.dataset.special as Special||undefined})),ice=tiles.map(t=>Number(t.dataset.ice))
  const m=moves(board,ice)[0];if(m){tiles[m.a].click();tiles[m.b].click();turns++}
 }
 const harness={
  peek(){return {elapsedMs:performance.now()-start,turns,frames,longTasks}},
  start(){if(running)return;running=true;start=performance.now();frames=0;turns=0;longTasks=0;longest=0;previous=0;intervals.length=0
   try{observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){longTasks++;longest=Math.max(longest,e.duration)}});observer.observe({type:'longtask'})}catch{/* unsupported */}
   raf=requestAnimationFrame(tick);timer=setInterval(play,80)
  },
  stop(){running=false;clearInterval(timer);cancelAnimationFrame(raf);observer?.disconnect();const sorted=intervals.slice().sort((a,b)=>a-b),duration=performance.now()-start;return {durationMs:duration,frames,rafFps:frames/(duration/1000),frameP50Ms:sorted[Math.floor(sorted.length*.5)]??0,frameP95Ms:sorted[Math.floor(sorted.length*.95)]??0,frameP99Ms:sorted[Math.floor(sorted.length*.99)]??0,over33Ms:intervals.filter(n=>n>33.4).length,longTasks,longestTaskMs:longest,turns,domNodes:document.getElementsByTagName('*').length,commits:Number(document.documentElement.dataset.commits),resources:performance.getEntriesByType('resource').length}}
 }
 Object.assign(window,{match3Harness:harness});window.addEventListener('pagehide',()=>harness.stop(),{once:true})
}
