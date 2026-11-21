export type HeroId='special-boy'|'special-girl'|'momo'|'bibi'|'coco'
export type Style='slash'|'orb'|'claw'|'kick'|'slam'|'command'|'heal'|'dash'|'carrot'|'jump'|'shield'|'fire'|'enemy-spit'|'vine'
export type Skill={id:string;name:string;unlock:number;cost:number;target:'enemy'|'ally'|'all-enemies'|'all-allies';style:Style;power:number;hits:number;description:string}
export type Definition={id:HeroId;art:string;name:string;title:string;role:string;cost:number;color:string;hp:number;atk:number;def:number;spd:number;skills:Skill[];mastery:string}
const skill=(id:string,name:string,unlock:number,cost:number,target:Skill['target'],style:Style,power:number,hits:number,description:string):Skill=>({id,name,unlock,cost,target,style,power,hits,description})
export const HEROES:Definition[]=[
 {id:'special-boy',art:'youngi',name:'영이',title:'별빛 리더',role:'리더 · 지원',cost:2,color:'#b2e9ff',hp:260,atk:38,def:14,spd:15,mastery:'리더의 용기 · 아군 공격 지원 강화',skills:[skill('basic','별빛 타격',1,0,'enemy','slash',1,1,'검으로 다가가 별빛 일격'),skill('active1','별빛 지휘',30,1,'all-allies','command',0,0,'아군 공격력 +25% · 3라운드'),skill('active2','유성 강타',35,2,'enemy','dash',2.3,1,'유성처럼 돌진하는 단일 강공격'),skill('ultimate','별빛의 서약',50,3,'all-enemies','slash',1.1,3,'별의 검 3연격 · 모든 적')]},
 {id:'special-girl',art:'chanmi',name:'찬미',title:'달빛 치유사',role:'힐러 · 보호',cost:2,color:'#d6b9ff',hp:230,atk:29,def:12,spd:13,mastery:'따뜻한 마음 · 회복/보호 효과 +20%',skills:[skill('basic','빛의 구슬',1,0,'enemy','orb',1,1,'지팡이에서 빛의 구슬 발사'),skill('active1','포근한 치유',30,1,'ally','heal',1,1,'선택한 아군 HP를 회복'),skill('active2','달빛 보호막',35,2,'all-allies','shield',.22,1,'모든 아군에게 최대 HP 22% 보호막'),skill('ultimate','달빛의 기적',50,3,'all-allies','heal',2,1,'모든 아군 대량 회복 · 보호막')]},
 {id:'momo',art:'momo',name:'모모',title:'화염 고양이',role:'속공 · 연속 공격',cost:2,color:'#ffae7c',hp:190,atk:45,def:9,spd:23,mastery:'불꽃 본능 · 연속 타격 피해 +15%',skills:[skill('basic','앞발 할퀴기',1,0,'enemy','claw',.62,2,'다가가 앞발로 두 번 할퀴기'),skill('active1','불꽃 발톱',30,1,'enemy','fire',.95,2,'화염을 두른 두 번의 발톱'),skill('active2','화염 돌진',35,2,'all-enemies','dash',.95,2,'적진을 관통하는 화염 2연격'),skill('ultimate','붉은 유성',50,3,'all-enemies','fire',1.15,3,'불꽃 궤적을 남기는 3연속 돌진')]},
 {id:'bibi',art:'bibi',name:'비비',title:'달빛 토끼',role:'민첩 · 회피',cost:2,color:'#ffc9de',hp:180,atk:36,def:8,spd:26,mastery:'토끼의 민첩함 · 회피율 +10%p',skills:[skill('basic','깡충 발차기',1,0,'enemy','kick',1.1,1,'짧게 뛰어 접근한 뒤 뒷발 차기'),skill('active1','당근콩콩',30,1,'enemy','carrot',1.75,1,'실제 당근을 포물선으로 투척'),skill('active2','달빛 점프',35,2,'enemy','jump',2.4,1,'몸을 낮추고 도약해 내려찍기'),skill('ultimate','월광 당근비',50,3,'all-enemies','carrot',.9,3,'달빛 아래 세 차례 당근 투척')]},
 {id:'coco',art:'coco',name:'코코',title:'대지의 곰',role:'탱커 · 중공격',cost:4,color:'#dfc894',hp:450,atk:68,def:28,spd:7,mastery:'대지의 수호자 · 방어력 +20%',skills:[skill('basic','곰발바닥',1,0,'enemy','slam',1.2,1,'무겁게 전진해 큰 앞발로 타격'),skill('active1','대지 강타',30,1,'all-enemies','slam',1.5,1,'웅크린 뒤 앞발을 내려쳐 충격파'),skill('active2','철벽 포옹',35,2,'all-allies','shield',.22,1,'아군 보호막 · 2라운드 단일 공격 도발'),skill('ultimate','숲의 심장',50,3,'all-enemies','slam',2.8,1,'대지의 분노로 모든 적을 강타')]},
]
export const heroById=(id:string)=>HEROES.find(h=>h.id===id)!
export function partyErrors(ids:string[]){const errors:string[]=[];if(ids.length<1)errors.push('최소 1명을 편성해 주세요.');if(ids.length>4)errors.push('최대 4명까지 출전할 수 있어요.');if(new Set(ids).size!==ids.length)errors.push('같은 친구는 중복 출전할 수 없어요.');if(ids.some(id=>!heroById(id)))errors.push('알 수 없는 친구가 포함됐어요.');if(ids.reduce((n,id)=>n+(heroById(id)?.cost??0),0)>10)errors.push('총 COST는 10을 넘을 수 없어요.');if(!ids.some(id=>id==='special-boy'||id==='special-girl'))errors.push('영이 또는 찬미가 반드시 필요해요.');return errors}
export const scale=(level:number)=>1+(level-1)*.026
export type Unit={id:string;heroId?:HeroId;art:string;name:string;side:'ally'|'enemy';level:number;hp:number;maxHp:number;atk:number;def:number;spd:number;mp:number;shield:number;attackBuff:number;buffUntil:number;turns:number;boss:boolean;tauntUntil:number;dodge:number}
export type State={units:Unit[];order:string[];cursor:number;round:number;wave:number;phase:'battle'|'victory'|'defeat';seed:number;level:number;actions:number;totalDamage:number;totalHeal:number;log:string[]}
export type Hit={id:string;damage:number;heal:number;shield:number;critical:boolean;miss:boolean;buff?:boolean}
export type Action={actor:string;skill:Skill;targets:string[];hits:Hit[];next:State;message:string;ultimate:boolean}
function random(s:State){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296}
function enemy(id:string,name:string,art:string,hp:number,atk:number,def:number,spd:number,level:number,boss=false):Unit{const f=scale(level);return{id,art,name,side:'enemy',level,hp:Math.round(hp*f),maxHp:Math.round(hp*f),atk:Math.round(atk*f),def:Math.round(def*f),spd,mp:3,shield:0,attackBuff:1,buffUntil:0,turns:0,boss,tauntUntil:0,dodge:0}}
export function enemies(level:number,wave:number){return wave===1?[enemy('slime','이슬 슬라임','slime',125,18,7,12,level),enemy('thorn','가시 요정','thorn',145,21,9,17,level)]:[enemy('guardian','숲의 수호자','guardian',650,43,20,11,level,true)]}
function order(s:State){return s.units.filter(u=>u.hp>0).sort((a,b)=>b.spd-a.spd||a.id.localeCompare(b.id)).map(u=>u.id)}
export type Profile={level:number;name:string}
export type Profiles=Readonly<Record<string,Profile>>
export function createBattle(ids:string[],level=35,seed=20261121,profiles?:Profiles):State{const errors=partyErrors(ids);if(errors.length)throw Error(errors[0]);if(!Number.isInteger(level)||level<1||level>50)throw Error('시험 레벨은 1~50이에요.');const defaultLevel=level;const units:Unit[]=ids.map(id=>{const h=heroById(id),unitLevel=profiles?.[id]?.level??defaultLevel;if(!Number.isInteger(unitLevel)||unitLevel<1||unitLevel>50)throw Error('친구 레벨을 확인해 주세요.');const level=unitLevel,f=scale(level),hp=Math.round(h.hp*f);return{id:h.id,heroId:h.id,art:h.art,name:profiles?.[id]?.name??h.name,side:'ally',level,hp,maxHp:hp,atk:Math.round(h.atk*f),def:Math.round(h.def*f*(h.id==='coco'&&level>=20?1.15:1)*(h.id==='coco'&&level>=40?1.2:1)),spd:h.spd,mp:2,shield:0,attackBuff:1,buffUntil:0,turns:0,boss:false,tauntUntil:0,dodge:h.id==='bibi'?(level>=40?.25:level>=20?.15:.08):0}});const s:State={units:units.concat(enemies(level,1)),order:[],cursor:0,round:1,wave:1,phase:'battle',seed,level,actions:0,totalDamage:0,totalHeal:0,log:['달빛 숲의 길을 열어 주세요.']};s.order=order(s);return s}
export function current(s:State){return s.units.find(u=>u.id===s.order[s.cursor])!}
export function skillIssue(u:Unit,k:Skill){if(u.level<k.unlock)return `Lv.${k.unlock} 해금`;if(u.mp<k.cost)return `별빛 ${k.cost}개 필요`;return ''}
function advance(s:State){
 if(!s.units.some(u=>u.side==='ally'&&u.hp>0)){s.phase='defeat';return}
 if(!s.units.some(u=>u.side==='enemy'&&u.hp>0)){
  if(s.wave===2){s.phase='victory';return}
  s.wave=2;s.units=s.units.filter(u=>u.side==='ally').concat(enemies(s.level,2));s.round=1;s.order=order(s);s.cursor=0;s.log.unshift('깊은 숲에서 수호자가 깨어납니다.');return
 }
 do{s.cursor++;if(s.cursor>=s.order.length){s.round++;s.order=order(s);s.cursor=0;for(const u of s.units)if(u.buffUntil<s.round)u.attackBuff=1}}while(s.units.find(u=>u.id===s.order[s.cursor])?.hp===0)
}
export function act(source:State,skillId:string,targetId?:string):Action{
 if(source.phase!=='battle')throw Error('이미 끝난 전투예요.')
 const s=structuredClone(source),actor=current(s);if(!actor||actor.hp<=0)throw Error('행동할 친구가 없어요.')
 let k:Skill
 if(actor.side==='ally'){
  k=heroById(actor.heroId!).skills.find(k=>k.id===skillId)!;if(!k)throw Error('알 수 없는 스킬이에요.');const issue=skillIssue(actor,k);if(issue)throw Error(issue)
 }else{
  if(skillId==='guard'&&actor.boss)k=skill('guard','숲의 결계',1,0,'all-allies','shield',.16,1,'수호자의 몸에 보호막')
  else if(skillId==='sweep'&&actor.boss)k=skill('sweep','뿌리의 격노',1,0,'all-enemies','slam',.85,1,'모든 아군을 타격하는 충격파')
  else k=skill('basic',actor.art==='slime'?'이슬 탄환':actor.art==='thorn'?'가시 채찍':'고목 내려찍기',1,0,'enemy',actor.art==='slime'?'enemy-spit':actor.art==='thorn'?'vine':'slam',1,1,'적의 공격')
 }
 const opposite=actor.side==='ally'?'enemy':'ally',friendly=k.target==='ally'||k.target==='all-allies',side=friendly?actor.side:opposite
 const valid=s.units.filter(u=>u.side===side&&u.hp>0)
 let targets:Unit[]
 if(k.target.startsWith('all-'))targets=valid
 else{const target=valid.find(u=>u.id===targetId);if(!target)throw Error(friendly?'살아 있는 아군을 선택해 주세요.':'살아 있는 적을 선택해 주세요.');targets=[target]}
 actor.mp=Math.min(3,actor.mp-k.cost+(k.id==='basic'?1:0));actor.turns++;s.actions++
 const hits:Hit[]=[]
 for(const target of targets){
  let damage=0,heal=0,shield=0,critical=false,miss=false,buff=false
  if(k.style==='command'){target.attackBuff=actor.level>=40?1.35:1.25;target.buffUntil=s.round+2;buff=true}
  else if(k.style==='heal'){
   const multiplier=actor.level>=40?1.2:1,amount=(target.maxHp*(k.id==='ultimate'?.5:.24)+actor.atk*.8)*multiplier
   heal=Math.min(target.maxHp-target.hp,Math.round(amount));target.hp+=heal;s.totalHeal+=heal
   if(k.id==='ultimate'){shield=Math.round(target.maxHp*.15);target.shield=Math.min(target.maxHp*.6,target.shield+shield)}
  }else if(k.style==='shield'){
   shield=Math.round(target.maxHp*k.power*(actor.heroId==='special-girl'&&actor.level>=40?1.2:1));target.shield=Math.min(Math.round(target.maxHp*.6),target.shield+shield)
   if(actor.heroId==='coco')actor.tauntUntil=s.round+1
  }else{
   miss=random(s)<target.dodge
   if(!miss){critical=random(s)<(actor.heroId==='momo'?.2:.08)
    for(let n=0;n<k.hits;n++)damage+=Math.max(1,Math.round((actor.atk*k.power*actor.attackBuff*(actor.level>=10&&k.id==='basic'?1.15:1)*(actor.heroId==='momo'&&actor.level>=40?1.15:1)*(actor.boss&&s.round>=8?1.5:1)-target.def*.55)*(critical?1.5:1)))
    const absorbed=Math.min(target.shield,damage);target.shield-=absorbed;damage-=absorbed;target.hp=Math.max(0,target.hp-damage);if(actor.side==='ally')s.totalDamage+=damage
   }
  }
  hits.push({id:target.id,damage,heal,shield,critical,miss,buff})
 }
 const message=`${actor.name} · ${k.name}`;s.log.unshift(message);s.log=s.log.slice(0,8);advance(s)
 return{actor:actor.id,skill:k,targets:targets.map(u=>u.id),hits,next:s,message,ultimate:k.id==='ultimate'}
}
export function enemyAction(s:State){const actor=current(s);if(actor.side!=='enemy')throw Error('아군 차례예요.');const targets=s.units.filter(u=>u.side==='ally'&&u.hp>0),taunt=targets.find(u=>u.tauntUntil>=s.round);const target=taunt??targets.reduce((a,b)=>a.hp/a.maxHp<b.hp/b.maxHp?a:b);const skill=actor.boss&&actor.turns%3===0?'guard':actor.boss&&actor.turns%3===2?'sweep':'basic';return act(s,skill,target.id)}
export function bossBattle(ids:string[],level=35,seed=20261121,profiles?:Profiles){const s=createBattle(ids,level,seed,profiles);s.wave=2;s.units=s.units.filter(u=>u.side==='ally').concat(enemies(level,2));s.order=order(s);s.cursor=0;s.log=['숲의 수호자가 나타났어요.'];return s}
