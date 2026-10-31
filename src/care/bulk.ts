import {care} from '../game.ts'
import type {Save,Friend} from '../game.ts'
import {busyLife,bathStatus,lifeCommand} from '../expansion/model.ts'
import {petRewardRemaining} from '../interaction.ts'
import {useItem,world} from '../progression/model.ts'
import {itemById} from '../progression/config.ts'
export type BulkCommand={type:'care-play-all'}|{type:'care-wash-all'}|{type:'care-feed-all';id:string}
export type BulkReport={total:number;success:number;cooldown:number;daily:number;busy:number;shortage:number;failed:number;ids:string[];message:string}
export function bulkReason(f:Friend,type:BulkCommand['type'],now:number,held=false){if(type==='care-wash-all'&&bathStatus(f,now).full)return 'daily';if(type==='care-wash-all'&&f.life?.bath)return 'cooldown';if(held||f.growth?.awayJobId||busyLife(f,now)||f.interaction?.gesture)return 'busy';if(type==='care-play-all'&&petRewardRemaining(f,now)>0||type==='care-feed-all'&&now<(f.growth?.rewardAfter.feed??0))return 'cooldown';return null}
export function bulkCare(save:Save,c:BulkCommand,now:number,held:Record<string,unknown>={}):BulkReport{const w=world(save,now),r:BulkReport={total:save.friends.length,success:0,cooldown:0,daily:0,busy:0,shortage:0,failed:0,ids:[],message:''};if(c.type==='care-feed-all'&&itemById[c.id]?.category!=='food')throw Error('보유한 음식을 선택해 주세요.');const globalCooldown=c.type==='care-feed-all'&&now<w.useAfter
 for(const f of save.friends){const reason=bulkReason(f,c.type,now,!!held[f.id]);if(reason){r[reason]++;continue}if(globalCooldown){r.cooldown++;continue}if(c.type==='care-feed-all'&&!(w.inventory[c.id]>0)){r.shortage++;continue}
  let success=false
  if(c.type==='care-play-all'){const before=f.lastPetRewardAt;care(f,'pet',now);success=f.lastPetRewardAt!==before;if(r.success>=6)delete f.interaction}
  else if(c.type==='care-wash-all'){lifeCommand(save,{type:'bath',friendId:f.id},now);success=f.life?.bath?.startedAt===now}
  else{const count=w.inventory[c.id];useItem(save,c.id,f.id,now,true);success=w.inventory[c.id]===count-1}
  if(success){r.success++;r.ids.push(f.id)}else r.failed++
 }
 const label=c.type==='care-play-all'?'놀아주기':c.type==='care-wash-all'?'씻기':`${itemById[c.id].name} 먹이주기`;r.message=`일괄 ${label} · 총 ${r.total}명 중 ${r.success}명 완료 · 쿨타임 ${r.cooldown}명 · 일일 제한 ${r.daily}명 · 외출·수면·교감 ${r.busy}명 · 음식 부족 ${r.shortage}명 · 실패 ${r.failed}명`;return r}
