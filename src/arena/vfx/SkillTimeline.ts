import {gsap} from 'gsap'
export class AnimationCancelled extends Error{}
/** Paused GSAP timelines are advanced solely by Pixi's battle clock, including 2x and visibility pause. */
export class SkillTimeline{
 private jobs=new Set<{timeline:gsap.core.Timeline;resolve:()=>void;reject:(e:Error)=>void}>();private dead=false
 get active(){return this.jobs.size}
 tween(ms:number,draw:(p:number)=>void,ease='none'):Promise<void>{
  if(this.dead)return Promise.reject(new AnimationCancelled('Battle closed'))
  return new Promise((resolve,reject)=>{const value={p:0},timeline=gsap.timeline({paused:true}),job={timeline,resolve,reject};this.jobs.add(job)
   timeline.to(value,{p:1,duration:Math.max(1,ms)/1000,ease,onUpdate:()=>{try{draw(value.p)}catch(e){timeline.kill();this.jobs.delete(job);reject(e instanceof Error?e:new Error(String(e)))}},onComplete:()=>{this.jobs.delete(job);timeline.kill();resolve()}})
  })
 }
 tick(ms:number){for(const job of [...this.jobs])job.timeline.totalTime(job.timeline.totalTime()+ms/1000,false)}
 destroy(){this.dead=true;for(const job of this.jobs){job.timeline.kill();job.reject(new AnimationCancelled('Battle closed'))}this.jobs.clear()}
}
