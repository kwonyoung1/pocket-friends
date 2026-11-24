import {arenaGrowth,growArena,arenaXpNeed} from './season2.ts'
import type {Save} from '../game.ts'
import {world,transact} from '../progression/model.ts'
import {addBeastXp} from './beast-state.ts'
import type {ArenaAccount} from './beast-state.ts'
import {heroById} from './characters.ts'
import {trainingPrice,skillPrice,COMMAND_PRICES,scrollById} from './shop-state.ts'
import type {ArenaShop,ShopCommand,ScrollId} from './shop-state.ts'
export function shopOf(a:ArenaAccount):ArenaShop{return a.shop??={training:{},skills:{},command:0,scrolls:{}}}
export function targetOwned(save:Save,a:ArenaAccount,id:string){const adventurer=a.adventurers?.[id],b=a.beasts[id],f=save.friends.find(f=>f.id===id),h=heroById(id,f?.kind);if(!h||h.beast&&!b||h.adventurer&&!adventurer||!h.beast&&!h.adventurer&&!f)throw Error('보유한 캐릭터만 선택해 주세요.');const g=adventurer??b??arenaGrowth(a,id);return{beast:b,adventurer,friend:f,hero:h,level:g.level,xp:g.xp}}
export function xpPreview(level:number,xp:number,amount:number,_beast:boolean){let next=level,rest=xp+amount;while(next<50&&rest>=arenaXpNeed(next)){rest-=arenaXpNeed(next);next++}return{level:next,xp:next===50?0:rest}}
export function xpToMax(level:number,xp:number,_beast:boolean){let sum=-xp;for(let n=level;n<50;n++)sum+=arenaXpNeed(n);return Math.max(0,sum)}
export function scrollIssue(level:number,xp:number,id:ScrollId,quantity:number,beast:boolean){const item=scrollById(id)!;if(level>=50)return '이미 최고 레벨이에요.';if(quantity>Math.max(1,Math.ceil(xpToMax(level,xp,beast)/item.xp)))return '최고 레벨까지 필요한 수량 이하로 선택해 주세요.';return ''}
export function shopCommand(save:Save,a:ArenaAccount,c:ShopCommand,now:number){const s=shopOf(a),w=world(save,now);const charge=(price:number,label:string)=>{if(w.coins<price)throw Error('보유 코인이 부족해요.');if(!transact(w,-price,label,now))throw Error('구매를 안전하게 처리하지 못했어요.')}
 if(c.item==='command'){if(s.command!==c.expected)throw Error('최신 지휘력 단계를 확인해 주세요.');if(s.command>=3)throw Error('지휘력은 최고 단계예요.');const requires=s.command===1?'2-1':s.command===2?'3-1':undefined;if(requires&&!a.cleared[requires])throw Error(`${requires} 스테이지 클리어가 필요해요.`);charge(COMMAND_PRICES[s.command],'아레나 지휘력 강화');s.command++;return `지휘력 +${s.command} · 상점 최대 COST ${10+s.command}`}
 if(c.item==='scroll-buy'){const item=scrollById(c.scrollId)!;if((s.scrolls[item.id]??0)+c.quantity>9999)throw Error('주문서 보관 한도를 확인해 주세요.');charge(item.price*c.quantity,item.name+' 구매');s.scrolls[item.id]=(s.scrolls[item.id]??0)+c.quantity;return `${item.name} ${c.quantity}개 구매 완료`}
 const target=targetOwned(save,a,c.friendId)
 if(c.item==='training'){const row=s.training[c.friendId]??{hp:0,atk:0,def:0};if(row[c.stat]!==c.expected)throw Error('최신 훈련 단계를 확인해 주세요.');if(row[c.stat]>=30)throw Error('훈련은 최대 +30이에요.');charge(trainingPrice(row[c.stat]),'아레나 '+target.hero.name+' '+c.stat+' 훈련');row[c.stat]++;s.training[c.friendId]=row;return `${target.hero.name} ${c.stat.toUpperCase()} +${row[c.stat]} 훈련 완료`}
 if(c.item==='skill'){const skill=target.hero.skills.find(k=>k.id===c.skillId);if(!skill||target.level<skill.unlock)throw Error('해금한 스킬만 강화할 수 있어요.');const row=s.skills[c.friendId]??{},step=row[c.skillId]??0;if(step!==c.expected)throw Error('최신 스킬 강화 단계를 확인해 주세요.');if(step>=10)throw Error('스킬은 최대 +10이에요.');charge(skillPrice(step),'아레나 '+skill.name+' 강화');row[c.skillId]=step+1;s.skills[c.friendId]=row;return `${skill.name} +${step+1} 강화 완료`}
 const item=scrollById(c.scrollId)!,issue=scrollIssue(target.level,target.xp,item.id,c.quantity,!!target.beast);if(issue)throw Error(issue);if((s.scrolls[item.id]??0)<c.quantity)throw Error('보유한 주문서가 부족해요.');if(target.beast)addBeastXp(target.beast,item.xp*c.quantity);else growArena(target.adventurer??arenaGrowth(a,c.friendId),item.xp*c.quantity);s.scrolls[item.id]=(s.scrolls[item.id]??0)-c.quantity;return `${target.hero.name} 경험치 ${item.xp*c.quantity} 적용 완료`
}
