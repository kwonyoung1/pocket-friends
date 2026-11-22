import type {Save} from '../game.ts'
import {world,dailyKey,transact,addXp,acquire,chooseLoot} from '../progression/model.ts'
import {equipment} from '../equipment/model.ts'
import {partyErrors,heroById} from './model.ts'
import {stageById,stageUnlocked,regionById} from './stages.ts'
import {ARENA_LIMITS,ARENA_RULES} from './state.ts'
import type {ArenaCommand,ArenaProgress,ArenaReward,ArenaTicket} from './state.ts'
import type {Move,Profiles} from './types.ts'
import {extendsCheckpoint,replay} from './replay.ts'
const text=(x:unknown,n=100):x is string=>typeof x==='string'&&x.length>0&&x.length<=n
const id=(x:unknown):x is string=>text(x,36)&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
export function validateArena(value:Record<string,unknown>):ArenaCommand{
 const keys=value.type==='arena-start'?['type','stageId','party']:value.type==='arena-abandon'?['type','runId']:['type','runId','moves']
 if(Object.keys(value).some(k=>!keys.includes(k)))throw Error('전투에는 보상·레벨·결과 값을 보낼 수 없어요.')
 if(value.type==='arena-start'){if(!text(value.stageId,12)||!stageById(value.stageId)||!Array.isArray(value.party)||!value.party.length||value.party.length>4||value.party.some(x=>!text(x,60)))throw Error('스테이지와 파티를 확인해 주세요.');return value as ArenaCommand}
 if(!id(value.runId))throw Error('전투 번호를 확인해 주세요.')
 if(value.type==='arena-checkpoint'||value.type==='arena-complete'){if(!Array.isArray(value.moves)||value.moves.length>ARENA_LIMITS.moves||value.moves.some(m=>!m||typeof m!=='object'||Object.keys(m).some(k=>!['skill','target'].includes(k))||!['basic','active1','active2','ultimate'].includes(m.skill)||!text(m.target,100)))throw Error('전투 행동 기록을 확인해 주세요.');return value as ArenaCommand}
 if(value.type!=='arena-abandon')throw Error('지원하지 않는 아레나 명령이에요.');return value as ArenaCommand
}
const seeded=()=>{const values=new Uint32Array(1);crypto.getRandomValues(values);return values[0]}
export function arenaProgress(save:Save,now:number):ArenaProgress{const w=world(save,now),day=dailyKey(now);const p=w.arena??={version:1,cleared:{},tickets:{},daily:{day,coins:0,clears:0,xp:{}}};if(p.daily.day!==day)p.daily={day,coins:0,clears:0,xp:{}};return p}
function ownTicket(p:ArenaProgress,user:string,runId:string,now:number,allowExpired=false):ArenaTicket{const t=p.tickets[user];if(!t||t.owner!==user||t.id!==runId)throw Error('이 계정의 진행 중인 전투가 아니에요.');if(t.status==='abandoned')throw Error('이미 종료한 전투예요.');if(!allowExpired&&t.expiresAt<now)throw Error('전투 유효 시간이 지났어요. 새 전투로 시작해 주세요.');return t}
function firstProfiles(save:Save,party:string[]):Profiles{return Object.fromEntries(party.map(id=>{const f=save.friends.find(f=>f.id===id);if(!f||!heroById(id,f.kind))throw Error('보유한 친구만 출전할 수 있어요.');const level=f.growth?.level??1;if(!Number.isInteger(level)||level<1||level>50)throw Error('친구의 실제 성장 레벨을 확인해 주세요.');return[id,{level,name:/^(남자아이|여자아이)$/.test(f.name)?heroById(id,f.kind).name:f.name,kind:f.kind}]}))}
export function arenaCommand(save:Save,c:ArenaCommand,user:string,now:number,seed=seeded):string{
 const p=arenaProgress(save,now)
 if(c.type==='arena-start'){
  const stage=stageById(c.stageId)!;if(!stageUnlocked(stage.id,p.cleared))throw Error('이전 스테이지를 먼저 클리어해 주세요.')
  const profiles=firstProfiles(save,c.party),errors=partyErrors(c.party,profiles);if(errors.length)throw Error(errors[0]);const old=p.tickets[user]
  if(old?.status==='active'&&old.expiresAt>=now){if(old.stageId===stage.id&&JSON.stringify(old.party)===JSON.stringify(c.party))return '진행 중인 전투를 이어갈 수 있어요.';throw Error('진행 중인 전투를 이어 하거나 먼저 포기해 주세요.')}
  for(const[key,t]of Object.entries(p.tickets))if(t.expiresAt<now)delete p.tickets[key]
  if(old?.status!=='active')delete p.tickets[user]
  if(Object.keys(p.tickets).length>=ARENA_LIMITS.tickets){const removable=Object.entries(p.tickets).filter(([,t])=>t.status!=='active').sort((a,b)=>a[1].startedAt-b[1].startedAt)[0];if(removable)delete p.tickets[removable[0]]}
  if(Object.keys(p.tickets).length>=ARENA_LIMITS.tickets)throw Error('진행 중인 전투가 많아요. 잠시 후 다시 시도해 주세요.')
  p.tickets[user]={id:crypto.randomUUID(),owner:user,stageId:stage.id,party:[...c.party],profiles,seed:seed()>>>0,rules:ARENA_RULES,startedAt:now,expiresAt:now+ARENA_LIMITS.ticketMs,moves:[],status:'active'};return `${stage.name} 출발! 실제 친구 레벨로 도전해요.`
 }
 const t=ownTicket(p,user,c.runId,now,c.type==='arena-abandon')
 if(t.status==='claimed')return '이 전투의 결과와 보상은 이미 반영했어요.'
 if(c.type==='arena-abandon'){t.status='abandoned';return '전투를 포기했어요. 기존 친구와 재화는 그대로예요.'}
 if(!extendsCheckpoint(t,c.moves))throw Error('다른 기기의 더 최신 전투 기록을 먼저 불러와 주세요.')
 const result=replay(t,c.moves)
 if(c.type==='arena-checkpoint'){t.moves=structuredClone(c.moves);return '전투 행동 기록을 안전하게 보관했어요.'}
 if(result.phase!=='victory')throw Error('서버에서 승리를 확인하지 못했어요.')
 if(now<t.startedAt+Math.min(3000,c.moves.length*160))throw Error('전투 완료를 너무 빠르게 요청했어요.')
 const stage=stageById(t.stageId)!,old=p.cleared[stage.id],first=!old?.firstRewarded,terms=first?stage.first:stage.repeat,eligible=p.daily.clears<ARENA_LIMITS.rewardedClears&&p.daily.coins<ARENA_LIMITS.coinsPerDay
 const reward:ArenaReward={coins:0,xp:0,stones:0,first,capped:!eligible}
 if(eligible){
  const amount=Math.min(terms.coins,ARENA_LIMITS.coinsPerDay-p.daily.coins,ARENA_LIMITS.maxCoins-world(save,now).coins)
  if(amount<0||!transact(world(save,now),amount,`${stage.name} ${first?'첫 클리어':'반복'} 보상`,now))throw Error('전투 보상을 안전하게 반영하지 못했어요.')
  reward.coins=amount;p.daily.coins+=amount;p.daily.clears++
  for(const friendId of t.party){const f=save.friends.find(f=>f.id===friendId);if(!f)throw Error('출전 친구를 확인해 주세요.');const xp=(f.growth?.level??1)>=50?0:Math.max(0,Math.min(terms.xp,ARENA_LIMITS.xpPerFriendDay-(p.daily.xp[friendId]??0)));if(xp>0){addXp(f,xp,now);p.daily.xp[friendId]=(p.daily.xp[friendId]??0)+xp;reward.xp=Math.max(reward.xp,xp)}}
  if(first&&stage.first.stones){const e=equipment(save);if((e.stones??0)<10000000){e.stones=(e.stones??0)+1;reward.stones=1}}
  if(first&&stage.first.treasure){const item=chooseLoot(regionById(stage.region).lootRegion,'rare',()=>((seed()>>>0)/4294967296));acquire(world(save,now),item,now);reward.treasure=item}
 }
 p.cleared[stage.id]={firstAt:old?.firstAt??now,clears:Math.min(1000000,(old?.clears??0)+1),firstRewarded:!!old?.firstRewarded||eligible&&first}
 t.moves=structuredClone(c.moves);t.status='claimed';t.reward=reward
 return eligible?`${stage.name} 클리어! ${reward.coins}코인 · 출전 친구 경험치 최대 ${reward.xp}${reward.stones?' · 강화석 1개':''}`:`${stage.name} 클리어! 오늘 보상 한도에 도달해 진행 기록만 반영했어요. 첫 보상은 다음 보상 가능일에 받을 수 있어요.`
}
export type {Move}
