/** One shared, visible-only 30Hz loop, regardless of animal count. */
const callbacks=new Set<(now:number,dt:number)=>void>()
let raf=0,last=0,listening=false
function frame(now:number){raf=0;if(document.hidden||!callbacks.size)return;const elapsed=now-last;if(elapsed>=1000/30){const dt=last?elapsed/1000:0;last=now;for(const cb of callbacks)cb(now,dt)}raf=requestAnimationFrame(frame)}
function resume(){if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0}else if(callbacks.size&&!raf){last=0;raf=requestAnimationFrame(frame)}}
export function animateAnimal(callback:(now:number,dt:number)=>void){callbacks.add(callback);if(!listening){document.addEventListener('visibilitychange',resume);listening=true}resume();return()=>{callbacks.delete(callback);if(!callbacks.size){cancelAnimationFrame(raf);raf=0;last=0;document.removeEventListener('visibilitychange',resume);listening=false}}}
