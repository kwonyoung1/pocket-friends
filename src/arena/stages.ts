import {stageTerms} from './balance.ts'
import type {Element,Style,Effect} from './types.ts'
export type RegionId='forest'|'lake'|'cave'|'ruins'|'canyon'|'snow'|'shadow'|'sanctuary'
export type Monster={id:string;name:string;region:RegionId;row:number;rank:'normal'|'elite'|'boss';element:Element;weakness:Element[];hp:number;atk:number;def:number;spd:number;pattern:('attack'|'shield'|'heal'|'area'|'debuff')[];style:Style;effects?:Effect[];toughness:number}
export type Region={id:RegionId;name:string;subtitle:string;element:Element;lootRegion:string;monsters:[string,string,string,string]}
export const REGIONS:Region[]=[
 {id:'forest',name:'달빛 숲',subtitle:'새싹과 화염의 첫 모험',element:'nature',lootRegion:'forest',monsters:['dew','thornling','toxic-shroom','elder-tree']},
 {id:'lake',name:'안개 호수',subtitle:'치유의 물결을 먼저 끊으세요',element:'water',lootRegion:'beach',monsters:['droplet','lotus-healer','tide-knight','mist-serpent']},
 {id:'cave',name:'수정 동굴',subtitle:'단단한 결계와 약점 격파',element:'earth',lootRegion:'cave',monsters:['crystal-mite','quartz-shell','prism-golem','crystal-colossus']},
 {id:'ruins',name:'고대 유적',subtitle:'해독과 행동 지연의 시험',element:'earth',lootRegion:'temple',monsters:['rune-scarab','sand-priest','ruin-sentinel','ancient-warden']},
 {id:'canyon',name:'불꽃 협곡',subtitle:'광역 화염 앞에서 버티기',element:'fire',lootRegion:'mine',monsters:['ember-wisp','basalt-imp','lava-knight','magma-king']},
 {id:'snow',name:'얼어붙은 설원',subtitle:'느려진 발걸음과 서리 결계',element:'water',lootRegion:'cave',monsters:['frost-slime','snow-owl','ice-golem','aurora-stag']},
 {id:'shadow',name:'그림자 숲',subtitle:'독과 약화, 정화의 가치',element:'dark',lootRegion:'garden',monsters:['shade-cat','night-wisp','phantom-knight','nocturne-wolf']},
 {id:'sanctuary',name:'별빛 성역',subtitle:'서로 다른 속성을 잇는 마지막 전투',element:'light',lootRegion:'sanctuary',monsters:['star-mote','astral-priest','eclipse-sentinel','moon-beast']},
]
const names:Record<RegionId,[string,string,string,string]>= {
 forest:['이슬 슬라임','가시 요정','독버섯 정예','숲의 수호자'],lake:['물방울 정령','연꽃 치유사','파도의 기사','안개의 이무기'],cave:['수정 벌레','석영 껍질','프리즘 골렘','수정 거신'],ruins:['룬 풍뎅이','모래 사제','유적 파수병','고대 수호자'],canyon:['불꽃 정령','현무암 도깨비','용암 기사','협곡의 불꽃왕'],snow:['서리 슬라임','눈꽃 부엉이','얼음 골렘','오로라 사슴'],shadow:['그림자 고양이','밤의 등불','환영 기사','밤의 늑대'],sanctuary:['별빛 조각','성역 사제','일식 파수병','월광 비스트'],
}
const weaknesses:Record<RegionId,Element[]>={forest:['fire','dark'],lake:['nature','earth'],cave:['water','nature'],ruins:['dark','water'],canyon:['water','earth'],snow:['fire','light'],shadow:['light','nature'],sanctuary:['dark','earth']}
const regionEffects:Record<RegionId,Effect[]>={
 forest:[{type:'poison',turns:2,power:.04}],lake:[{type:'slow',turns:2,power:.15}],cave:[{type:'defense-down',turns:2,power:.2}],ruins:[{type:'stun',turns:1,power:0},{type:'poison',turns:2,power:.04}],canyon:[{type:'burn',turns:2,power:.05}],snow:[{type:'freeze',turns:1,power:0},{type:'slow',turns:2,power:.2}],shadow:[{type:'poison',turns:3,power:.04},{type:'defense-down',turns:2,power:.2}],sanctuary:[{type:'slow',turns:2,power:.2},{type:'defense-down',turns:2,power:.2}],
}
export const MONSTERS:Monster[]=REGIONS.flatMap((r,index)=>r.monsters.map((id,row)=>({
 id,name:names[r.id][row],region:r.id,row,rank:row===3?'boss':row===2?'elite':'normal',element:row===1&&r.id==='sanctuary'?'water':r.element,weakness:row===1?[weaknesses[r.id][1],'fire' as const]:weaknesses[r.id],hp:Math.round(([82,98,185,470][row])*(1+index*.055)),atk:Math.round(([15,14,25,36][row])*(1+index*.035)),def:[6,11,18,20][row]+index,spd:[12,14,18,11][row]+Math.floor(index/2),toughness:(row===3?5:row===2?3:2)+(index>=4?1:0),style:(r.id==='snow'?'frost':r.id==='canyon'?'fire':r.id==='lake'?'water':r.id==='shadow'?'shadow':row===3?'slam':'orb') as Style,
 pattern:row===1&&r.id==='cave'?(['shield','attack','debuff'] as Monster['pattern']):row===0&&r.id==='canyon'?(['attack','area','attack'] as Monster['pattern']):row===3?(['shield','attack','area','debuff'] as Monster['pattern']):row===1?(['heal','attack','shield'] as Monster['pattern']):row===2?(['debuff','attack','area'] as Monster['pattern']):(['attack','attack','debuff'] as Monster['pattern']),effects:row>=2?regionEffects[r.id]:row===0?[regionEffects[r.id][0]]:[],
})))
const monstersById=new Map(MONSTERS.map(m=>[m.id,m]))
export const monsterById=(id:string)=>monstersById.get(id)
export type Stage={id:string;index:number;region:RegionId;number:number;name:string;level:number;boss:boolean;waves:string[][];requires?:string;first:{coins:number;xp:number;stones:number;treasure:boolean};repeat:{coins:number;xp:number};energy:number}
export const STAGES:Stage[]=REGIONS.flatMap((r,ri)=>Array.from({length:5},(_,si)=>{const index=ri*5+si,id=`${ri+1}-${si+1}`,[a,b,e,boss]=r.monsters;return{id,index,region:r.id,number:si+1,name:`${r.name} ${ri+1}-${si+1}`,level:Math.min(50,1+index+Math.floor(index/7)),boss:si===4,waves:si===0?[[a,...(ri?[b]:[])]]:si===1?[[a,a]]:si===2?[[e,b]]:si===3?[[b,e,a]]:[[a,b],[boss,b]],requires:index?`${si?ri+1:ri}-${si||5}`:undefined,...stageTerms(index,si===4)}}))
export const stageById=(id:string)=>STAGES.find(s=>s.id===id)
export const regionById=(id:RegionId)=>REGIONS.find(r=>r.id===id)!
export const stageUnlocked=(id:string,cleared:Readonly<Record<string,unknown>>={})=>{const s=stageById(id);return !!s&&(!s.requires||Object.hasOwn(cleared,s.requires))}
