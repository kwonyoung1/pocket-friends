import {BEASTS} from './beasts.ts'
import type {BaseDefinition,Definition,Element,Effect,Skill,Style} from './types.ts'
import type {Kind} from '../../game.ts'
const skill=(id:string,name:string,unlock:number,cost:number,target:Skill['target'],style:Style,power:number,hits:number,description:string):Skill=>({id,name,unlock,cost,target,style,power,hits,description})
const classic:BaseDefinition[]=[
 {id:'special-boy',art:'youngi',name:'영이',title:'별빛 리더',role:'리더 · 지원',cost:2,color:'#b2e9ff',hp:260,atk:38,def:14,spd:15,mastery:'리더의 용기 · 아군 공격 지원 강화',skills:[skill('basic','별빛 타격',1,0,'enemy','slash',1,1,'검으로 다가가 별빛 일격'),skill('active1','별빛 지휘',30,1,'all-allies','command',0,0,'아군 공격력 +25% · 3라운드'),skill('active2','유성 강타',35,2,'enemy','dash',2.3,1,'유성처럼 돌진하는 단일 강공격'),skill('ultimate','별빛의 서약',50,3,'all-enemies','slash',1.1,3,'별의 검 3연격 · 모든 적')]},
 {id:'special-girl',art:'chanmi',name:'찬미',title:'달빛 치유사',role:'힐러 · 보호',cost:2,color:'#d6b9ff',hp:230,atk:29,def:12,spd:13,mastery:'따뜻한 마음 · 회복/보호 효과 +20%',skills:[skill('basic','빛의 구슬',1,0,'enemy','orb',1,1,'지팡이에서 빛의 구슬 발사'),skill('active1','포근한 치유',30,1,'ally','heal',1,1,'선택한 아군 HP를 회복'),skill('active2','달빛 보호막',35,2,'all-allies','shield',.22,1,'모든 아군에게 최대 HP 22% 보호막'),skill('ultimate','달빛의 기적',50,3,'all-allies','heal',2,1,'모든 아군 대량 회복 · 보호막')]},
 {id:'momo',art:'momo',name:'모모',title:'화염 고양이',role:'속공 · 연속 공격',cost:2,color:'#ffae7c',hp:190,atk:45,def:9,spd:23,mastery:'불꽃 본능 · 연속 타격 피해 +15%',skills:[skill('basic','앞발 할퀴기',1,0,'enemy','claw',.62,2,'다가가 앞발로 두 번 할퀴기'),skill('active1','불꽃 발톱',30,1,'enemy','fire',.95,2,'화염을 두른 두 번의 발톱'),skill('active2','화염 돌진',35,2,'all-enemies','dash',.95,2,'적진을 관통하는 화염 2연격'),skill('ultimate','붉은 유성',50,3,'all-enemies','fire',1.15,3,'불꽃 궤적을 남기는 3연속 돌진')]},
 {id:'bibi',art:'bibi',name:'비비',title:'달빛 토끼',role:'민첩 · 회피',cost:2,color:'#ffc9de',hp:180,atk:36,def:8,spd:26,mastery:'토끼의 민첩함 · 회피율 +10%p',skills:[skill('basic','깡충 발차기',1,0,'enemy','kick',1.1,1,'짧게 뛰어 접근한 뒤 뒷발 차기'),skill('active1','당근콩콩',30,1,'enemy','carrot',1.75,1,'실제 당근을 포물선으로 투척'),skill('active2','달빛 점프',35,2,'enemy','jump',2.4,1,'몸을 낮추고 도약해 내려찍기'),skill('ultimate','월광 당근비',50,3,'all-enemies','carrot',.9,3,'달빛 아래 세 차례 당근 투척')]},
 {id:'coco',art:'coco',name:'코코',title:'대지의 곰',role:'탱커 · 중공격',cost:4,color:'#dfc894',hp:450,atk:68,def:28,spd:7,mastery:'대지의 수호자 · 방어력 +20%',skills:[skill('basic','곰발바닥',1,0,'enemy','slam',1.2,1,'무겁게 전진해 큰 앞발로 타격'),skill('active1','대지 강타',30,1,'all-enemies','slam',1.5,1,'웅크린 뒤 앞발을 내려쳐 충격파'),skill('active2','철벽 포옹',35,2,'all-allies','shield',.22,1,'아군 보호막 · 2라운드 단일 공격 도발'),skill('ultimate','숲의 심장',50,3,'all-enemies','slam',2.8,1,'대지의 분노로 모든 적을 강타')]},
]
const additional:BaseDefinition[]=[
 {id:'dudu',art:'dudu',name:'두두',title:'황혼의 암살자',role:'암살 · 방어 약화',cost:3,color:'#bdadfa',hp:190,atk:48,def:8,spd:24,mastery:'그림자 사냥 · 약화된 적 피해 +20%',skills:[skill('basic','꼬리 베기',1,0,'enemy','shadow',1,1,'빠르게 파고드는 치명타 공격'),skill('active1','그림자 분신',30,1,'enemy','shadow',.65,3,'세 번 타격 · 방어 약화 2턴'),skill('active2','회오리 급습',35,2,'enemy','dash',2.2,1,'방어 관통 · 약화된 적 추가 피해'),skill('ultimate','황혼의 잔상',50,3,'all-enemies','shadow',.9,4,'네 잔상으로 적진을 베기')]},
 {id:'lulu',art:'lulu',name:'루루',title:'숲의 약초사',role:'지속 회복 · 해독',cost:2,color:'#cde1a7',hp:235,atk:28,def:13,spd:14,mastery:'새싹의 축복 · 지속 회복 강화',skills:[skill('basic','새싹 가시',1,0,'enemy','root',.95,1,'자연 가시 · Lv.20부터 독'),skill('active1','초록빛 숨결',30,1,'all-allies','heal',.45,1,'작은 회복과 2턴 재생'),skill('active2','맑은 이슬',35,2,'all-allies','purify',0,0,'상태 이상 해제 · 보호막'),skill('ultimate','생명의 정원',50,3,'all-allies','heal',1.2,1,'큰 회복 · 정화 · 3턴 재생')]},
 {id:'toto',art:'toto',name:'토토',title:'도토리 수문장',role:'반격 · 방어',cost:3,color:'#c9ac8d',hp:370,atk:47,def:25,spd:9,mastery:'단단한 약속 · 반격 피해 강화',skills:[skill('basic','도토리 망치',1,0,'enemy','slam',1.15,1,'방패를 밀며 묵직하게 공격'),skill('active1','굳건한 자세',30,1,'ally','counter',0,0,'자신 도발 · 방어 · 반격 2턴'),skill('active2','바위 밀치기',35,2,'enemy','slam',1.9,1,'적 방어 약화 · 행동 지연'),skill('ultimate','철벽의 메아리',50,3,'all-allies','shield',.3,0,'모두 보호 · 반격 태세')]},
 {id:'byeol',art:'byeol',name:'별이',title:'서리별 마법사',role:'물 마법 · 빙결',cost:3,color:'#c2c9ff',hp:195,atk:43,def:10,spd:17,mastery:'차가운 별 · 브레이크 위력 강화',skills:[skill('basic','별물방울',1,0,'enemy','water',1.05,1,'물 구슬을 원거리 발사'),skill('active1','서리 파문',30,1,'all-enemies','frost',1.05,1,'얼음 파편 · 속도 감소 2턴'),skill('active2','빙결 달무리',35,2,'enemy','frost',1.7,1,'빙결 1턴 · 약점 격파 강화'),skill('ultimate','은하의 해일',50,3,'all-enemies','water',1.25,2,'두 번의 해일 · 행동 지연')]},
 {id:'mungchi',art:'mungchi',name:'뭉치',title:'용감한 응원가',role:'균형 · 방어 지원',cost:2,color:'#dfdfa5',hp:265,atk:34,def:16,spd:16,mastery:'우정의 힘 · 작은 회복 강화',skills:[skill('basic','멍멍 돌진',1,0,'enemy','dash',1.05,1,'돌진 후 가장 다친 친구 돌보기'),skill('active1','행복의 응원',30,1,'all-allies','rally',0,0,'방어 강화 · 작은 지속 회복'),skill('active2','용감한 돌격',35,2,'enemy','dash',1.8,1,'적 방어 약화 · 아군 행동 지원'),skill('ultimate','우리들의 약속',50,3,'all-allies','command',0,0,'공격·속도 강화와 행동 지원')]},
]
const identities:Record<string,{kind:Kind;element:Element;passive:Definition['passive']}>= {
 'special-boy':{kind:'boy',element:'light',passive:{name:'리더의 용기',description:'서로 다른 역할 3종 편성 시 아군 초기 보호막'}},
 'special-girl':{kind:'girl',element:'light',passive:{name:'따뜻한 마음',description:'Lv.10 회복 효과 강화',heal10:.08}},
 momo:{kind:'cat',element:'fire',passive:{name:'불꽃 본능',description:'치명타와 연속 타격 · Lv.20 기본 공격 화상',crit:.2,basicEffect:{type:'burn',turns:2,power:.04},damage40:.15}},
 bibi:{kind:'bunny',element:'nature',passive:{name:'토끼의 민첩함',description:'회피 강화 · 브레이크 시 라운드당 1회 추가 행동',dodge:.08,extraOnBreak:true}},
 coco:{kind:'bear',element:'earth',passive:{name:'대지의 수호자',description:'높은 방어 · Lv.10 피격 시 반격',reflect:.18,defense20:.15,defense40:.2,counter40:.2}},
 dudu:{kind:'fox',element:'dark',passive:{name:'야생의 감각',description:'Lv.10 치명타 확률 +17%p',crit:.25,debuff40:.2}},
 lulu:{kind:'cat',element:'nature',passive:{name:'회복의 새싹',description:'재생과 해독으로 긴 전투 지원',basicEffect:{type:'poison',turns:2,power:.04},regen40:.2}},
 toto:{kind:'bear',element:'earth',passive:{name:'든든한 등',description:'Lv.10 받는 피해 감소 · 반격 강화',reflect:.12,defense10:.15,counter40:.3}},
 byeol:{kind:'bunny',element:'water',passive:{name:'수정의 맥박',description:'Lv.10부터 약점 감소 +1',break10:1,break40:1}},
 mungchi:{kind:'dog',element:'light',passive:{name:'우정의 발걸음',description:'Lv.10 기본 공격 후 가장 다친 아군 회복',helpHeal:.04}},
}
const effect=(type:Effect['type'],turns=2,power=.2,target?:Effect['target']):Effect=>({type,turns,power,...(target?{target}:{})})
const changes:Record<string,Record<string,Partial<Skill>>>= {
 'special-boy':{active1:{effects:[effect('advance',0,1)]},active2:{pierce:.35},ultimate:{effects:[effect('attack-up',2,.2,'all-allies')]}},
 'special-girl':{active1:{effects:[effect('cleanse',0,0)]},active2:{effects:[effect('regen',2,.05)]},ultimate:{effects:[effect('cleanse',0,0)]}},
 momo:{active1:{effects:[effect('burn',2,.06)]},active2:{effects:[effect('burn',2,.05)],bonusDebuff:.15},ultimate:{effects:[effect('burn',3,.07)]}},
 bibi:{active2:{effects:[effect('stun',1,0)],breakPower:2},ultimate:{breakPower:2}},
 coco:{active1:{breakPower:2},active2:{effects:[effect('defense-up',2,.2,'self'),effect('counter',2,.3,'self')]},ultimate:{effects:[effect('defense-down',2,.2)]}},
 dudu:{active1:{effects:[effect('defense-down',2,.25)]},active2:{pierce:.5,bonusDebuff:.35},ultimate:{pierce:.25}},
 lulu:{active1:{effects:[effect('regen',2,.08)]},active2:{effects:[effect('cleanse',0,0),effect('defense-up',2,.15)]},ultimate:{effects:[effect('cleanse',0,0),effect('regen',3,.1)]}},
 toto:{active1:{target:'ally',effects:[effect('counter',2,.6,'self'),effect('defense-up',2,.3,'self')]},active2:{effects:[effect('defense-down',2,.2),effect('delay',0,1)]},ultimate:{effects:[effect('counter',2,.35)]}},
 byeol:{active1:{effects:[effect('slow',2,.2)]},active2:{effects:[effect('freeze',1,0)],breakPower:2},ultimate:{effects:[effect('delay',0,1)]}},
 mungchi:{active1:{effects:[effect('defense-up',2,.2),effect('regen',2,.04)]},active2:{effects:[effect('defense-down',2,.2),effect('advance',0,1,'all-allies')]},ultimate:{effects:[effect('speed-up',2,.2),effect('advance',0,1)]}},
}
export const HEROES:Definition[]=[...classic,...additional].map(h=>({...h,...identities[h.id],skills:h.skills.map(k=>({...k,...changes[h.id]?.[k.id]}))}))
const byId=new Map([...HEROES,...BEASTS].map(h=>[h.id,h]))
const byKind:Record<Kind,string>={boy:'special-boy',girl:'special-girl',cat:'lulu',bunny:'bibi',bear:'toto',fox:'dudu',dog:'mungchi'}
/** Future owned friends get a documented species archetype until an explicit ID config is registered. */
export function heroById(id:string,kind?:Kind):Definition {const known=byId.get(id);if(known)return known;const template=kind&&byId.get(byKind[kind]);return template?{...template,id}:undefined!}
export const elementNames:Record<Element,string>={fire:'화염',water:'물',nature:'자연',earth:'대지',light:'빛',dark:'어둠'}
export const advantages:Record<Element,Element[]>={fire:['nature'],nature:['earth'],earth:['water'],water:['fire'],light:['dark'],dark:['light']}
