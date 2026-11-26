import {stageTerms} from './balance.ts'
import type {Element,Style,Effect} from './types.ts'
export type RegionId='forest'|'lake'|'cave'|'ruins'|'canyon'|'snow'|'shadow'|'sanctuary'|'eclipse'|'heaven'|'christmas'|'garden'|'dream'|'skycastle'|'star-temple'
export type Monster={id:string;name:string;region:RegionId;row:number;rank:'normal'|'elite'|'boss';element:Element;weakness:Element[];hp:number;atk:number;def:number;spd:number;pattern:('attack'|'shield'|'heal'|'area'|'debuff'|'summon')[];style:Style;effects?:Effect[];toughness:number}
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
 {id:'eclipse',name:'그림자 성채',subtitle:'저주와 치유를 끊는 월식의 성',element:'dark',lootRegion:'sanctuary',monsters:['moon-moth','curse-priest','void-knight','eclipse-king']},
 {id:'heaven',name:'천상의 문',subtitle:'결계와 격노를 넘어 천상의 지휘 인장을',element:'light',lootRegion:'sanctuary',monsters:['heaven-orb','gate-chanter','dawn-knight','heaven-judge']},
 {id:'garden',name:'별의 정원',subtitle:'별꽃의 치유와 광합성 결계를 끊으세요',element:'nature',lootRegion:'garden',monsters:['star-bud','crystal-dryad','comet-mantis','garden-keeper']},
 {id:'dream',name:'꿈의 미궁',subtitle:'환영의 감속과 악몽의 예고를 해제하세요',element:'dark',lootRegion:'temple',monsters:['dream-jelly','mirror-healer','labyrinth-rook','nightmare-mage']},
 {id:'skycastle',name:'천공의 성',subtitle:'돌격 기사와 왕의 방벽을 격파하세요',element:'light',lootRegion:'sanctuary',monsters:['cloud-griffin','wind-bard','sky-lancer','sky-sovereign']},
 {id:'star-temple',name:'잊혀진 별의 신전',subtitle:'별자리 봉인과 심판의 순환',element:'earth',lootRegion:'sanctuary',monsters:['orbit-eye','astral-oracle','zodiac-sentinel','star-arbiter']},
]
export const EVENT_REGION:Region={id:'christmas',name:'겨울밤의 선물',subtitle:'눈 내리는 마을과 장난꾸러기 크람푸스',element:'water',lootRegion:'forest',monsters:['snow-slime','gift-mimic','snow-trickster','gift-thief']}
const names:Record<RegionId,[string,string,string,string]>= {
 garden:['별꽃 봉오리','수정 드리아드','혜성 사마귀','별의 정원지기'],dream:['꿈방울 해파리','거울 치유사','미궁의 룩','악몽의 마법사'],skycastle:['구름 그리핀','바람 음유시인','천공 창기사','천공의 수호왕'],'star-temple':['궤도의 눈','별의 예언자','황도 파수병','별의 심판자'],
 eclipse:['월식 나방','저주의 사제','공허 기사','월식의 군주'],heaven:['천상의 구슬','문지기의 성가','새벽 기사','천상의 심판자'],christmas:['눈송이 슬라임','선물상자 미믹','장난꾸러기 눈사람','선물 도둑 크람푸스'],
 forest:['이슬 슬라임','가시 요정','독버섯 정예','숲의 수호자'],lake:['물방울 정령','연꽃 치유사','파도의 기사','안개의 이무기'],cave:['수정 벌레','석영 껍질','프리즘 골렘','수정 거신'],ruins:['룬 풍뎅이','모래 사제','유적 파수병','고대 수호자'],canyon:['불꽃 정령','현무암 도깨비','용암 기사','협곡의 불꽃왕'],snow:['서리 슬라임','눈꽃 부엉이','얼음 골렘','오로라 사슴'],shadow:['그림자 고양이','밤의 등불','환영 기사','밤의 늑대'],sanctuary:['별빛 조각','성역 사제','일식 파수병','월광 비스트'],
}
const weaknesses:Record<RegionId,Element[]>={garden:['fire','dark'],dream:['light','nature'],skycastle:['dark','water'],'star-temple':['nature','water'],eclipse:['light','fire'],heaven:['dark','earth'],christmas:['fire','light'],forest:['fire','dark'],lake:['nature','earth'],cave:['water','nature'],ruins:['dark','water'],canyon:['water','earth'],snow:['fire','light'],shadow:['light','nature'],sanctuary:['dark','earth']}
const regionEffects:Record<RegionId,Effect[]>={
 garden:[{type:'poison',turns:2,power:.04},{type:'defense-down',turns:2,power:.2}],dream:[{type:'slow',turns:2,power:.25},{type:'stun',turns:1,power:0,chance:.5}],skycastle:[{type:'bleed',turns:2,power:.04},{type:'evasion-down',turns:2,power:.2}],'star-temple':[{type:'burn',turns:2,power:.04},{type:'defense-down',turns:2,power:.3}],
 eclipse:[{type:'defense-down',turns:2,power:.3},{type:'poison',turns:2,power:.04}],heaven:[{type:'slow',turns:2,power:.25},{type:'stun',turns:1,power:0}],christmas:[{type:'slow',turns:2,power:.2}],
 forest:[{type:'poison',turns:2,power:.04}],lake:[{type:'slow',turns:2,power:.15}],cave:[{type:'defense-down',turns:2,power:.2}],ruins:[{type:'stun',turns:1,power:0},{type:'poison',turns:2,power:.04}],canyon:[{type:'burn',turns:2,power:.05}],snow:[{type:'freeze',turns:1,power:0},{type:'slow',turns:2,power:.2}],shadow:[{type:'poison',turns:3,power:.04},{type:'defense-down',turns:2,power:.2}],sanctuary:[{type:'slow',turns:2,power:.2},{type:'defense-down',turns:2,power:.2}],
}
const regularMonsters:Monster[]=REGIONS.flatMap((r,index)=>r.monsters.map((id,row)=>({
 id,name:names[r.id][row],region:r.id,row,rank:row===3?'boss':row===2?'elite':'normal',element:row===1&&r.id==='sanctuary'?'water':r.element,weakness:row===1?[weaknesses[r.id][1],'fire' as const]:weaknesses[r.id],hp:Math.round(([82,98,185,470][row])*(1+index*.055)),atk:Math.round(([15,14,25,36][row])*(1+index*.035)),def:[6,11,18,20][row]+index,spd:[12,14,18,11][row]+Math.floor(index/2),toughness:(row===3?5:row===2?3:2)+(index>=4?1:0),style:(r.id==='garden'?'root':r.id==='dream'?'shadow':r.id==='skycastle'?'dash':r.id==='star-temple'?'orb':r.id==='snow'?'frost':r.id==='canyon'?'fire':r.id==='lake'?'water':r.id==='shadow'?'shadow':row===3?'slam':'orb') as Style,
 pattern:row===3&&r.id==='garden'?['heal','shield','area','debuff']:row===3&&r.id==='dream'?['debuff','attack','area','shield']:row===3&&r.id==='skycastle'?['shield','attack','area','attack']:row===3&&r.id==='star-temple'?['debuff','shield','area','attack']:row===1&&r.id==='cave'?(['shield','attack','debuff'] as Monster['pattern']):row===0&&r.id==='canyon'?(['attack','area','attack'] as Monster['pattern']):row===3?(['shield','attack','area','debuff'] as Monster['pattern']):row===1?(['heal','attack','shield'] as Monster['pattern']):row===2?(['debuff','attack','area'] as Monster['pattern']):(['attack','attack','debuff'] as Monster['pattern']),effects:row>=2?regionEffects[r.id]:row===0?[regionEffects[r.id][0]]:[],
})))
export const EVENT_MONSTERS:Monster[]=[
 {id:'snow-slime',name:'눈송이 슬라임',region:'christmas',row:0,rank:'normal',element:'water',weakness:['fire','light'],hp:100,atk:18,def:8,spd:12,pattern:['attack','debuff'],style:'frost',toughness:2,effects:[{type:'slow',turns:2,power:.15}]},
 {id:'gift-mimic',name:'선물상자 미믹',region:'christmas',row:1,rank:'normal',element:'earth',weakness:['water','dark'],hp:140,atk:23,def:12,spd:15,pattern:['attack','shield','attack'],style:'slam',toughness:2},
 {id:'snow-trickster',name:'장난꾸러기 눈사람',region:'christmas',row:2,rank:'elite',element:'water',weakness:['fire','nature'],hp:190,atk:22,def:11,spd:16,pattern:['debuff','heal','attack'],style:'frost',toughness:3,effects:[{type:'slow',turns:2,power:.2}]},
 {id:'ice-reindeer',name:'얼음 순록',region:'christmas',row:3,rank:'elite',element:'nature',weakness:['fire','dark'],hp:210,atk:27,def:13,spd:20,pattern:['attack','area','debuff'],style:'dash',toughness:3,effects:[{type:'defense-down',turns:2,power:.2}]},
 {id:'gift-thief',name:'선물 도둑 크람푸스',region:'christmas',row:4,rank:'boss',element:'dark',weakness:['light','fire'],hp:640,atk:38,def:18,spd:13,pattern:['shield','summon','area','debuff'],style:'frost',toughness:6,effects:[{type:'slow',turns:2,power:.2}]},
]
const sovereigns:Monster[]=REGIONS.slice(3,10).map((r,i)=>{const original=regularMonsters.find(m=>m.id===r.monsters[3])!;return{...original,id:r.id+'-sovereign',name:['봉인의 거신','용암의 심장','빙관의 수호자','영야의 늑대왕','성계의 문지기','월식의 대군주','여명의 재판관'][i],hp:Math.round(original.hp*1.15),pattern:i%3===0?['shield','debuff','area','attack']:i%3===1?['debuff','attack','area','shield']:['attack','heal','area','debuff']}})
export const MONSTERS:Monster[]=[...regularMonsters,...sovereigns,...EVENT_MONSTERS]
const monstersById=new Map(MONSTERS.map(m=>[m.id,m]))
export const monsterById=(id:string)=>monstersById.get(id)
export type Stage={id:string;index:number;region:RegionId;number:number;name:string;level:number;boss:boolean;midBoss?:boolean;chapter?:number;waves:string[][];requires?:string;first:{coins:number;xp:number;stones:number;treasure:boolean};repeat:{coins:number;xp:number};energy:number;event?:string}
export const STAGES:Stage[]=REGIONS.flatMap((r,ri)=>Array.from({length:ri<3?5:10},(_,si)=>{
 const index=ri<3?ri*5+si:15+(ri-3)*10+si,id=`${ri+1}-${si+1}`,[a,b,e,mid]=r.monsters,boss=ri<3?si===4:si===9,midBoss=ri>=3&&si===4
 const final=ri>=3&&ri<10?r.id+'-sovereign':mid
 const waves=si===9?[[e,b],[a,e],[final,b]]:si===4?[[a,b],[ri>=10?e:mid,b]]:si===8?[[e,a],[b,e]]:si===7?[[e,e,b]]:si===6?[[e,b,e]]:si===5?[[a,b],[e,a]]:si===0?[[a,...(ri?[b]:[])]]:si===1?[[a,a]]:si===2?[[e,b]]:[[b,e,a]]
 const oldIndex=ri*5+Math.min(si,4)
 return{id,index,chapter:ri+1,region:r.id,number:si+1,name:`${r.name} ${id}`,level:index<15?[1,1,2,5,7,10,14,17,20,23,26,29,32,35,35][index]:Math.min(50,35+Math.floor((index-14)/5)),boss,midBoss,waves,requires:index?`${si?ri+1:ri}-${si||(ri<=3?5:10)}`:undefined,...stageTerms(index,boss||midBoss,Math.min(49,oldIndex))}
}))
/** Freeze only chapter access earned before expansion; never fabricate clears/reward records. */
export function legacyChapterAccess(cleared:Readonly<Record<string,unknown>>){let access=1;for(const id of Object.keys(cleared)){const match=/^(\d+)-([1-5])$/.exec(id);if(match&&Number(match[1])<=10)access=Math.max(access,Number(match[1])+(match[2]==='5'?1:0))}return Math.min(REGIONS.length,access)}

export const EVENT_STAGES:Stage[]=[{id:'xmas-2026',event:'winter-2026',index:14,region:'christmas',number:1,name:'겨울밤의 선물',level:25,boss:true,waves:[['snow-slime','gift-mimic','snow-trickster'],['gift-thief','ice-reindeer']],first:{coins:30,xp:12,stones:0,treasure:false},repeat:{coins:10,xp:5},energy:10}]
export const stageById=(id:string)=>[...STAGES,...EVENT_STAGES].find(s=>s.id===id)
export const regionById=(id:RegionId)=>[...REGIONS,EVENT_REGION].find(r=>r.id===id)!
export const stageUnlocked=(id:string,cleared:Readonly<Record<string,unknown>>={},chapterAccess=1)=>{const s=stageById(id);return !!s&&(Object.hasOwn(cleared,id)||!s.requires||Object.hasOwn(cleared,s.requires)||s.number===1&&(s.chapter??1)<=chapterAccess)}
