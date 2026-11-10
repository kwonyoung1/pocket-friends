import type {Friend} from '../game'
import {sleeping} from '../expansion/model'
export type Feeling='smile'|'joy'|'sleepy'|'excited'|'hungry'|'dusty'|'lonely'|'content'|'surprised'|'rest'
export const feelings:Record<Feeling,{label:string;symbol:string}>={smile:{label:'오늘도 반가워요',symbol:'✿'},joy:{label:'정말 행복해요',symbol:'♡'},sleepy:{label:'포근한 꿈나라',symbol:'☾'},excited:{label:'같이 놀아서 신나요',symbol:'♪'},hungry:{label:'배가 고파요',symbol:'🍽'},dusty:{label:'보송하게 씻고 싶어요',symbol:'🫧'},lonely:{label:'함께 놀고 싶어요',symbol:''},content:{label:'마음이 포근해요',symbol:'✧'},surprised:{label:'와, 놀라워요!',symbol:'!'},rest:{label:'잠깐 쉬어 가요',symbol:'☁'}}
/** Read-only presentation; no saved fields, rewards or simulation changes. */
export function feeling(f:Friend,now:number):Feeling{
 if(sleeping(f,now))return 'sleepy'
 if(f.life?.bath)return 'content'
 if((f.growth?.levelUpUntil??0)>now)return 'surprised'
 if((f.eatingUntil??0)>now||(f.foodReaction?.until??0)>now)return 'content'
 if(f.interaction&&['delighted','bonding','petting','settling'].includes(f.interaction.phase))return 'joy'
 if((f.socialUntil??0)>now)return 'excited'
 if(f.stats.hunger<=30)return 'hungry'
 if(f.stats.hygiene<=30)return 'dusty'
 if(f.stats.energy<=30)return 'sleepy'
 if(f.stats.happiness<=30)return 'lonely'
 if((f.restingUntil??0)>now||(!f.moving&&(f.furnitureUntil??0)>now&&/휴식|쉬기|쿠션/.test(f.furnitureActivity??'')))return 'rest'
 return f.stats.happiness>=85?'joy':'smile'
}
export function nearbyFriend(f:Friend,peers:Friend[],now:number){return peers.find(p=>p.id!==f.id&&!p.growth?.awayJobId&&!p.interaction?.gesture&&Math.hypot(p.x-f.x,p.y-f.y)<125&&!sleeping(p,now))}
export function rhythm(id:string){return [...id].reduce((n,c)=>n+c.charCodeAt(0),0)%6}
