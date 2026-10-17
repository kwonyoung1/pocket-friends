import type {Save} from '../game.ts'
import {world,transact} from '../progression/model.ts'
import {createBoard,pair,path,reshuffle,rules,stages,random} from './board.ts'
import {newSichuan,ranking,upgradeCompetition} from './state.ts'
import type {Round,SichuanCommand,SichuanState} from './state.ts'
export const progress=(s:Save)=>{const p=world(s).sichuan??=newSichuan();upgradeCompetition(p);return p}
function settle(s:Save,r:Round,now:number){
 if(r.status==='settled')return
 r.status='settled';r.endedAt=now;r.reward=r.completed?stages[r.completed-1].reward:0
 if(r.paidAt===undefined){if(r.reward&&!transact(world(s),r.reward,'사천성 탐험 정산',now))throw Error('코인을 정산하지 못했어요.');r.paidAt=now}
}
export function expireSichuan(s:Save,now:number){const r=world(s).sichuan?.adventure;if(r?.status==='playing'&&now>=r.stageEndsAt)settle(s,r,now)}
function makeRound(mode:Round['mode'],owner:string,nickname:string,now:number,rng:()=>number):Round{
 const stage=mode==='competition'?3:1
 return{id:crypto.randomUUID(),mode,owner,nickname,stage,completed:0,board:createBoard(stage,rng),startedAt:now,stageEndsAt:mode==='adventure'?now+stages[0].seconds*1000:0,turn:0,hints:rules.hints,manual:mode==='competition'?rules.competitionShuffles:rules.manualShuffles,manualLimit:mode==='competition'?1:3,hintsUsed:0,autoShuffles:0,status:'playing'}
}
function record(p:SichuanState,r:Round,now:number){
 r.elapsedMs=Math.max(0,now-r.startedAt);r.endedAt=now;r.status='settled'
 const previous=p.bests.find(x=>x.playerId===r.owner)
 if(previous&&previous.elapsedMs<=r.elapsedMs)return
 p.bests=p.bests.filter(x=>x.playerId!==r.owner)
 p.bests.push({playerId:r.owner,nickname:r.nickname,elapsedMs:r.elapsedMs,at:now,sessionId:r.id})
 r.top=ranking(p).some(x=>x.sessionId===r.id)
}
export function sichuanCommand(s:Save,c:SichuanCommand,user:string,now:number,rng=random):string{
 const p=progress(s),before=p.adventure?.status
 expireSichuan(s,now)
 if(c.type==='sichuan-start'){
  if(c.mode==='adventure'){
   if(p.adventure&&p.adventure.status!=='settled')throw Error('진행 중인 탐험을 먼저 완료하거나 정산해 주세요.')
   if(now<p.nextStartAt)throw Error('사천성 탐험은 한 시간에 한 번 시작할 수 있어요.')
   p.adventure=makeRound(c.mode,user,'탐험가',now,rng);p.nextStartAt=now+rules.cooldown
  }else{
   const nickname=c.nickname?.trim()??''
   if([...nickname].length<2||[...nickname].length>12||/[\p{Cc}\p{Cf}]/u.test(nickname))throw Error('닉네임은 2~12자로 입력해 주세요.')
   // Replacing only the caller's session makes unlimited restarts independent of exploration.
   p.competitions[user]=makeRound(c.mode,user,nickname,now,rng)
  }
  return '사천성을 시작했어요!'
 }
 const r=c.mode==='adventure'?p.adventure:p.competitions[user]
 if(!r||r.id!==c.sessionId)throw Error('현재 사천성 게임을 다시 열어 주세요.')
 if(r.status==='settled')return before==='playing'&&c.mode==='adventure'?'시간이 끝나 마지막 완료 단계 보상을 정산했어요.':'이미 종료·정산된 게임이에요.'
 if(r.turn!==c.turn)throw Error('다른 기기에서 보드가 바뀌었어요. 다시 선택해 주세요.')
 if(c.type==='sichuan-stop'){
  if(c.mode==='adventure')settle(s,r,now);else{r.status='settled';r.endedAt=now}
  return '사천성을 종료했어요. 탐험 보상은 한 번만 정산돼요.'
 }
 if(c.type==='sichuan-next'){
  if(c.mode!=='adventure'||r.status!=='cleared'||r.stage>=5)throw Error('완료한 단계에서만 다음 단계로 갈 수 있어요.')
  r.stage++;r.board=createBoard(r.stage,rng);r.stageEndsAt=now+stages[r.stage-1].seconds*1000;r.status='playing';r.hints=rules.hints;r.manual=rules.manualShuffles;delete r.hint;r.turn++
  return `${r.stage}단계 도전!`
 }
 if(r.status!=='playing')throw Error('보상을 받거나 다음 단계에 도전해 주세요.')
 if(r.shuffledAt!==undefined&&now-r.shuffledAt<rules.shuffleMs)throw Error('패를 섞고 있어요. 잠깐만 기다려 주세요.')
 let message='패를 연결했어요!'
 if(c.type==='sichuan-hint'){
  if(!r.hints)throw Error('힌트를 모두 사용했어요.')
  const found=pair(r.board);if(!found)throw Error('보드를 다시 동기화해 주세요.')
  r.hint=found;r.hints--;r.hintsUsed++;message='빛나는 두 패를 연결해 보세요!'
 }else if(c.type==='sichuan-shuffle'){
  if(!r.manual)throw Error('수동 섞기를 모두 사용했어요.')
  r.board=reshuffle(r.board,rng);r.manual--;r.shuffledAt=now;delete r.hint;message='패를 섞었어요!'
 }else if(c.type==='sichuan-match'){
  if(!Number.isInteger(c.a)||!Number.isInteger(c.b)||!path(r.board,c.a!,c.b!))throw Error('같은 패를 두 번 이하로 꺾어 연결해 주세요.')
  r.lastMatch={a:c.a!,b:c.b!,at:now,turn:r.turn+1}
  r.board.tiles[c.a!]=0;r.board.tiles[c.b!]=0;delete r.hint
  if(!r.board.tiles.some(Boolean)){
   if(c.mode==='competition'){record(p,r,now);message=r.top?'축하해요! TOP 5에 올랐어요!':'경쟁모드를 완료했어요!'}
   else{r.completed=r.stage;r.status='cleared';if(r.stage===5)settle(s,r,now);message=`${r.completed}단계 완료! ${stages[r.completed-1].reward}코인 확보!`}
  }else if(!pair(r.board)){
   r.board=reshuffle(r.board,rng);r.autoShuffles++;r.shuffledAt=now;r.autoAt=now;message='연결할 수 있는 패가 없어 자동으로 섞었어요!'
  }
 }
 r.turn++;return message
}
