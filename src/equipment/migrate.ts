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
  for(const [n,max] of [[v.enhancement,30],[v.failures,1000000]])if(n!==undefined&&(!Number.isSafeInteger(n)||n<0||n>max!))throw Error('강화 기록이 올바르지 않아요.')
  return {id:v.id,itemId:v.itemId,regionId:v.regionId,foundAt:v.foundAt,...(v.enhancement!==undefined?{enhancement:v.enhancement}:{}),...(v.failures!==undefined?{failures:v.failures}:{}),...(v.equippedBy!==undefined?{equippedBy:v.equippedBy}:{})}
 })
 if(r.stones!==undefined&&(!Number.isSafeInteger(r.stones)||r.stones<0||r.stones>10000000))throw Error('강화석 기록이 올바르지 않아요.')
 if(r.enhancementHistory!==undefined&&(!Array.isArray(r.enhancementHistory)||r.enhancementHistory.length>100||r.enhancementHistory.some(e=>!e||typeof e.id!=='string'||typeof e.instanceId!=='string'||!Number.isInteger(e.target)||e.target<1||e.target>30||typeof e.success!=='boolean'||!Number.isFinite(e.chance)||e.chance<0||e.chance>100||[e.coins,e.stones,e.at].some(n=>!Number.isSafeInteger(n)||n<0))))throw Error('강화 이력이 올바르지 않아요.')
 return {version:1,instances,...(r.stones!==undefined?{stones:r.stones}:{}),...(r.enhancementHistory!==undefined?{enhancementHistory:structuredClone(r.enhancementHistory)}:{})}
}
