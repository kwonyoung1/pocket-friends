import {room,roomScale} from './config.ts'
import {isGem} from '../adventure/gems.ts'
import {furnitureInk,furnitureShape} from '../expansion/artConfig.ts'
import type {Placement} from '../expansion/model.ts'
import type {Point} from '../game.ts'
// RoomArt's wall/baseboard ends at y=199. Eight art units protect visible floor edges.
export const placementFloor={left:8*roomScale,right:992*roomScale,top:207*roomScale,bottom:632*roomScale,version:2 as const}
export const legacyPlacement={left:165*roomScale,right:910*roomScale,top:275*roomScale,bottom:530*roomScale}
export function placementVisualSize(itemId:string,custom?:Pick<Placement,'w'|'h'>){
 const large=['decor-3-0','decor-3-7'].includes(itemId),bed=itemId==='decor-2-7',gem=isGem(itemId)
 return {w:custom?.w??room.width*(gem?.0425:large?.125:bed?.13:.085),h:custom?.h??room.height*(gem?.08:large?.24:bed?.18:.16)}
}
export function placementOffsets(itemId:string,custom?:Pick<Placement,'w'|'h'>){
 const size=placementVisualSize(itemId,custom),gem=isGem(itemId),vbHeight=gem?100:110,scale=Math.min(size.w/100,size.h/vbHeight)
 const ink=gem?{left:10,top:4,right:90,bottom:89}:furnitureInk[furnitureShape(itemId)]
 const x=-size.w/2+(size.w-100*scale)/2,y=-size.h*.85+(size.h-vbHeight*scale)/2
 return {left:x+ink.left*scale,right:x+ink.right*scale,top:y+ink.top*scale,bottom:y+ink.bottom*scale}
}
export function placementRange(itemId:string,custom?:Pick<Placement,'w'|'h'>){
 const o=placementOffsets(itemId,custom)
 return {minX:placementFloor.left-o.left,maxX:placementFloor.right-o.right,minY:placementFloor.top-o.top,maxY:placementFloor.bottom-o.bottom}
}
export function withinPlacementFloor(itemId:string,p:Point,custom?:Pick<Placement,'w'|'h'>){
 const r=placementRange(itemId,custom)
 return Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=r.minX&&p.x<=r.maxX&&p.y>=r.minY&&p.y<=r.maxY
}
export function clampPlacement(itemId:string,p:Point,custom?:Pick<Placement,'w'|'h'>):Point{
 const r=placementRange(itemId,custom)
 return {x:Math.max(r.minX,Math.min(r.maxX,p.x)),y:Math.max(r.minY,Math.min(r.maxY,p.y))}
}
export function roomPointer(x:number,y:number,rect:{left:number;top:number;width:number;height:number}):Point{return {x:(x-rect.left)/rect.width*room.width,y:(y-rect.top)/rect.height*room.height}}
