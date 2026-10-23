import {newTreasures,regionTreasures} from './catalog.ts'
// Explicit allowlist: artifacts, seeds and all other treasures remain collection-only.
export const gemById:Record<string,{name:string;color:string}>=Object.fromEntries([
 ...newTreasures,...regionTreasures.filter(i=>i.regionId!=='temple'),
 {id:'pearl',name:'분홍 진주',color:'#f4cfdf'},
 {id:'crystal',name:'맑은 수정',color:'#b3dbe9'},
 {id:'forest-gem',name:'숲의 보석',color:'#93cda6'},
].map(i=>[i.id,{name:i.name,color:i.color}]))
export const isGem=(id:string)=>Object.hasOwn(gemById,id)
