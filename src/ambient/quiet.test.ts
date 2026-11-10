import {grantSpecialFriends} from '../humans/model'
import {it,expect,vi,afterEach} from 'vitest'
import {createFriends,tick} from '../game'
import {freshWorld} from '../cloud/engine'
import {lifeCommand} from '../expansion/model'
import {beginGesture,endGesture,speak} from '../interaction'
import {quietMovement,restDuration,nearbyDestination} from './movement'
import {meaningfulSpeech,displayedSpeech} from './speech'
const at=Date.parse('2026-11-10T03:00:00Z')
afterEach(()=>vi.restoreAllMocks())
function seed(){let n=12;vi.spyOn(Math,'random').mockImplementation(()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296})}
it('rests 15–30 seconds, occasionally 30–60, with shorter local routes',()=>{expect(restDuration(()=>.5)).toBe(22500);expect(restDuration(()=>.1)).toBe(33000);const f=createFriends(at)[0];for(let i=0;i<100;i++){const target=nearbyDestination(f)!;expect(Math.hypot(target.x-f.x,target.y-f.y)).toBeGreaterThanOrEqual(55);expect(Math.hypot(target.x-f.x,target.y-f.y)).toBeLessThanOrEqual(300)}})
it('staggered ten-friend household never exceeds two autonomous walkers, all eventually move, and drag bypasses the slots',()=>{
 seed();const s=freshWorld(at);grantSpecialFriends(s,at);s.world!.coins=60000;for(const id of ['lulu','toto','byeol','mungchi'])lifeCommand(s,{type:'adopt',id},at)
 const moved=new Set<string>(),starts:number[]=[],original=s.friends.map(f=>({x:f.x,y:f.y}));let max=0
 for(let t=100;t<=360000;t+=100){const old=s.friends.map(f=>f.moving);tick(s.friends,at+t,.1,()=>{});const walking=s.friends.filter(f=>f.moving&&!f.interaction?.gesture);max=Math.max(max,walking.length);expect(walking.length).toBeLessThanOrEqual(quietMovement.maxMoving);s.friends.forEach((f,i)=>{if(f.moving){moved.add(f.id);if(!old[i]&&f.route.length>1)starts.push(t)}})}
 expect(max).toBe(2);expect(moved.size).toBe(10);expect(starts.length).toBeGreaterThan(10)
 const f=s.friends[0];expect(beginGesture(f,9,{x:0,y:0},'body',at+360100,'touch')).toBe(true);expect(f.interaction?.phase).toBe('pressing');endGesture(f,9,at+360101,true)
 expect(s.world!.inventory).toBeDefined();expect(original).toHaveLength(10)
})
it('speed is 20% slower with bounded acceleration/deceleration and a fresh rest after arrival',()=>{
 const f=createFriends(at)[0];f.restingUntil=0;f.route=[{x:f.x+80,y:f.y}];const friends=[f];let lastX=f.x,peak=0,finished=0
 for(let t=100;t<20000;t+=100){tick(friends,at+t,.1,()=>{});const d=Math.abs(f.x-lastX);peak=Math.max(peak,d);expect(d).toBeLessThanOrEqual(35*.8*.1+.001);lastX=f.x;if(!f.route.length){finished=at+t;break}}
 expect(peak).toBeGreaterThan(2);expect(finished).toBeGreaterThan(at);expect(f.restingUntil-finished).toBeGreaterThanOrEqual(15000);expect(f.restingUntil-finished).toBeLessThanOrEqual(60000)
})
it('filters empty placeholders, caps ordinary bubbles at one, and prioritizes actual user feedback',()=>{
 for(const text of ['', '  ','…','...','•••','⋯'])expect(meaningfulSpeech(text)).toBe(false)
 const s=freshWorld(at);grantSpecialFriends(s,at);const fs=s.friends,[boy,girl]=fs.slice(4);expect(speak(boy,'…',at,4)).toBe(false)
 speak(boy,'창밖에 눈이 내려~',at,1);speak(girl,'우리 같이 쉬자!',at,1)
 expect(fs.filter(f=>displayedSpeech(f,fs,at))).toHaveLength(1);expect(boy.bubbleUntil-at).toBe(2700)
 expect(speak(boy,'다른 이야기',at+10000,1)).toBe(false);expect(speak(boy,'다른 이야기',at+31000,1)).toBe(true)
 expect(speak(boy,'창밖에 눈이 내려~',at+62000,1)).toBe(false)
 speak(fs[0],'고마워~',at+31001,4);expect(displayedSpeech(boy,fs,at+31001)).toBe(false);expect(displayedSpeech(fs[0],fs,at+31001)).toBe(true)
})
it('autonomous travel stops before an occupied spot without relocating either saved position',()=>{
 const [f,p]=createFriends(at);Object.assign(f,{x:500,y:400,route:[{x:650,y:400}],restingUntil:0});Object.assign(p,{x:600,y:400,route:[],restingUntil:at+60000});const peers=[f,p]
 for(let t=100;t<=10000;t+=100){tick(peers,at+t,.1,()=>{});expect(Math.hypot(f.x-p.x,f.y-p.y)).toBeGreaterThanOrEqual(38)}
 expect(f.x).toBeGreaterThan(540);expect(p.x).toBe(600);expect(f.restingUntil).toBeGreaterThan(at+10000)
})
