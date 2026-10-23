import type {GearState, GearInstance} from './model.ts'
import {equipmentById} from './catalog.ts'
export function migrateEquipment(raw:unknown,friendIds?:string[]):GearState|undefined{
 if(raw===undefined)return undefined
 const r=raw as GearState
 if(!r||r.version!==1||!Array.isArray(r.instances)||r.instances.length>10000)throw Error('장비 저장 형식을 확인해 주세요.')
 const ids=new Set<string>(),slots=new Set<string>()
 const instances=r.instances.map((v):GearInstance=>{
  const d=typeof v?.itemId==='string'&&Object.hasOwn(equipmentById,v.itemId)?equipmentById[v.itemId]:undefined
  if(!d||typeof v.id!=='string'||!v.id.length||v.id.length>100||ids.has(v.id)||v.regionId!==d.regionId||!Number.isSafeInteger(v.foundAt)||v.foundAt<0)throw Error('장비 개체 기록이 올바르지 않아요.')
  ids.add(v.id)
  if(v.equippedBy!==undefined){
   if(typeof v.equippedBy!=='string'||(friendIds&&!friendIds.includes(v.equippedBy))||slots.has(`${v.equippedBy}:${d.slot}`))throw Error('장비 착용 기록이 중복되거나 올바르지 않아요.')
   slots.add(`${v.equippedBy}:${d.slot}`)
  }
  return {id:v.id,itemId:v.itemId,regionId:v.regionId,foundAt:v.foundAt,...(v.equippedBy!==undefined?{equippedBy:v.equippedBy}:{})}
 })
 return {version:1,instances}
}
