/** Decimal strings preserve monotonically increasing progress beyond Number.MAX_SAFE_INTEGER. */
export type TowerTrait='normal'|'strong'|'iron'|'swift'|'vital'|'exposed'
export type TowerSpecial='normal'|'gold'|'crystal'|'shadow'
export type TowerRun={floor:string;trait:TowerTrait;special:TowerSpecial;region:string;growth?:{hp:number;atk:number;def:number}}
export type Proficiency={xp:string;level:string}
export type TowerProgress={version:1;highest:string;recent:string;wins:string;streak:number;firstThrough:string;proficiency:Record<string,Proficiency>;lastReward?:TowerReward}
export type TowerReward={runId:string;floor:string;xp:number;work:number;efficiency:number;streak:number;first:boolean;highest:boolean;wins:string;members:{id:string;name:string;xp:string;before:string;level:string}[]}
export const decimal=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d*)$/.test(v)
export function count(v:unknown){if(!decimal(v))throw Error('수련탑의 정수 기록을 확인해 주세요.');return BigInt(v)}
export const freshTower=():TowerProgress=>({version:1,highest:'0',recent:'1',wins:'0',streak:0,firstThrough:'0',proficiency:{}})
export function validateTower(t:TowerProgress){if(!t||t.version!==1||!decimal(t.highest)||!decimal(t.recent)||count(t.recent)<1n||count(t.recent)>count(t.highest)+1n||!decimal(t.wins)||t.firstThrough!==t.highest||!Number.isInteger(t.streak)||t.streak<0||t.streak>10||!t.proficiency||Object.keys(t.proficiency).length>128)throw Error('수련탑 기록을 확인해 주세요.');for(const p of Object.values(t.proficiency))if(!p||!decimal(p.xp)||!decimal(p.level)||count(p.level)!==count(p.xp)/1000n)throw Error('숙련 기록을 확인해 주세요.');if(t.lastReward){const r=t.lastReward;if(!decimal(r.floor)||count(r.floor)<1n||count(r.floor)>count(t.highest)||!Number.isInteger(r.xp)||r.xp<1||r.xp>1200||!Number.isFinite(r.work)||r.work<.01||r.work>8||!Array.isArray(r.members)||r.members.length>5||!decimal(r.wins))throw Error('훈련 결과 기록을 확인해 주세요.');for(const m of r.members)if(typeof m.id!=='string'||typeof m.name!=='string'||!decimal(m.xp)||!decimal(m.before)||!decimal(m.level)||count(m.level)!==count(m.xp)/1000n)throw Error('훈련 결과의 숙련 기록을 확인해 주세요.')}return t}
export function floorAllowed(floor:string,t:Pick<TowerProgress,'highest'>){return decimal(floor)&&count(floor)>0n&&count(floor)<=count(t.highest)+1n}
export function floorStep(floor:string,delta:number,highest:string){const n=count(floor)+BigInt(delta),top=count(highest)+1n;return(n<1n?1n:n>top?top:n).toString()}
export function shortCount(value:string){return value.length>12?value.slice(0,4)+'… ('+value.length+'자리)':BigInt(value).toLocaleString('ko-KR')}
