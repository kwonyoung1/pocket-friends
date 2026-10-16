import type {Save} from '../game.ts'
import {scaledPoint,room} from './config.ts'
import {cells,validPosition} from '../navigation.ts'
import {furnitureObstacles,validLayout} from '../expansion/model.ts'
/** Run once, on a copy before committing. Never reconstruct IDs, inventory or economies. */
export function upgradeRoom(s:Save){
 const w=s.world;if(!w||w.roomVersion===1)return false
 for(const f of s.friends){Object.assign(f,scaledPoint(f));f.route=[];f.moving=false;delete f.interaction}
 const e=w.expansion
 if(e){
  const placed=e.placements.map(p=>({...p,...scaledPoint(p)}));e.placements=[]
  for(const p of placed){
   if(!validLayout(s,p.itemId,p)){
    const candidates=cells.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)),safe=candidates.find(c=>validLayout(s,p.itemId,c))
    if(!safe)throw Error('기존 가구를 안전하게 변환하지 못했어요. 원본을 보존하고 업데이트를 중단했어요.')
    p.x=safe.x;p.y=safe.y
   }
   e.placements.push(p)
  }
  for(const h of e.hamsters)Object.assign(h,validPosition(scaledPoint(h),furnitureObstacles(s)))
 }
 for(const f of s.friends)Object.assign(f,validPosition(f,furnitureObstacles(s)))
 w.roomVersion=1
 return true
}
export const roomArea=(room.maxX-room.minX)*(room.maxY-room.minY)
