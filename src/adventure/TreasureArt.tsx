import {useId} from 'react'
import {newTreasures} from './catalog'
import {gemById} from './gems'
export function TreasureArt({id}:{id:string}){
 const key=useId(),t=gemById[id]
 if(!t)return null
 const index=newTreasures.findIndex(t=>t.id===id)
 return <svg viewBox="0 0 100 100" role="img" aria-label={`${t.name} 일러스트`} className="treasure-art"><defs><linearGradient id={key} x2="1" y2="1"><stop stopColor="#fff9ee"/><stop offset="1" stopColor={t.color}/></linearGradient></defs><ellipse cx="50" cy="85" rx="34" ry="6" fill="#907c6030"/>{index===0?<><path d="M12 71q38-32 76 0L68 87H32Z" fill="#ead2bc"/><circle cx="50" cy="52" r="26" fill={`url(#${key})`} stroke={t.color} strokeWidth="3"/><circle cx="40" cy="41" r="8" fill="#fff" opacity=".85"/></>:index===2||index===5?<><path d="m13 70 14-37h46l14 37-13 13H27Z" fill={t.color} stroke="#ac9876" strokeWidth="2"/><path d="m27 33 8 34h30l8-34M13 70l22-3m52 3-22-3" fill={`url(#${key})`} stroke="#fff7d8" strokeWidth="2"/></>:<><path d={`M50 ${10+index%3*3} 84 34 77 68 50 86 23 68 16 34Z`} fill={`url(#${key})`} stroke={t.color} strokeWidth="3"/><path d="m16 34 34 8 34-8M50 42v44M16 34l23-9 11 17 12-17 22 9M23 68l27-26 27 26" fill="none" stroke="#fff9ef" strokeWidth="2"/></>}<path d="m83 12 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" fill="#e8c669"/><circle cx="15" cy="21" r="3" fill="#ecd6a2"/></svg>
}
