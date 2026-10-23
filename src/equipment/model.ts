import type {Save} from '../game.ts'
import type {Rarity} from '../progression/config.ts'
import {equipmentById,equipmentCatalog,equipmentOdds} from './catalog.ts'
import type {GearBonus} from './catalog.ts'
export type GearInstance={id:string;itemId:string;regionId:string;foundAt:number;equippedBy?:string}
export type GearState={version:1;instances:GearInstance[]}
export type GearCommand={type:'equip';friendId:string;instanceId:string}|{type:'unequip';friendId:string;instanceId:string}
export function equipment(s:Save):GearState{return s.world!.equipment??={version:1,instances:[]}}
export function gearBonus(s:Save,friendId:string):GearBonus{
 const sum={time:0,coins:0,rare:0}
 for(const instance of s.world?.equipment?.instances??[])if(instance.equippedBy===friendId){const b=equipmentById[instance.itemId].bonus;sum.time+=b.time;sum.coins+=b.coins;sum.rare+=b.rare}
 return {time:Math.min(.35,sum.time),coins:Math.min(.80,sum.coins),rare:Math.min(8,sum.rare)}
}
export function bonusWeights(weights:Record<Rarity,number>,rare:number):Record<Rarity,number>{
 const extra=Math.max(0,Math.min(8,rare,weights.common+weights.uncommon)),low=weights.common+weights.uncommon
 const common=low?weights.common*(low-extra)/low:0
 return {common,uncommon:low-extra-common,rare:weights.rare+extra,legendary:weights.legendary}
}
export function drawEquipment(regionId:string,random:()=>number):string|undefined{
 const odds=equipmentOdds[regionId]
 if(!odds||random()>=odds.chance)return undefined
 const value=random()*100;let sum=0
 for(const [rarity,weight] of Object.entries(odds.weights)){sum+=weight;if(value<sum)return equipmentCatalog.find(i=>i.regionId===regionId&&i.rarity===rarity)!.id}
 return equipmentCatalog.find(i=>i.regionId===regionId&&i.rarity==='legendary')!.id
}
export function gearCommand(s:Save,c:GearCommand){
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
