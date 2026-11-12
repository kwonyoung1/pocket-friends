import type {Friend} from '../game.ts'
/** Ignore punctuation-only placeholders, while keeping real Korean/emoji messages. */
export function meaningfulSpeech(text:string){return text.trim().length>0&&!/^[\s.·•…⋯。!！?？\-—_]+$/u.test(text)}
const recent=new WeakMap<Friend,{at:number;lines:Map<string,number>}>()
export function allowAmbientSpeech(f:Friend,text:string,now:number){
 const last=recent.get(f)
 if(last&&(now-last.at<30000||now-(last.lines.get(text)??-Infinity)<120000))return false
 const lines=last?.lines??new Map<string,number>()
 for(const[line,at]of lines)if(now-at>=120000)lines.delete(line)
 lines.set(text,now);recent.set(f,{at:now,lines});return true
}
/** At most one ambient/need bubble; direct player feedback takes precedence. */
export function displayedSpeech(f:Friend,peers:Friend[],now:number){
 const live=(p:Friend)=>p.bubbleUntil>now&&meaningfulSpeech(p.bubble)&&!p.growth?.awayJobId
 if(!live(f))return false
 if((f.bubblePriority??0)>=4)return true
 if(peers.some(p=>p!==f&&live(p)&&(p.bubblePriority??0)>=4))return false
 const winner=[...peers.filter(live)].sort((a,b)=>(b.bubblePriority??0)-(a.bubblePriority??0)||b.bubbleUntil-a.bubbleUntil||a.id.localeCompare(b.id))[0]
 return !winner||winner.id===f.id
}
