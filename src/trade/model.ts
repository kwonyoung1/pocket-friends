import type {Save} from '../game.ts'
import {world,transact,growth} from '../progression/model.ts'
import {itemById,shopItems,salePrice,growthBalance} from '../progression/config.ts'
export const tradeLimits={quantity:10000,inventory:10000000,coins:1e12,lines:100,history:100}
export type TradeLine={id:string;quantity:number}
export type TradeCommand={type:'buy-many';id:string;quantity:number}|{type:'sell-many';lines:TradeLine[]}
export type TradeRecord={id:string;kind:'buy'|'sell';at:number;lines:TradeLine[];total:number}
export function quantity(n:unknown,max=tradeLimits.quantity):n is number{return Number.isSafeInteger(n)&&Number(n)>=1&&Number(n)<=max}
export function maxPurchase(s:Save,id:string){const w=world(s),i=shopItems.find(i=>i.id===id);return i?Math.max(0,Math.min(tradeLimits.quantity,Math.floor(w.coins/i.price),tradeLimits.inventory-(w.inventory[id]??0))):0}
export function trade(s:Save,c:TradeCommand,now:number){
 const w=world(s,now)
 if(now<w.buyAfter)throw Error('거래 중이에요. 잠깐 기다려 주세요.')
 let total=0,lines:TradeLine[],kind:'buy'|'sell'
 if(c.type==='buy-many'){
  const item=shopItems.find(i=>i.id===c.id)
  if(!item||!quantity(c.quantity))throw Error('구매할 상품과 1~10,000 사이의 정수 수량을 확인해 주세요.')
  if(Math.max(...s.friends.map(f=>growth(f).level))<item.minLevel)throw Error(`친구 레벨 ${item.minLevel}부터 살 수 있어요.`)
  if(c.quantity>maxPurchase(s,c.id))throw Error('코인이 부족하거나 최대 보유 수량을 초과했어요.')
  total=item.price*c.quantity;lines=[{id:c.id,quantity:c.quantity}];kind='buy'
 }else{
  if(!Array.isArray(c.lines)||!c.lines.length||c.lines.length>tradeLimits.lines||new Set(c.lines.map(l=>l.id)).size!==c.lines.length)throw Error('판매할 항목을 중복 없이 선택해 주세요.')
  lines=c.lines.map(l=>({id:l.id,quantity:l.quantity}));kind='sell'
  for(const line of lines){const item=itemById[line.id];if(!item?.sellable||!quantity(line.quantity,tradeLimits.inventory)||(w.inventory[line.id]??0)<line.quantity)throw Error('판매 불가 항목이나 보유량을 초과한 수량이 있어 전체 판매를 취소했어요. 배치 가구는 회수 후 판매해 주세요.');total+=salePrice(item)*line.quantity}
 }
 if(!Number.isSafeInteger(total)||!Number.isSafeInteger(w.coins+(kind==='buy'?-total:total))||w.coins+(kind==='buy'?-total:total)>tradeLimits.coins)throw Error('거래 금액이 허용 범위를 초과했어요.')
 const description=kind==='buy'?`${itemById[lines[0].id].name} ${lines[0].quantity}개 구매`:`일괄 판매 ${lines.length}종 · ${lines.reduce((n,l)=>n+l.quantity,0)}개`
 if(!transact(w,kind==='buy'?-total:total,description,now))throw Error('잔액을 확인해 주세요.')
 for(const l of lines){w.inventory[l.id]=(w.inventory[l.id]??0)+(kind==='buy'?l.quantity:-l.quantity);if(kind==='buy'){const old=w.book[l.id];w.book[l.id]={firstAt:old?.firstAt??now,lastAt:now,count:(old?.count??0)+l.quantity}}}
 w.buyAfter=now+growthBalance.purchaseCooldownMs
 w.trades=[{id:crypto.randomUUID(),kind,at:now,lines,total},...(w.trades??[])].slice(0,tradeLimits.history)
 return kind==='buy'?`${itemById[lines[0].id].name} ${lines[0].quantity}개를 구매했습니다. ${total.toLocaleString()}코인이 사용되었습니다. 남은 코인: ${w.coins.toLocaleString()}코인`:`${lines.length}종 ${lines.reduce((n,l)=>n+l.quantity,0)}개를 판매했습니다. ${total.toLocaleString()}코인을 받았어요.`
}
