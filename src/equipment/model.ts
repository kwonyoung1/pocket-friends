import {enhancementMultiplier,enhancementLevel,enhancementOffer} from './enhancement.ts'
import {transact,world} from '../progression/model.ts'
import type {Save} from '../game.ts'
import type {Rarity} from '../progression/config.ts'
import {equipmentById,equipmentCatalog,equipmentOdds} from './catalog.ts'
import type {GearBonus} from './catalog.ts'
export type GearInstance={id:string;itemId:string;regionId:string;foundAt:number;equippedBy?:string;enhancement?:number;failures?:number}
export type EnhancementRecord={id:string;instanceId:string;target:number;success:boolean;chance:number;coins:number;stones:number;at:number}
export type GearState={version:1;instances:GearInstance[];stones?:number;enhancementHistory?:EnhancementRecord[]}
export type GearCommand={type:'enhance';instanceId:string}|{type:'equip';friendId:string;instanceId:string}|{type:'unequip';friendId:string;instanceId:string}
export function equipment(s:Save):GearState{return s.world!.equipment??={version:1,instances:[]}}
export function gearBonus(s:Save,friendId:string):GearBonus{
 const sum={time:0,coins:0,rare:0}
 for(const instance of s.world?.equipment?.instances??[])if(instance.equippedBy===friendId){const b=instanceBonus(instance);sum.time+=b.time;sum.coins+=b.coins;sum.rare+=b.rare}
 return {time:Math.min(.5,sum.time),coins:Math.min(1.5,sum.coins),rare:Math.min(12,sum.rare)}
}
export function instanceBonus(instance:GearInstance):GearBonus{const b=equipmentById[instance.itemId].bonus,m=enhancementMultiplier(enhancementLevel(instance));return {time:Number((b.time*m).toFixed(6)),coins:Number((b.coins*m).toFixed(6)),rare:Number((b.rare*m).toFixed(6))}}
export function bonusWeights(weights:Record<Rarity,number>,rare:number):Record<Rarity,number>{
 const low=weights.common+weights.uncommon,extra=Math.max(0,Math.min(12,rare,low)),legendary=weights.legendary>0?extra*.2:0,common=low?weights.common*(low-extra)/low:0
 return {common,uncommon:low-extra-common,rare:weights.rare+extra-legendary,legendary:weights.legendary+legendary}
}
export function drawEquipment(regionId:string,random:()=>number):string|undefined{
 const odds=equipmentOdds[regionId]
 if(!odds||random()>=odds.chance)return undefined
 const value=random()*100;let sum=0
 for(const [rarity,weight] of Object.entries(odds.weights)){sum+=weight;if(value<sum)return equipmentCatalog.find(i=>i.regionId===regionId&&i.rarity===rarity)!.id}
 return equipmentCatalog.find(i=>i.regionId===regionId&&i.rarity==='legendary')!.id
}
export function gearCommand(s:Save,c:GearCommand,now=Date.now(),random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
 if(c.type==='enhance'){
  const state=equipment(s),instance=state.instances.find(i=>i.id===c.instanceId)
  if(!instance)throw Error('보유한 장비를 선택해 주세요.')
  const offer=enhancementOffer(instance);if(!offer)throw Error('이미 최고 +30강 장비예요.')
  const w=world(s,now);if(w.coins<offer.coins)throw Error('강화할 코인이 부족해요.')
  if((state.stones??0)<offer.stones)throw Error('강화석이 부족해요. +21부터 강화석이 필요해요.')
  const success=random()*100<offer.finalChance
  if(!transact(w,-offer.coins,`${equipmentById[instance.itemId].name} +${offer.target} 강화`,now))throw Error('강화 비용을 확인해 주세요.')
  if(offer.stones)state.stones=(state.stones??0)-offer.stones
  instance.enhancement=success?offer.target:enhancementLevel(instance);instance.failures=success?0:(instance.failures??0)+1
  state.enhancementHistory=[{id:crypto.randomUUID(),instanceId:instance.id,target:offer.target,success,chance:offer.finalChance,coins:offer.coins,stones:offer.stones,at:now},...(state.enhancementHistory??[])].slice(0,100)
  return success?`강화 성공! ${equipmentById[instance.itemId].name} +${instance.enhancement}`:`강화 실패 · +${instance.enhancement} 유지 · 다음 성공 확률 ${enhancementOffer(instance)!.finalChance}%`
 }

 const f=s.friends.find(f=>f.id===c.friendId),instance=equipment(s).instances.find(i=>i.id===c.instanceId)
 if(!f||!instance)throw Error('보유한 장비와 친구를 선택해 주세요.')
 if(c.type==='unequip'){
  if(instance.equippedBy!==f.id)throw Error('이 친구가 착용한 장비가 아니에요.')
  delete instance.equippedBy;return `${f.name}의 장비를 해제했어요.`
 }
 if(instance.equippedBy)throw Error('이미 착용 중인 장비예요. 먼저 해제해 주세요.')
 const slot=equipmentById[instance.itemId].slot
 if(equipment(s).instances.some(i=>i.equippedBy===f.id&&equipmentById[i.itemId].slot===slot))throw Error('같은 슬롯의 장비를 먼저 해제해 주세요.')
 instance.equippedBy=f.id
 return `${f.name}에게 ${equipmentById[instance.itemId].name} 착용! 진행 중인 탐험은 바뀌지 않아요.`
}
