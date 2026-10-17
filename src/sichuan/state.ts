import type {Board} from './board.ts'
export type Mode='adventure'|'competition'
export type Round={id:string;mode:Mode;owner:string;nickname:string;stage:number;completed:number;board:Board;startedAt:number;stageEndsAt:number;turn:number;hints:number;manual:number;hint?:[number,number];hintsUsed:number;autoShuffles:number;shuffledAt?:number;autoAt?:number;status:'playing'|'cleared'|'settled';endedAt?:number;elapsedMs?:number;reward?:number;paidAt?:number;top?:boolean}
export type RecordEntry={playerId:string;nickname:string;elapsedMs:number;at:number;sessionId:string}
export type SichuanState={version:1;nextStartAt:number;adventure?:Round;competitions:Record<string,Round>;bests:RecordEntry[]}
export type SichuanCommand={type:'sichuan-start';mode:Mode;nickname?:string}|{type:'sichuan-match'|'sichuan-hint'|'sichuan-shuffle'|'sichuan-next'|'sichuan-stop';mode:Mode;sessionId:string;turn:number;a?:number;b?:number}
export function newSichuan():SichuanState{return{version:1,nextStartAt:0,competitions:{},bests:[]}}
export function ranking(p:SichuanState){return [...p.bests].sort((a,b)=>a.elapsedMs-b.elapsedMs||a.at-b.at).slice(0,5)}
// Validate instead of resetting malformed saves. The original storage backup remains available.
export function migrateSichuan(raw:unknown):SichuanState|undefined{
 if(raw===undefined)return undefined
 const p=structuredClone(raw) as SichuanState
 const num=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0
 const text=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=100
 if(!p||p.version!==1||!num(p.nextStartAt)||!p.competitions||Array.isArray(p.competitions)||typeof p.competitions!=='object'||!Array.isArray(p.bests)||p.bests.length>10000)throw Error('사천성 저장 형식을 확인해 주세요.')
 for(const r of [p.adventure,...Object.values(p.competitions)])if(r){
  const b=r.board
  if(!text(r.id)||!text(r.owner)||!['adventure','competition'].includes(r.mode)||!num(r.stage)||r.stage<1||r.stage>5||!num(r.completed)||r.completed>5||!['playing','cleared','settled'].includes(r.status)||![r.startedAt,r.stageEndsAt,r.turn,r.hints,r.manual,r.hintsUsed,r.autoShuffles].every(num)||r.hints>3||r.manual>3||!b||!num(b.width)||!num(b.height)||b.width<1||b.width>12||b.height<1||b.height>10||!Array.isArray(b.tiles)||b.tiles.length!==b.width*b.height||b.tiles.some(v=>!num(v)||v>20)||[r.endedAt,r.elapsedMs,r.reward,r.paidAt,r.shuffledAt,r.autoAt].some(v=>v!==undefined&&!num(v)))throw Error('사천성 진행 기록을 확인해 주세요.')
  const counts=new Map<number,number>();for(const v of b.tiles)if(v)counts.set(v,(counts.get(v)??0)+1)
  if([...counts.values()].some(n=>n%2))throw Error('사천성 패의 짝이 맞지 않아요.')
 }
 if(p.bests.some(r=>!text(r.playerId)||!text(r.nickname)||!text(r.sessionId)||!num(r.elapsedMs)||!num(r.at))||new Set(p.bests.map(r=>r.playerId)).size!==p.bests.length)throw Error('사천성 랭킹 기록을 확인해 주세요.')
 return p
}
