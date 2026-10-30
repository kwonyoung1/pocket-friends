import {memo,useSyncExternalStore} from 'react'
import {directMultiplier} from './config'
import type {MatchController,View} from './controller'
export const MatchHud=memo(function MatchHud({controller,view}:{controller:MatchController;view:View}){
 const t=useSyncExternalStore(controller.subscribeTime,controller.timeSnapshot),challenge=view.game.mode==='challenge',combo=view.combo,level=combo>=20?'legend':combo>=10?'rainbow':combo>=8?'fire':combo>=5?'gold':combo>=3?'purple':'blue',running=!view.paused&&view.phase==='IDLE'&&view.game.status==='playing'
 return <section className={`tm-v2-hud tone-${level}`} aria-label="콤보와 시간" data-running={running} data-paused={view.paused}>
  <div className="tm-direct-combo" data-testid="direct-combo" data-combo={combo}>
   <div className="tm-combo-digits" key={`${combo}-${view.breakId}`}><strong>{combo}</strong><span>{combo>=20?'LEGENDARY COMBO!':'COMBO!'}</span></div><b>×{directMultiplier(Math.max(1,combo))} SCORE</b>
   <div className={`tm-combo-track ${t.comboMs<=2000?'warning':''} ${t.comboMs<=1000&&combo?'urgent':''}`} role="progressbar" aria-label="5초 콤보 유지" aria-valuemin={0} aria-valuemax={5} aria-valuenow={Number((t.comboMs/1000).toFixed(1))}><i style={{transform:`scaleX(${combo?t.comboMs/5000:0})`}}/></div>
   <small data-testid="combo-seconds">{combo?(Math.ceil(t.comboMs/100)/10).toFixed(1):'0.0'}초 {view.phase!=='IDLE'||view.paused?'· 잠시 멈춤':''}</small>
   {view.breakId>0&&<span className="tm-combo-break" key={`break-${view.breakId}`}>COMBO BREAK</span>}
  </div>
  {challenge&&<div className={`tm-challenge-time ${t.remainingMs<=5900?'danger':t.remainingMs<16000?'warning':''} ${t.remainingMs<=5000?'critical':''}`}><span>남은 시간</span><strong data-testid="challenge-seconds">{(Math.ceil(t.remainingMs/100)/10).toFixed(1)}<small>초</small></strong><span>난이도 {view.game.difficulty??1} · 무제한 이동</span><small title="입력 가능한 판단 시간만 집계해요">생존 {(t.survivalMs/1000).toFixed(1)}초</small>{view.bonusId>0&&<div className="tm-time-bonus" key={view.bonusId}><b>+5.0 SEC</b><small>{view.lastAddedMs<1?'최대 30초 유지':`+${(view.lastAddedMs/1000).toFixed(1)}초 반영 · 최대 30초`}</small></div>}</div>}
 </section>
})
