import {startSeason2,arenaGrowth,growArena} from './season2.ts'
import {adventurerById} from './adventurers.ts'
import {stageById as stage4} from './legacy-v4/stages.ts'
import {shopCommand} from './shop.ts'
import {costLimit,scrollById,trainingOf} from './shop-state.ts'
import {eventOpen} from './season.ts'
import {arenaOwner,initialSharedOwner,validArenaId,validArenaSecret} from './identity.ts'
import type {Save} from '../game.ts'
import {world,dailyKey,transact,addXp,acquire,chooseLoot} from '../progression/model.ts'
import {equipment} from '../equipment/model.ts'
import {partyErrors,heroById,equippedArenaBonus} from './model.ts'
import {stageById,stageUnlocked,regionById} from './stages.ts'
import {stageById as legacyStage} from './legacy/stages.ts'
import {ARENA_LIMITS,ARENA_RULES,restoreArena} from './state.ts'
import type {ArenaCommand,ArenaProgress,ArenaReward,ArenaTicket} from './state.ts'
import type {Move,Profiles} from './types.ts'
import type {ArenaAccount} from './beast-state.ts'
import {BEAST_LIMITS,addBeastXp} from './beast-state.ts'
import {beastById} from './beasts.ts'
import {chestById,chestForStage,openChest,trainBeast} from './chests.ts'
import {fuseBeast} from './fusion.ts'
import {energySpend} from './energy.ts'
import {extendsCheckpoint,replay} from './replay.ts'
const text=(x:unknown,n=100):x is string=>typeof x==='string'&&x.length>0&&x.length<=n
const id=(x:unknown):x is string=>text(x,36)&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
export function validateArena(value:Record<string,unknown>):ArenaCommand{
 const keys=value.type==='arena-adventurer-train'?['type','adventurerId']:value.type==='arena-shop'?(value.item==='training'?['type','item','friendId','stat','expected']:value.item==='skill'?['type','item','friendId','skillId','expected']:value.item==='command'?['type','item','expected']:value.item==='scroll-buy'?['type','item','scrollId','quantity']:['type','item','scrollId','quantity','friendId']):value.type==='arena-fuse'?['type','beastId','fromStars']:['arena-share','arena-season-start'].includes(value.type as string)?['type']:value.type==='arena-select'?['type','accountId','previousOwner']:value.type==='arena-start'?['type','stageId','party']:value.type==='arena-link'?['type','accountId','secret']:value.type==='arena-open'?['type','chest','nonce']:value.type==='arena-train'?['type','beastId','training']:value.type==='arena-abandon'?['type','runId']:['type','runId','moves']
 if(Object.keys(value).some(k=>!keys.includes(k)))throw Error('전투에는 보상·레벨·확률·결과 값을 보낼 수 없어요.')
 if(value.type==='arena-adventurer-train'){if(!text(value.adventurerId,40)||!adventurerById(value.adventurerId))throw Error('모험가를 선택해 주세요.');return value as ArenaCommand}
 if(value.type==='arena-shop'){
  if(!['training','skill','command','scroll-buy','scroll-use'].includes(value.item as string))throw Error('상점 항목을 확인해 주세요.')
  if(value.item!=='command'&&value.item!=='scroll-buy'&&!text(value.friendId,60))throw Error('캐릭터를 선택해 주세요.')
  if(['training','skill','command'].includes(value.item as string)&&(!Number.isInteger(value.expected)||(value.expected as number)<0||(value.expected as number)>30))throw Error('강화 단계를 확인해 주세요.')
  if(value.item==='training'&&!['hp','atk','def'].includes(value.stat as string)||value.item==='skill'&&!['basic','active1','active2','ultimate'].includes(value.skillId as string))throw Error('강화할 능력치나 스킬을 확인해 주세요.')
  if(['scroll-buy','scroll-use'].includes(value.item as string)&&(!scrollById(value.scrollId as string)||!Number.isInteger(value.quantity)||(value.quantity as number)<1||(value.quantity as number)>99))throw Error('주문서와 수량을 확인해 주세요.')
  return value as ArenaCommand
 }
 if(value.type==='arena-fuse'){if(!text(value.beastId,40)||!beastById(value.beastId)||!Number.isInteger(value.fromStars)||(value.fromStars as number)<1||(value.fromStars as number)>4)throw Error('합성할 환수와 성급을 확인해 주세요.');return value as ArenaCommand}
 if(value.type==='arena-share'||value.type==='arena-season-start')return {type:value.type}
 if(value.type==='arena-select'){if(!validArenaId(value.accountId)||!validArenaId(value.previousOwner))throw Error('보존된 아레나 기록을 확인해 주세요.');return value as ArenaCommand}
 if(value.type==='arena-start'){if(!text(value.stageId,12)||!stageById(value.stageId)||!Array.isArray(value.party)||!value.party.length||value.party.length>5||value.party.some(x=>!text(x,60)))throw Error('스테이지와 파티를 확인해 주세요.');return value as ArenaCommand}
 if(value.type==='arena-link'){if(!validArenaId(value.accountId)||!validArenaSecret(value.secret))throw Error('아레나 계정 연결 코드를 확인해 주세요.');return value as ArenaCommand}
 if(value.type==='arena-open'){if(!text(value.chest,20)||!chestById(value.chest)||!Number.isSafeInteger(value.nonce)||(value.nonce as number)<1)throw Error('상자와 개봉 번호를 확인해 주세요.');return value as ArenaCommand}
 if(value.type==='arena-train'){if(!text(value.beastId,40)||!beastById(value.beastId)||!['xp','mastery'].includes(value.training as string))throw Error('환수와 육성 방법을 확인해 주세요.');return value as ArenaCommand}
 if(!id(value.runId))throw Error('전투 번호를 확인해 주세요.')
 if(value.type==='arena-checkpoint'||value.type==='arena-complete'){if(!Array.isArray(value.moves)||value.moves.length>ARENA_LIMITS.moves||value.moves.some(m=>!m||typeof m!=='object'||Object.keys(m).some(k=>!['skill','target'].includes(k))||!['basic','active1','active2','ultimate'].includes(m.skill)||!text(m.target,100)))throw Error('전투 행동 기록을 확인해 주세요.');return value as ArenaCommand}
 if(value.type!=='arena-abandon')throw Error('지원하지 않는 아레나 명령이에요.');return value as ArenaCommand
}
const seeded=()=>{const values=new Uint32Array(1);crypto.getRandomValues(values);return values[0]}
export function arenaProgress(save:Save,now:number):ArenaProgress{const w=world(save,now),day=dailyKey(now),p=w.arena??={version:1,cleared:{},tickets:{},daily:{day,coins:0,clears:0,xp:{}}};if(p.daily.day!==day)p.daily={day,coins:0,clears:0,xp:{}};return p}
export function arenaAccount(p:ArenaProgress,user:string,now:number):ArenaAccount{
 p.accounts??={};if(!p.accounts[user]){if(Object.keys(p.accounts).length>=BEAST_LIMITS.accounts)throw Error('아레나 계정 공간이 가득 찼어요. 관리자에게 문의해 주세요.');p.accounts[user]={energy:{value:100,at:now},cleared:structuredClone(p.cleared),beasts:{},chests:{},opens:0,pity:{legendary:0,mythic:0},daily:{day:dailyKey(now),xp:{}}}}
 const a=p.accounts[user];if(a.daily.day!==dailyKey(now))a.daily={day:dailyKey(now),xp:{}};return a
}
function ownTicket(p:ArenaProgress,user:string,runId:string,now:number,allowExpired=false):ArenaTicket{const t=p.tickets[user];if(!t||t.owner!==user||t.id!==runId)throw Error('이 계정의 진행 중인 전투가 아니에요.');if(t.status==='abandoned')throw Error('이미 종료한 전투예요.');if(!allowExpired&&t.expiresAt<now)throw Error('전투 유효 시간이 지났어요. 새 전투로 시작해 주세요.');return t}
function firstProfiles(save:Save,a:ArenaAccount,party:string[]):Profiles{return Object.fromEntries(party.map(id=>{
 if(adventurerById(id)){const b=a.adventurers?.[id];if(!b)throw Error('보유한 모험가만 출전할 수 있어요.');return[id,{level:b.level,name:adventurerById(id)!.name,training:{...trainingOf(a.shop,id)},skillLevels:{...a.shop?.skills[id]}}]}
 if(beastById(id)){const b=a.beasts[id];if(!b)throw Error('보유한 환수만 출전할 수 있어요.');return[id,{level:b.level,name:beastById(id)!.name,mastery:b.mastery,stars:b.stars??1,training:{...trainingOf(a.shop,id)},skillLevels:{...a.shop?.skills[id]}}]}
 const f=save.friends.find(f=>f.id===id);if(!f||!heroById(id,f.kind))throw Error('보유한 친구만 출전할 수 있어요.');const level=arenaGrowth(a,id).level;if(!Number.isInteger(level)||level<1||level>50)throw Error('친구의 실제 성장 레벨을 확인해 주세요.');const gear=equippedArenaBonus(save.world?.equipment?.instances??[],id);return[id,{level,name:/^(남자아이|여자아이)$/.test(f.name)?heroById(id,f.kind).name:f.name,kind:f.kind,gear,training:{...trainingOf(a.shop,id)},skillLevels:{...a.shop?.skills[id]}}]
 }))}
function grantCoins(save:Save,p:ArenaProgress,amount:number,label:string,now:number,cap:number=BEAST_LIMITS.worldCoinsPerDay){const n=Math.max(0,Math.min(amount,cap-p.daily.coins,ARENA_LIMITS.maxCoins-world(save,now).coins));if(!transact(world(save,now),n,label,now))throw Error('보상을 안전하게 지급하지 못했어요.');p.daily.coins+=n;return n}
export function arenaCommand(save:Save,c:ArenaCommand,user:string,now:number,seed=seeded):string{
 const p=c.type==='arena-season-start'&&save.world?.arena?save.world.arena:arenaProgress(save,now)
 if(c.type==='arena-season-start'){const message=startSeason2(save,p,now);restoreArena(p);return message}
 if(c.type==='arena-share'){const owner=initialSharedOwner(p,user);arenaAccount(p,owner,now);p.sharedOwner=owner;return '같은 비밀번호로 접속한 모든 기기가 아레나 진행을 자동으로 공유해요.'}
 if(c.type==='arena-select'){
  if(!p.sharedOwner||p.sharedOwner!==c.previousOwner)throw Error('다른 기기에서 공유 기록을 변경했어요. 최신 기록을 확인해 주세요.')
  if(!p.accounts?.[c.accountId])throw Error('보존된 아레나 기록을 찾지 못했어요.')
  p.sharedOwner=c.accountId;return '모든 기기의 공유 아레나 기록을 변경했어요. 다른 기록도 그대로 보존돼요.'
 }
 if(c.type==='arena-link'){
  // The HTTP handler SHA-256 hashes the secret before this canonical command/receipt is evaluated.
  if(c.accountId===arenaOwner(p,user)){const own=arenaAccount(p,c.accountId,now);own.recoveryHash=c.secret;return '이 기기의 아레나 계정 연결 코드를 안전하게 등록했어요.'}
  const target=p.accounts?.[c.accountId];let diff=0;const expected=target?.recoveryHash??'';for(let n=0;n<64;n++)diff|=(expected.charCodeAt(n)||0)^c.secret.charCodeAt(n);if(!target||expected.length!==64||diff)throw Error('아레나 연결 코드를 확인해 주세요.');
  const previous=p.accounts?.[arenaOwner(p,user)];if(arenaOwner(p,user)!==c.accountId&&previous&&(Object.keys(previous.beasts).length||Object.values(previous.chests).some(n=>n)||previous.energy.value<100||p.tickets[user]))throw Error('이미 진행한 아레나 계정은 자동으로 합치지 않아요. 기존 계정은 보존되며 새 기기에서 연결해 주세요.');
  p.links??={};if(!p.links[user]&&Object.keys(p.links).length>=256)throw Error('아레나 기기 연결 공간이 가득 찼어요. 관리자에게 문의해 주세요.');p.links[user]=c.accountId;return '기존 아레나 계정의 환수·에너지·진행을 연결했어요.'
 }
 const owner=arenaOwner(p,user),a=arenaAccount(p,owner,now),random=()=>((seed()>>>0)/4294967296)
 if(['arena-start','arena-shop','arena-open','arena-train','arena-fuse','arena-adventurer-train'].includes(c.type)&&p.season!==2)throw Error('시즌 2 전환을 먼저 완료해 주세요. 기존 기록은 보관돼요.')
 if(c.type==='arena-shop')return shopCommand(save,a,c,now)
 if(c.type==='arena-adventurer-train'){const h=a.adventurers?.[c.adventurerId];if(!h||h.level>=50||h.shards<5)throw Error('보유한 모험가의 레벨과 전용 조각을 확인해 주세요.');h.shards-=5;growArena(h,100);return '모험가 조각 5개로 아레나 경험치 100을 얻었어요.'}
 if(c.type==='arena-fuse'){const result=fuseBeast(a,c.beastId,c.fromStars,now);return `${beastById(c.beastId)!.name} ★${result.toStars} 합성 완료! 전용 조각 ${result.shards}개를 사용했어요.`}
 if(c.type==='arena-open'){
  const repeated=c.nonce===a.opens&&a.lastOpening?.nonce===c.nonce,result=openChest(a,c.chest,c.nonce,now,random);if(repeated)return '이미 개봉한 상자의 결과를 다시 확인했어요.'
  if(result.coins){result.coins=grantCoins(save,p,result.coins,'별빛 상자 보상',now);if(!result.coins)result.stones=1}
  if(result.stones){const e=equipment(save);e.stones=Math.min(10000000,(e.stones??0)+result.stones)}
  return result.adventurerId?`${adventurerById(result.adventurerId)!.name} ${result.duplicate?'중복! 전용 조각 '+result.shards+'개':'모험가 획득!'}`:result.beastId?`${beastById(result.beastId)!.name} ${result.duplicate?'중복! 전용 조각 '+result.shards+'개':'환수 획득!'}`:`상자 개봉! ${result.coins?result.coins+'코인':'강화석 '+result.stones+'개'}`
 }
 if(c.type==='arena-train'){const message=trainBeast(a,c.beastId,c.training);if(c.training==='xp'){const b=a.beasts[c.beastId];b.shards-=5;addBeastXp(b,100);return '전용 조각 5개로 환수 경험치 100을 얻었어요.'}return message}
 if(c.type==='arena-start'){
  const stage=stageById(c.stageId)!;if(stage.event&&!eventOpen(now))throw Error('크리스마스 이벤트 입장 기간이 아니에요.');if(!stageUnlocked(stage.id,a.cleared))throw Error('이전 스테이지를 먼저 클리어해 주세요.')
  const profiles=firstProfiles(save,a,c.party),cap=costLimit(a.shop,c.party,profiles,!!a.commandRelic),errors=partyErrors(c.party,profiles,cap);if(errors.length)throw Error(errors[0]);const old=p.tickets[owner]
  if(old?.status==='active'&&old.expiresAt>=now){if(old.stageId===stage.id&&JSON.stringify(old.party)===JSON.stringify(c.party))return '진행 중인 전투를 이어갈 수 있어요.';throw Error('진행 중인 전투를 이어 하거나 먼저 포기해 주세요.')}
  // Validate capacity before debit; CAS commits energy and ticket together or commits neither.
  for(const[key,t]of Object.entries(p.tickets))if(t.expiresAt<now)delete p.tickets[key]
  if(old?.status!=='active')delete p.tickets[owner]
  if(Object.keys(p.tickets).length>=ARENA_LIMITS.tickets){const removable=Object.entries(p.tickets).filter(([,t])=>t.status!=='active').sort((a,b)=>a[1].startedAt-b[1].startedAt)[0];if(removable)delete p.tickets[removable[0]]}
  if(Object.keys(p.tickets).length>=ARENA_LIMITS.tickets)throw Error('진행 중인 전투가 많아요. 잠시 후 다시 시도해 주세요.')
  const energy=energySpend(a.energy,stage.energy,now),ticket:ArenaTicket={id:crypto.randomUUID(),owner,stageId:stage.id,party:[...c.party],profiles,seed:seed()>>>0,rules:ARENA_RULES,startedAt:now,expiresAt:now+ARENA_LIMITS.ticketMs,moves:[],status:'active',energyCost:stage.energy,costLimit:cap}
  a.energy=energy;p.tickets[owner]=ticket;return `${stage.name} 출발! 별빛 에너지 ${stage.energy} 사용.`
 }
 const t=ownTicket(p,owner,c.runId,now,c.type==='arena-abandon')
 if(t.status==='claimed')return '이 전투의 결과와 보상은 이미 반영했어요.'
 if(c.type==='arena-abandon'){t.status='abandoned';return '전투를 포기했어요. 입장 에너지는 반환되지 않으며 기존 친구와 재화는 그대로예요.'}
 if(!extendsCheckpoint(t,c.moves))throw Error('다른 기기의 더 최신 전투 기록을 먼저 불러와 주세요.')
 const result=replay(t,c.moves)
 if(c.type==='arena-checkpoint'){t.moves=structuredClone(c.moves);return '전투 행동 기록을 안전하게 보관했어요.'}
 if(result.phase!=='victory')throw Error('서버에서 승리를 확인하지 못했어요.')
 if(now<t.startedAt+Math.min(3000,c.moves.length*160))throw Error('전투 완료를 너무 빠르게 요청했어요.')
 const stage=t.rules===1?{...legacyStage(t.stageId)!,event:undefined}:t.rules<=4?stage4(t.stageId)!:stageById(t.stageId)!,oldClears=t.rules<=4&&p.season===2&&p.season1Archive?((p.legacyCleared??={})[owner]??=structuredClone(p.season1Archive.accounts[owner]?.cleared??p.season1Archive.cleared)):undefined,cleared=stage.event?(a.eventClears??={}):oldClears??(t.rules===1?p.cleared:a.cleared),old=cleared[stage.id],first=!old?.firstRewarded,firstLoot=!(old?.firstBonusGranted??old?.firstRewarded),terms=first?stage.first:stage.repeat,eligible=t.rules===1?p.daily.clears<ARENA_LIMITS.rewardedClears&&p.daily.coins<ARENA_LIMITS.coinsPerDay:p.daily.coins+(t.rules>=4&&first?terms.coins:0)<=(t.rules>=4&&first?BEAST_LIMITS.worldCoinsPerDay:BEAST_LIMITS.worldCoinsPerDay-1)
 const reward:ArenaReward={coins:0,xp:0,stones:0,first,capped:!eligible}
 if(t.rules!==1){const box=stage.event?'christmas':chestForStage(stage.index,stage.boss,random),count=stage.event?1:(t.rules>=4?firstLoot:first)&&stage.boss?2:1;if((a.chests[box]??0)+count>BEAST_LIMITS.chests)throw Error('보물상자를 먼저 개봉하고 같은 결과로 다시 확인해 주세요.');a.chests[box]=(a.chests[box]??0)+count;reward.chests={[box]:count}}
 if(eligible){
  reward.coins=grantCoins(save,p,terms.coins,`${stage.name} ${first?'첫 클리어':'반복'} 보상`,now,t.rules===1?ARENA_LIMITS.coinsPerDay:BEAST_LIMITS.worldCoinsPerDay);p.daily.clears++
  }
 if(eligible||t.rules>=4){
  const dailyXp=t.rules===1?p.daily.xp:a.daily.xp
  for(const friendId of t.party){const beast=a.beasts[friendId],adventurer=a.adventurers?.[friendId],f=save.friends.find(f=>f.id===friendId);if(!f&&!beast&&!adventurer)throw Error('출전 친구를 확인해 주세요.');const level=beast?.level??adventurer?.level??(p.season===2?arenaGrowth(a,friendId).level:f?.growth?.level)??1,xp=level>=50?0:Math.max(0,Math.min(terms.xp,(t.rules>=5?600:ARENA_LIMITS.xpPerFriendDay)-(dailyXp[friendId]??0)));if(xp>0){if(beast)addBeastXp(beast,xp);else if(adventurer)growArena(adventurer,xp);else if(p.season===2)growArena(arenaGrowth(a,friendId),xp);else addXp(f!,xp,now);dailyXp[friendId]=(dailyXp[friendId]??0)+xp;reward.xp=Math.max(reward.xp,xp)}}
 }
 if((eligible||t.rules>=4)&&(t.rules>=4?firstLoot:first)){
  if(stage.first.stones){const e=equipment(save);if((e.stones??0)<10000000){e.stones=(e.stones??0)+1;reward.stones=1}}
  if(stage.first.treasure){const item=chooseLoot(regionById(stage.region).lootRegion,'rare',random);acquire(world(save,now),item,now);reward.treasure=item}
 }
 if(t.rules>=4&&stage.id==='10-5'&&firstLoot)a.commandRelic=true
 const record={...(t.rules>=4?{firstBonusGranted:true}:{}),firstAt:old?.firstAt??now,clears:Math.min(1000000,(old?.clears??0)+1),firstRewarded:!!old?.firstRewarded||eligible&&first};cleared[stage.id]=record;if(t.rules===1&&!oldClears)a.cleared[stage.id]=structuredClone(record)
 t.moves=structuredClone(c.moves);t.status='claimed';t.reward=reward
 return `${stage.name} 클리어! ${reward.coins}코인 · 출전 경험치 최대 ${reward.xp}${reward.chests?' · 보물상자 획득':''}${reward.capped?' · 오늘 공유 월드 코인 한도로 일부 보상 제한':''}`
}
export type {Move}
