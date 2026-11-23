import {useEffect,useState} from 'react'
import type {ArenaAccount,FusionResult} from './beast-state.ts'
import type {CloudGame} from '../cloud/protocol.ts'
import {beastById,rarityNames} from './beasts.ts'
import {fusionCost,fusionIssue,starsOf,STAR_MULTIPLIERS,STAR_DEFENSE_MULTIPLIERS} from './fusion.ts'
import {combatStats} from './model.ts'
import {ASSETS} from './assets.ts'
function Reveal({result,close}:{result:FusionResult;close:()=>void}){
 const h=beastById(result.beastId)!,[ready,setReady]=useState(false)
 useEffect(()=>{const t=setTimeout(()=>setReady(true),matchMedia('(prefers-reduced-motion: reduce)').matches?50:result.toStars===5?2100:1300);return()=>clearTimeout(t)},[result.toStars])
 return <div className={`fusion-reveal star-${result.toStars} ${ready?'revealed':''}`} role="dialog" aria-modal="true" aria-label="환수 합성 결과"><div className="fusion-circle"/>
 <div className="fusion-material left"><img src={ASSETS['card-'+h.art]} alt=""/></div><div className="fusion-material right"><img src={ASSETS['card-'+h.art]} alt=""/></div>
 <div className="fusion-radiance" aria-hidden="true">{Array.from({length:result.toStars*2},(_,i)=><i key={i} style={{transform:`rotate(${i*360/(result.toStars*2)}deg)`}}/>)}</div>
 <img className="fusion-born" src={ASSETS['card-'+h.art]} alt={`${h.name} ${result.toStars}성 합성 일러스트`}/><div className="fusion-copy"><p>{result.toStars===5?'최고 성급 · 별자리의 탄생':'같은 환수의 별빛이 하나로'}</p><h2>{h.name} {'★'.repeat(result.toStars)}</h2><p>{ready?`★${result.fromStars} → ★${result.toStars} · HP·ATK ${STAR_MULTIPLIERS[result.toStars-1]}배 · DEF ${STAR_DEFENSE_MULTIPLIERS[result.toStars-1]}배`:'두 환수의 별빛을 합치고 있어요…'}</p><button onClick={()=>ready?close():setReady(true)}>{ready?'합성 결과 확인':'연출 건너뛰기'}</button></div></div>
}
export function Fusion({account,cloud}:{account?:ArenaAccount;cloud?:CloudGame}){
 const owned=Object.keys(account?.beasts??{}).filter(id=>beastById(id)),[chosen,setChosen]=useState(''),[pending,setPending]=useState<{id:string;stars:number}|null>(null),[result,setResult]=useState<FusionResult|null>(null)
 const id=owned.includes(chosen)?chosen:owned[0],b=account?.beasts[id],h=beastById(id??''),stars=starsOf(b),issue=h?fusionIssue(id,b):'보유한 환수가 필요해요.',cost=h&&stars<5?fusionCost(id,stars):0
 useEffect(()=>{if(pending){if(starsOf(account?.beasts[pending.id])>pending.stars){if(account?.lastFusion?.beastId===pending.id&&account.lastFusion.fromStars===pending.stars)setResult(account.lastFusion);setPending(null)}else if(cloud?.error&&!cloud.busy)setPending(null)}},[account,cloud?.busy,cloud?.error,pending])
 const before=h&&b?combatStats(id,b.level,undefined,b):null,after=h&&b?combatStats(id,b.level,undefined,{...b,stars:Math.min(5,stars+1)}):null
 return <section className="fusion-board" aria-label="환수 합성"><h3>환수 합성</h3><p>같은 종류·성급 2마리의 힘을 합쳐 확정적으로 1성 높여요. 희귀 등급과 별자리 마스터리는 그대로예요.</p>
 {!h||!b?<p>정식 전투에서 상자를 얻고 환수를 먼저 획득해 주세요.</p>:<><label>합성 대상<select aria-label="합성할 환수" value={id} disabled={cloud?.busy||!!pending} onChange={e=>setChosen(e.target.value)}>{owned.map(id=><option key={id} value={id}>{beastById(id)!.name} · ★{starsOf(account!.beasts[id])}</option>)}</select></label>
 <div className="fusion-pair"><figure><img src={ASSETS['card-'+h.art]} alt={`${h.name} 주환수`}/><figcaption>{h.name} ★{stars} · 1마리</figcaption></figure><b>＋</b><figure><img src={ASSETS['card-'+h.art]} alt={`${h.name} 동일 성급 재료`}/><figcaption>같은 ★{stars} 재료<br/>{stars<5?Math.floor(b.shards/cost):0}마리 환산</figcaption></figure></div>
 <p>{rarityNames[h.rarity]} · COST {h.cost} 유지 · Lv.{b.level} · 별자리 {b.mastery} 유지</p><p>보유 전용 조각 <b>{b.shards}</b>개{stars<5&&<> / 필요 <b>{cost}</b>개 (1성 중복 환수 {2**(stars-1)}마리 분량)</>}</p><p>이전에 얻은 조각도 같은 비율로 사용할 수 있어요. 조각을 경험치·별자리에 쓰면 그만큼 합성 재료도 줄어요.</p>
 <table aria-label="합성 전후 능력치"><thead><tr><th>능력치</th><th>현재 ★{stars}</th><th>합성 후 ★{Math.min(5,stars+1)}</th></tr></thead><tbody>{(['hp','atk','def'] as const).map(key=><tr key={key}><th>{key.toUpperCase()}</th><td>{before![key]}</td><td>{after![key]} <small>+{after![key]-before![key]}</small></td></tr>)}</tbody></table>
 <p>HP·ATK 배율 1 / 1.35 / 1.85 / 2.6 / 3.7배. DEF 배율 1 / 1.2 / 1.45 / 1.75 / 2.1배. 방어 상승은 무적에 가까워지지 않도록 따로 제한해요. 속도·치명타·회피는 성급으로 증가하지 않아요. ★4 이상 회복·보호 효율 +10%, 공명은 합산 상한을 유지해요.</p>
 <button className="fuse-button" disabled={!cloud||cloud.busy||!!pending||!!issue} onClick={()=>{setPending({id,stars});void cloud?.send({type:'arena-fuse',beastId:id,fromStars:stars})}}>{pending?'합성 결과 확인 중…':stars===5?'최고 성급 ★5':`★${stars+1}로 합성`}</button>{issue&&<p role="status">{issue}</p>}
 <p>현재 전투에 출전 중이어도 기존 전투는 입장 당시 성급을 유지해요. 합성한 능력치는 다음 전투부터 적용돼요.</p></>}
 {cloud?.error&&<p role="alert">{cloud.error}<button disabled={cloud.busy} onClick={()=>void cloud.retry()}>같은 합성 작업 다시 확인</button></p>}{account?.lastFusion&&<button onClick={()=>setResult(account.lastFusion!)}>최근 합성 결과 다시 보기</button>}{result&&<Reveal key={`${result.beastId}-${result.toStars}-${result.at}`} result={result} close={()=>setResult(null)}/>}</section>
}
