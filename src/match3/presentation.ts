import {durations} from './config'
import type {Frame} from './engine'
/** Skip redundant intermediate poses, never logical removals or points. Max four impact beats. */
export function presentationFrames(frames:Frame[]){
 const budget=frames.reduce((n,f)=>n+durations[f.phase],0)
 if(budget<=1100)return frames
 const clears=frames.filter(f=>f.phase==='CLEARING'),out=frames.filter(f=>f.phase==='SWAPPING').slice(0,1),stride=Math.ceil(clears.length/4)
 for(let i=0;i<clears.length;i+=stride){const chunk=clears.slice(i,i+stride),last=chunk.at(-1)!;out.push({...last,flash:chunk.some(f=>f.flash),gain:chunk.reduce((n,f)=>n+f.gain,0),effects:chunk.flatMap(f=>f.effects).slice(0,16),created:chunk.flatMap(f=>f.created??[])})
  const tail=frames.slice(frames.indexOf(last)+1),next=tail.findIndex(f=>f.phase==='CLEARING'),after=(next<0?tail:tail.slice(0,next)).find(f=>f.phase==='FALLING');if(after)out.push(after)
 }
 out.push(frames.at(-1)!);return out
}
