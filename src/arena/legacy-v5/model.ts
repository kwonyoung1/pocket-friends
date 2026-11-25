import {bounded} from './shop-state.ts'
import {upgradedSkill} from './skill-upgrades.ts'
import {starMultiplier,starsOf,STAR_DEFENSE_MULTIPLIERS} from './fusion.ts'
import {skillTargets,supportSkill} from './targeting.ts'
import {applyResonances} from './resonance.ts'
import {stageDifficulty} from './balance.ts'
import {heroById,advantages} from './characters.ts'
import {stageById,monsterById} from './stages.ts'
import type {Action,Effect,Hit,Profiles,Skill,State,StatusType,Unit} from './types.ts'
export {HEROES,heroById} from './characters.ts'
export type * from './types.ts'
export const scale=(level:number)=>1+(level-1)*.026
export function partyErrors(ids:string[],profiles?:Profiles,limit=10){const errors:string[]=[];if(!ids.length)errors.push('최소 1명을 편성해 주세요.');if(ids.length>5)errors.push('최대 5명까지 출전할 수 있어요.');if(new Set(ids).size!==ids.length)errors.push('같은 친구는 중복 출전할 수 없어요.');if(ids.some(id=>!heroById(id,profiles?.[id]?.kind)))errors.push('알 수 없는 친구가 포함됐어요.');if(ids.reduce((n,id)=>n+(heroById(id,profiles?.[id]?.kind)?.cost??0),0)>limit)errors.push(`총 COST는 ${limit}을 넘을 수 없어요.`);if(!ids.some(id=>id==='special-boy'||id==='special-girl'))errors.push('영이 또는 찬미가 반드시 필요해요.');return errors}
export function combatStats(id:string,level:number,kind?:Unit['kind'],boost?:{mastery?:number;gear?:number;stars?:number;training?:{hp?:number;atk?:number;def?:number}}){const h=heroById(id,kind),f=scale(level);let def=Math.round(h.def*f);for(const [at,bonus]of [[10,h.passive.defense10],[20,h.passive.defense20],[40,h.passive.defense40]] as const)if(level>=at)def=Math.round(def*(1+(bonus??0)));const extra=1+Math.min(.15,Math.max(0,boost?.mastery??0)*.03)+Math.min(.12,Math.max(0,boost?.gear??0));const star=h.beast?starMultiplier(boost?.stars):1;return{hp:Math.round(Math.round(h.hp*f)*extra*star*(1+bounded(boost?.training?.hp,30)*.01)),atk:Math.round(Math.round(h.atk*f)*extra*star*(1+bounded(boost?.training?.atk,30)*.007)),def:Math.round(def*extra*(h.beast?STAR_DEFENSE_MULTIPLIERS[starsOf(boost)-1]:1)*(1+bounded(boost?.training?.def,30)*.007)),spd:h.spd}}
const addLog=(s:State,text:string)=>{s.log.unshift(text);s.log=s.log.slice(0,8)}
function random(s:State){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296}
const statusPower=(u:Unit,type:StatusType)=>u.statuses.find(e=>e.type===type)?.power??0
const hasDebuff=(u:Unit)=>u.statuses.some(e=>['burn','poison','bleed','freeze','stun','slow','defense-down','evasion-down'].includes(e.type))
const speed=(u:Unit)=>u.spd*(1+statusPower(u,'speed-up')-statusPower(u,'slow'))
const sorted=(s:State)=>s.units.filter(u=>u.hp>0).sort((a,b)=>speed(b)-speed(a)||(a.id<b.id?-1:1)).map(u=>u.id)
function blank(id:string,name:string,art:string,level:number,hp:number,atk:number,def:number,spd:number,side:Unit['side']):Unit{const f=scale(level);return{id,name,art,side,level,hp:Math.round(hp*f),maxHp:Math.round(hp*f),atk:Math.round(atk*f),def:Math.round(def*f),spd,mp:2,shield:0,attackBuff:1,buffUntil:0,turns:0,boss:false,tauntUntil:0,dodge:0,element:'nature',weakness:[],toughness:0,maxToughness:0,broken:false,controlImmune:0,statuses:[]}}
function legacyEnemies(level:number,wave:number){const rows=wave===1?['slime','thorn']:['guardian'];return rows.map(id=>{const boss=id==='guardian',u=blank(id,boss?'숲의 수호자':id==='slime'?'이슬 슬라임':'가시 요정',id,level,boss?650:id==='slime'?125:145,boss?43:id==='slime'?18:21,boss?20:id==='slime'?7:9,boss?11:id==='slime'?12:17,'enemy');u.boss=boss;u.mp=3;u.element=id==='slime'?'water':'nature';u.weakness=id==='slime'?['nature','light']:['fire','dark'];u.maxToughness=u.toughness=boss?5:2;return u})}
export function enemies(level:number,wave:number,stageId?:string):Unit[]{if(!stageId)return legacyEnemies(level,wave);const stage=stageById(stageId);if(!stage)throw Error('없는 스테이지예요.');return stage.waves[wave-1].map((id,i)=>{const m=monsterById(id)!;const u=blank(`${id}-${wave}-${i}`,m.name,m.region,stage.level,m.hp,m.atk,m.def,m.spd,'enemy');Object.assign(u,{monsterId:id,boss:m.rank==='boss',element:m.element,weakness:[...m.weakness],toughness:m.toughness,maxToughness:m.toughness});const d=stageDifficulty(stage.index);u.hp=u.maxHp=Math.round(u.hp*d.hp);u.atk=Math.round(u.atk*d.atk);u.def=Math.round(u.def*d.def);u.spd+=d.spd;u.toughness=u.maxToughness+=d.toughness;if(m.rank!=='normal')u.shield=Math.round(u.maxHp*d.shield);if(m.region==='shadow'&&m.row===0)u.dodge=.12;return u})}
export function createBattle(ids:string[],level=35,seed=20261121,profiles?:Profiles,stageId?:string,costLimit=10):State{
 const errors=partyErrors(ids,profiles,costLimit);if(!Number.isInteger(costLimit)||costLimit<10||costLimit>15)throw Error('파티 COST 범위를 확인해 주세요.');if(errors.length)throw Error(errors[0]);if(!Number.isInteger(level)||level<1||level>50)throw Error('시험 레벨은 1~50이에요.');const fallback=level
 const units=ids.map(id=>{const p=profiles?.[id],h=heroById(id,p?.kind),level=p?.level??fallback;if(!Number.isInteger(level)||level<1||level>50)throw Error('친구 레벨을 확인해 주세요.');const u=blank(id,p?.name??h.name,h.art,level,h.hp,h.atk,h.def,h.spd,'ally');u.heroId=id;u.skillLevels={...p?.skillLevels};if(h.beast)u.stars=starsOf(p);u.kind=h.kind;u.element=h.element;u.dodge=h.passive.dodge??0;if(level>=10&&h.passive.dodge)u.dodge+=.07;if(level>=40&&h.passive.dodge)u.dodge+=.1;const stats=combatStats(id,level,p?.kind,p);u.hp=u.maxHp=stats.hp;u.atk=stats.atk;u.def=stats.def;return u})
 const roles=new Set(ids.map(id=>heroById(id,profiles?.[id]?.kind).role.split(' · ')[0])),synergies:string[]=[]
 if(roles.size>=3){synergies.push('다양한 동료 · 초기 보호막 5%');for(const u of units)u.shield=Math.round(u.maxHp*.05)}
 if(units.some(u=>['coco','toto'].includes(u.heroId!))&&units.some(u=>['special-girl','lulu'].includes(u.heroId!))){synergies.push('수호와 치유 · 재생 +10%')}
 if(units.some(u=>u.element==='fire')&&units.some(u=>u.heroId==='dudu'))synergies.push('불꽃과 그림자 · 지속 피해 +10%')
 const stage=stageId?stageById(stageId):undefined;if(stageId&&!stage)throw Error('없는 스테이지예요.')
 const s:State={units:units.concat(enemies(stage?.level??level,1,stageId)),order:[],cursor:0,round:1,wave:1,phase:'battle',seed:seed>>>0,level:stage?.level??level,actions:0,allyActions:0,totalDamage:0,totalHeal:0,log:[stage?.name??'달빛 숲의 길을 열어 주세요.'],stageId,rules:5,costLimit,maxWaves:stage?.waves.length??2,synergies};s.order=sorted(s);return s
}
export function current(s:State){return s.units.find(u=>u.id===s.order[s.cursor])!}
export function skillIssue(u:Unit,k:Skill){if(u.level<k.unlock)return `Lv.${k.unlock} 해금`;if(u.mp<k.cost)return `별빛 ${k.cost}개 필요`;return ''}
function phase(s:State):boolean{
 if(!s.units.some(u=>u.side==='ally'&&u.hp>0)){s.phase='defeat';for(const u of s.units)u.statuses=[];return true}
 if(s.units.some(u=>u.side==='enemy'&&u.hp>0))return false
 if(s.wave>=s.maxWaves){s.phase='victory';for(const u of s.units)u.statuses=[];return true}
 s.wave++;s.units=s.units.filter(u=>u.side==='ally').concat(enemies(s.level,s.wave,s.stageId));s.order=sorted(s);s.cursor=0;s.round=1;addLog(s,'새로운 적이 나타납니다.');return true
}
function advanceCursor(s:State){s.cursor++;if(s.cursor>=s.order.length){s.round++;if(s.round>40){s.phase='defeat';addLog(s,'전투가 길어져 안전하게 귀환했어요.');return}s.order=sorted(s);s.cursor=0;for(const u of s.units)if(u.buffUntil<s.round)u.attackBuff=1}}
function prepare(s:State){
 for(let guard=0;guard<150&&s.phase==='battle';guard++){
  const u=current(s);if(!u||u.hp<=0){advanceCursor(s);continue}u.controlImmune=Math.max(0,u.controlImmune-1)
  for(const e of u.statuses.filter(e=>['burn','poison','bleed','regen'].includes(e.type))){const amount=Math.max(1,Math.round(u.maxHp*Math.min(e.power,u.boss ? .035 : .12)));if(e.type==='regen'){u.hp=Math.min(u.maxHp,u.hp+amount)}else{u.hp=Math.max(0,u.hp-amount);addLog(s,`${u.name} · ${e.type==='burn'?'화상':e.type==='bleed'?'출혈':'독'} ${amount}`);if(u.side==='enemy')s.totalDamage+=amount}e.turns--}
  const controlled=u.broken||u.statuses.some(e=>e.type==='freeze'||e.type==='stun');u.statuses=u.statuses.filter(e=>e.turns>0)
  if(phase(s))return
  if(u.hp<=0){advanceCursor(s);continue}
  if(controlled){u.turns++;u.broken=false;u.toughness=u.maxToughness;u.statuses=u.statuses.filter(e=>e.type!=='freeze'&&e.type!=='stun');addLog(s,`${u.name} · 무력화로 이번 행동을 쉬어요.`);advanceCursor(s);continue}
  return
 }
}
function advance(s:State){if(phase(s))return;if(s.allyActions>=160){s.phase='defeat';addLog(s,'전투 기록 한도에 도달해 귀환했어요.');return;}advanceCursor(s);prepare(s)}
function finishStatuses(u:Unit){for(const e of u.statuses)if(!['burn','poison','bleed','regen','freeze','stun'].includes(e.type))e.turns--;u.statuses=u.statuses.filter(e=>e.turns>0)}
function shift(s:State,id:string,early:boolean){const index=s.order.indexOf(id,s.cursor+1);if(index<0)return;s.order.splice(index,1);s.order.splice(early?s.cursor+1:s.order.length,0,id)}
function status(u:Unit,e:Effect){if(e.type==='freeze'||e.type==='stun'){if(u.controlImmune>0||u.broken)return;u.controlImmune=3}const old=u.statuses.find(x=>x.type===e.type);if(old){old.turns=Math.min(3,Math.max(old.turns,e.turns));old.power=Math.min(.6,Math.max(old.power,e.power))}else u.statuses.push({type:e.type as StatusType,turns:Math.min(3,e.turns),power:Math.min(.6,Math.max(0,e.power))})}
function effects(s:State,actor:Unit,targets:Unit[],list:Effect[],cleanseLimit=Infinity){for(const e of list){const affected=e.target==='self'?[actor]:e.target?s.units.filter(u=>u.hp>0&&u.side===(e.target==='all-allies'?actor.side:actor.side==='ally'?'enemy':'ally')):targets;for(const u of affected){if(e.chance!==undefined&&random(s)>e.chance)continue;if(e.type==='cleanse'){let removed=0;u.statuses=u.statuses.filter(x=>!['burn','poison','bleed','freeze','stun','slow','defense-down','evasion-down'].includes(x.type)||removed++>=cleanseLimit);}else if(e.type==='dispel'){u.shield=0;u.statuses=u.statuses.filter(x=>!['attack-up','defense-up','speed-up','counter','regen'].includes(x.type))}else if(e.type==='advance'||e.type==='delay')shift(s,u.id,e.type==='advance');else{const h=actor.heroId?heroById(actor.heroId,actor.kind):undefined;let power=e.power;if(e.type==='regen'){if(s.synergies.some(x=>x.startsWith('수호')))power*=1.1;if(actor.level>=40)power*=1+(h?.passive.regen40??0)}if((e.type==='burn'||e.type==='poison')&&actor.side==='ally'&&s.synergies.some(x=>x.startsWith('불꽃')))power*=1.1;status(u,{...e,power})}}}}
const enemySkill=(id:string,name:string,target:Skill['target'],style:Skill['style'],power:number,effects?:Effect[]):Skill=>({id,name,unlock:1,cost:0,target,style,power,hits:1,description:name,effects})
function foeSkill(actor:Unit,id:string):Skill{if(id==='summon')return enemySkill('summon','장난감 몬스터 소환','all-allies','rally',0);const m=actor.monsterId?monsterById(actor.monsterId):undefined;if(id==='guard')return enemySkill(id,m?`${m.name} · 결계`:'숲의 결계','all-allies','shield',.16);if(id==='heal')return enemySkill(id,m?`${m.name} · 치유`:'치유의 물결','ally','heal',.55);if(id==='sweep')return enemySkill(id,m?`${m.name} · ${actor.hp<actor.maxHp*.5?'격노 파동':'광역 파동'}`:actor.hp<actor.maxHp*.5?'격노의 파동':'뿌리의 격노','all-enemies',m?.style??'slam',actor.monsterId==='gift-thief'&&actor.hp<actor.maxHp*.35?1.2:.85);if(id==='debuff')return enemySkill(id,'약화의 표식','enemy',m?.style??'vine',.7,m?.effects);return enemySkill('basic',m?`${m.name} · ${m.element==='fire'?'불꽃 타격':m.element==='water'?'물결 타격':m.element==='dark'?'그림자 타격':'일격'}`:actor.boss?'고목 내려찍기':actor.art==='slime'?'이슬 탄환':'가시 채찍','enemy',m?.style??(actor.art==='slime'?'enemy-spit':actor.boss?'slam':'vine'),1)}
export function act(source:State,skillId:string,targetId?:string):Action{
 if(source.phase!=='battle')throw Error('이미 끝난 전투예요.');const s=structuredClone(source),actor=current(s);if(!actor||actor.hp<=0)throw Error('행동할 친구가 없어요.')
 const h=actor.heroId?heroById(actor.heroId,actor.kind):undefined;const base=h?h.skills.find(k=>k.id===skillId):foeSkill(actor,skillId);const k=base?upgradedSkill(base,actor.skillLevels?.[skillId]):undefined;if(!k)throw Error('알 수 없는 스킬이에요.');if(h){const issue=skillIssue(actor,k);if(issue)throw Error(issue)}
 const targets=skillTargets(s,actor,k,targetId)
 actor.mp=Math.min(3,actor.mp-k.cost+(k.id==='basic'?1:0));actor.turns++;s.actions++;if(actor.side==='ally')s.allyActions++;const hits:Hit[]=[];let didBreak=false
 for(const t of targets){let damage=0,heal=0,shield=0,critical=false,miss=false,buff=false,broke=false,counter=0;const strikes:number[]=[],strikeCriticals:boolean[]=[]
  if(k.style==='command'){t.attackBuff=h?.id==='special-boy'?(actor.level>=40?1.45:1.35):(actor.level>=40?1.35:1.25);t.attackBuff=1+(t.attackBuff-1)*(1+bounded(k.upgrade,10)*.02);t.buffUntil=s.round+2;buff=true}
  else if(k.style==='heal'){const amount=(t.maxHp*(k.id==='ultimate'?.25:.24)+actor.atk*.8)*Math.max(.3,k.power)*(actor.level>=40?1.2:1)*(actor.level>=10?1+(h?.passive.heal10??0):1)*(h?.supportPower??1)*(h?.beast&&starsOf(actor)>=4?1.1:1);heal=Math.min(t.maxHp-t.hp,Math.round(amount));t.hp+=heal;s.totalHeal+=heal;if(k.id==='ultimate'){shield=Math.round(t.maxHp*.15*(1+bounded(k.upgrade,10)*.03)*(h?.supportPower??1));t.shield=Math.min(Math.round(t.maxHp*.6),t.shield+shield)}}
  else if(k.style==='shield'||k.style==='purify'){shield=Math.round(t.maxHp*(k.style==='purify'?.14*(1+bounded(k.upgrade,10)*.03):k.power)*(actor.level>=40?1.1:1)*(h?.supportPower??1)*(h?.beast&&starsOf(actor)>=4?1.1:1));t.shield=Math.min(Math.round(t.maxHp*.6),t.shield+shield);if(h?.id==='coco')actor.tauntUntil=s.round+1}
  else if(k.style==='rally'||k.style==='counter'){buff=true;if(k.style==='counter')actor.tauntUntil=s.round+1}
  else{
   miss=random(s)<Math.max(0,t.dodge-statusPower(t,'evasion-down'));if(!miss){critical=false;const elemental=advantages[actor.element].includes(t.element)?1.15:advantages[t.element].includes(actor.element)?.9:1,attack=Math.min(1.6,actor.attackBuff*(1+statusPower(actor,'attack-up'))),defense=t.def*(1+statusPower(t,'defense-up')-statusPower(t,'defense-down'))*(1-(k.pierce??0)),bonus=t.broken?1.3:1
    const count=k.hits+(t.id===targetId?(k.primaryExtra??0):0)
    for(let n=0;n<count&&t.hp>0;n++){const crit=random(s)<Math.min(.75,(actor.level>=10?h?.passive.crit??.08:.08)+(k.critBonus??0));critical||=crit;const raw=Math.max(1,Math.round((actor.atk*k.power*attack*(actor.level>=20&&k.id==='basic'?1.15:1)*(actor.level>=40?1+(h?.passive.damage40??0):1)*(actor.boss&&s.round>=8?1.5:1)*(hasDebuff(t)?1+(k.bonusDebuff??0)+(actor.level>=40?h?.passive.debuff40??0:0):1)-defense*.55)*elemental*bonus*(crit?1.5:1))),absorbed=Math.min(t.shield,raw),dealt=Math.min(t.hp,raw-absorbed);t.shield-=absorbed;t.hp-=dealt;strikes.push(dealt);strikeCriticals.push(crit);damage+=dealt}
    if(actor.side==='ally')s.totalDamage+=damage
    if(t.maxToughness&&t.controlImmune===0&&!t.broken&&t.weakness.includes(actor.element)){t.toughness=Math.max(0,t.toughness-(k.breakPower??1)*k.hits-(actor.level>=10?h?.passive.break10??0:0)-(actor.level>=40?h?.passive.break40??0:0));if(t.toughness===0){t.broken=true;t.controlImmune=3;broke=didBreak=true;addLog(s,`${t.name} · 약점 격파!`)}}
    const defender=t.heroId?heroById(t.heroId,t.kind):undefined,reflect=Math.max(statusPower(t,'counter'),t.level>=10?defender?.passive.reflect??0:0)*(t.level>=40?1+(defender?.passive.counter40??0):1);if(damage>0&&t.hp>0&&reflect>0){counter=Math.max(1,Math.round(t.atk*reflect-actor.def*.2));actor.hp=Math.max(0,actor.hp-counter);if(t.side==='ally')s.totalDamage+=counter}
   }
  }
  hits.push({id:t.id,damage,heal,shield,critical,miss,buff,break:broke,counter,strikes,strikeCriticals})
 }
 if(actor.side==='enemy'&&k.id==='summon'&&(s.summons??0)<2&&s.units.filter(u=>u.side==='enemy'&&u.hp>0).length<3){const toy=enemies(s.level,1,s.stageId).find(u=>u.monsterId==='gift-mimic');if(toy){toy.id+='-summon-'+s.actions;s.units.push(toy);s.order.splice(s.cursor+1,0,toy.id);s.summons=(s.summons??0)+1}}
 if(k.shieldAll){for(const ally of s.units.filter(u=>u.side===actor.side&&u.hp>0)){const amount=Math.round(ally.maxHp*k.shieldAll*(1+bounded(k.upgrade,10)*.03)*(h?.supportPower??1)*(actor.level>=40?1.1:1));ally.shield=Math.min(Math.round(ally.maxHp*.6),ally.shield+amount);const hit=hits.find(hit=>hit.id===ally.id);if(hit)hit.shield+=amount;else hits.push({id:ally.id,damage:0,heal:0,shield:amount,critical:false,miss:false})}}
 const resonances=!supportSkill(k)&&k.power>0?applyResonances(s,actor,targets.filter(t=>!hits.find(hit=>hit.id===t.id)?.miss)):[]
 if(resonances.some(h=>h.break))didBreak=true
 const successful=targets.filter(t=>t.hp>0&&!hits.find(hit=>hit.id===t.id)?.miss);effects(s,actor,successful,k.effects??[],k.cleanseLimit)
 if(k.id==='basic'&&actor.level>=20&&h?.passive.basicEffect)effects(s,actor,successful,[h.passive.basicEffect])
 if(k.drain&&actor.heroId==='beast-phynix'&&actor.level>=10&&actor.hp>0&&actor.hp<actor.maxHp*.5){const n=Math.min(actor.maxHp-actor.hp,Math.round(hits.reduce((sum,h)=>sum+h.damage,0)*k.drain));actor.hp+=n;s.totalHeal+=n;hits.push({id:actor.id,damage:0,heal:n,shield:0,critical:false,miss:false})}
 if(h?.passive.helpHeal&&actor.level>=10&&k.id==='basic'){const ally=s.units.filter(u=>u.side===actor.side&&u.hp>0).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];const n=Math.min(ally.maxHp-ally.hp,Math.round(ally.maxHp*h.passive.helpHeal*(actor.level>=40?1.5:1)));ally.hp+=n;s.totalHeal+=n;hits.push({id:ally.id,damage:0,heal:n,shield:0,critical:false,miss:false})}
 if(didBreak&&h?.passive.extraOnBreak&&actor.level>=10&&actor.extraRound!==s.round&&actor.hp>0){actor.extraRound=s.round;s.order.splice(s.cursor+1,0,actor.id);addLog(s,`${actor.name} · 격파 추가 행동!`)}
 finishStatuses(actor);const message=`${actor.name} · ${k.name}`;addLog(s,message);advance(s);return{actor:actor.id,skill:k,targets:targets.map(t=>t.id),hits,next:s,message,ultimate:k.id==='ultimate'||k.id==='active2'&&!!(h?.adventurer||h?.id==='special-boy'||h?.id==='special-girl'),resonances}
}
export function enemyAction(s:State){const a=current(s);if(a.side!=='enemy')throw Error('아군 차례예요.');const m=a.monsterId?monsterById(a.monsterId):undefined,pattern=m?.pattern[a.turns%m.pattern.length]??(a.boss&&a.turns%3===0?'shield':a.boss&&a.turns%3===2?'area':'attack');let id=pattern==='summon'&&(s.summons??0)<2&&s.units.filter(u=>u.side==='enemy'&&u.hp>0).length<3?'summon':pattern==='shield'?'guard':pattern==='area'?'sweep':pattern==='heal'?'heal':pattern==='debuff'?'debuff':'basic';if(a.boss&&a.hp<a.maxHp*.5&&a.turns%3===2)id='sweep';if(s.stageId&&stageById(s.stageId)!.index>=30){if(a.boss&&a.hp<a.maxHp*.35)id=a.turns%2?'sweep':'debuff';if(m?.row===1&&a.turns%2===0&&s.units.some(u=>u.side==='enemy'&&u.hp>0&&u.hp<u.maxHp*.6))id='heal'}const side=id==='heal'?a.side:'ally',targets=s.units.filter(u=>u.side===side&&u.hp>0),taunt=targets.find(u=>u.tauntUntil>=s.round);const target=taunt??targets.reduce((x,y)=>x.hp/x.maxHp<y.hp/y.maxHp?x:y);return act(s,id,target.id)}
export function bossBattle(ids:string[],level=35,seed=20261121,profiles?:Profiles,costLimit=10){const s=createBattle(ids,level,seed,profiles,undefined,costLimit);s.wave=2;s.units=s.units.filter(u=>u.side==='ally').concat(enemies(level,2));s.order=sorted(s);s.cursor=0;s.log=['숲의 수호자가 나타났어요.'];return s}

/** Preview only: official tickets always start at wave one. */
export function practiceBossBattle(ids:string[],level:number,seed:number,profiles:Profiles,stageId:string,costLimit=10){const s=createBattle(ids,level,seed,profiles,stageId,costLimit);s.wave=s.maxWaves;s.units=s.units.filter(u=>u.side==='ally').concat(enemies(s.level,s.wave,stageId));s.order=sorted(s);s.cursor=0;return s}

export function equippedArenaBonus(instances:readonly {equippedBy?:string;enhancement?:number}[],id:string){return Math.min(.12,instances.filter(i=>i.equippedBy===id).reduce((sum,i)=>sum+(Number.isInteger(i.enhancement)&&i.enhancement!>=0&&i.enhancement!<=30?i.enhancement!:0)*.0015,0))}
