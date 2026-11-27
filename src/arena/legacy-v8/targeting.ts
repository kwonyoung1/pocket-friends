import type {Skill,State,Unit} from './types.ts'
export const supportSkill=(k:Skill)=>['command','heal','shield','purify','rally','counter'].includes(k.style)
export function skillScope(k:Skill){if(k.style==='heal')return k.target==='all-allies'?'전체 회복':k.targetCount?`회복 · ${k.targetCount}명`:'회복 · 1명';if(supportSkill(k))return k.target==='all-allies'?(k.style==='shield'?'전체 보호막':'전체 지원'):k.targetCount?`지원 · ${k.targetCount}명`:'지원 · 1명';return k.target==='all-enemies'?'전체 공격':k.targetCount?`범위 · ${k.targetCount}명`:'단일 · 1명'}
export function skillTargets(s:State,actor:Unit,k:Skill,targetId?:string):Unit[]{
 if(k.style==='counter')return [actor]
 const friendly=k.target==='ally'||k.target==='all-allies',side=friendly?actor.side:actor.side==='ally'?'enemy':'ally',valid=s.units.filter(u=>u.hp>0&&u.side===side)
 if(k.target.startsWith('all-'))return valid
 const primary=valid.find(u=>u.id===targetId);if(!primary)throw Error(friendly?'살아 있는 아군을 선택해 주세요.':'살아 있는 적을 선택해 주세요.')
 return [primary,...valid.filter(u=>u.id!==primary.id)].slice(0,k.targetCount??1)
}
const effectNames:Record<string,string>={burn:'화상',poison:'독',bleed:'출혈',freeze:'빙결',stun:'기절',regen:'지속 회복','attack-up':'공격 강화','defense-up':'방어 강화','speed-up':'속도 강화','defense-down':'방어 약화',slow:'감속',counter:'반격','evasion-down':'회피 감소',cleanse:'정화',advance:'행동 앞당김',delay:'행동 지연',dispel:'강화 해제'}
export function skillSummary(k:Skill){const detail=k.style==='heal'?`회복 효율 ${Math.round(k.power*100)}%`:k.style==='shield'?`기본 최대 HP ${Math.round(k.power*100)}% 보호막`:supportSkill(k)?`${k.description}${k.style==='purify'?' · 보호막 효율 '+Math.round(14*(1+(k.upgrade??0)*.03))+'%':k.style==='command'?' · 지원 효율 '+Math.round(100*(1+(k.upgrade??0)*.02))+'%':''}`:`공격 ${Math.round(k.power*100)}% × ${k.hits}회${k.primaryExtra?' · 주 대상 추가 '+k.primaryExtra+'회':''}`;return `${skillScope(k)} · ${detail} · ${(k.effects??[]).map(e=>`${effectNames[e.type]}${['regen','attack-up','defense-up','speed-up','counter'].includes(e.type)?' '+Math.round(e.power*100)+'%':''}${e.turns?' '+e.turns+'턴':''}`).join(' · ')}${k.shieldAll?' · 아군 전체 보호막 '+Math.round(k.shieldAll*100*(1+(k.upgrade??0)*.03))+'%':''}${k.cleanseLimit?' · 상태 이상 '+k.cleanseLimit+'개 해제':''}${k.critBonus?' · 치명타 +'+Math.round(k.critBonus*100)+'%p':''} · Lv.${k.unlock} · 별빛 ${k.cost}`}

export const statusLabel=(s:{type:string;turns:number})=>`${effectNames[s.type]??s.type} ${s.turns}턴`
