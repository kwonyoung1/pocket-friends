import type {Page} from '@playwright/test'
export async function startMetrics(page:Page){await page.evaluate(()=>{
 let running=true,raf=0,last=0,frames=0,longTasks=0,longest=0;const started=performance.now(),intervals:number[]=[]
 const observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){longTasks++;longest=Math.max(longest,e.duration)}});observer.observe({type:'longtask'})
 const tick=(now:number)=>{if(!running)return;if(last)intervals.push(now-last);last=now;frames++;raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)
 Object.assign(window,{stopMatchMetrics:()=>{running=false;cancelAnimationFrame(raf);observer.disconnect();const duration=performance.now()-started,s=intervals.sort((a,b)=>a-b);return {durationMs:duration,frames,rafFps:frames/(duration/1000),frameP95Ms:s[Math.floor(s.length*.95)]??0,longTasks,longestTaskMs:longest}}})
})}
export async function stopMetrics(page:Page){return page.evaluate(()=>(window as unknown as {stopMatchMetrics:()=>Record<string,number>}).stopMatchMetrics())}
