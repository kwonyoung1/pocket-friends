import {memo,useEffect,useState} from 'react'
const dateFormat=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',weekday:'long'})
const timeFormat=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true})
// Only this decorative component updates each second. Cloud time uses a monotonic clock.
export const RoomClock=memo(function RoomClock({now=Date.now}:{now?:()=>number}){
 const [at,setAt]=useState(now)
 useEffect(()=>{setAt(now());const t=setInterval(()=>setAt(now()),1000);return()=>clearInterval(t)},[now])
 return <div className="room-clock" role="timer" aria-label="한국 시간 시계"><span aria-hidden="true">◷</span><time dateTime={new Date(at).toISOString()}><strong>{timeFormat.format(at)}</strong><small>{dateFormat.format(at)}</small></time></div>
})
