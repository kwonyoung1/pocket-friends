import type {LabMetrics} from './scenes'
export function summarize(intervals:number[],durationMs:number){const sorted=intervals.slice().sort((a,b)=>a-b);return {durationMs,frames:intervals.length,rafFps:durationMs>0?intervals.length*1000/durationMs:0,p95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]??0}}
export async function sample(durationMs:number,particle:()=>number,signal:AbortSignal):Promise<Pick<LabMetrics,'durationMs'|'frames'|'rafFps'|'p95Ms'|'longTasks'|'longestTaskMs'|'peakParticles'>>{
 const intervals:number[]=[];let peakParticles=0,longTasks:number|null=null,longestTaskMs:number|null=null
 const supported=typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes('longtask')
 const observer=supported?new PerformanceObserver(list=>{for(const e of list.getEntries()){longTasks=(longTasks??0)+1;longestTaskMs=Math.max(longestTaskMs??0,e.duration)}}):null
 if(observer){longTasks=longestTaskMs=0;observer.observe({type:'longtask'})}
 try{return await new Promise((resolve,reject)=>{let raf=0,last=0,start=0;const abort=()=>{cancelAnimationFrame(raf);signal.removeEventListener('abort',abort);reject(new DOMException('취소됨','AbortError'))};signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return}const tick=(t:number)=>{if(!start)start=t;if(last)intervals.push(t-last);last=t;peakParticles=Math.max(peakParticles,particle());if(t-start>=durationMs){signal.removeEventListener('abort',abort);for(const e of observer?.takeRecords()??[]){longTasks=(longTasks??0)+1;longestTaskMs=Math.max(longestTaskMs??0,e.duration)}resolve({...summarize(intervals,t-start),longTasks,longestTaskMs,peakParticles});return}raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)})}finally{observer?.disconnect()}
}
