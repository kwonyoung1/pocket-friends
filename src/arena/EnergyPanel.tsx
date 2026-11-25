import {useEffect,useState} from 'react'
import {clockText,energyView} from './energy.ts'
import type {Energy} from './energy.ts'
/** A local countdown using the server offset; no polling or writes per second. */
export function EnergyPanel({source,now,cost}:{source?:Energy;now?:()=>number;cost:number}){
 const[stamp,setStamp]=useState(()=>now?.()??Date.now())
 useEffect(()=>{const update=()=>{if(!document.hidden)setStamp(now?.()??Date.now())};update();const timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update)}},[now])
 const energy=energyView(source,stamp)
 return <aside className="energy-panel" aria-label="별빛 에너지"><b>별빛 에너지 {energy.value} / 100</b><span>입장 {cost} · {energy.value===100?'모두 회복됨':`다음 +1 ${clockText(energy.nextIn)} · 완충 ${clockText(energy.fullIn)}`}</span><small>6분당 1 · 매일 한국시간 00:00 전체 충전 · 서버 시간 기준</small><small>같은 비밀번호의 공유 에너지 · 연습은 소모 없음</small></aside>
}
