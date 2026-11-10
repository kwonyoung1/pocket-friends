import {memo} from 'react'
export const RoomAtmosphere=memo(function RoomAtmosphere(){return <div className="cozy-atmosphere" aria-hidden="true"><span className="cozy-sunwash"/>{Array.from({length:7},(_,i)=><i key={i} style={{left:`${30+i*5}%`,top:`${14+i%3*10}%`,animationDelay:`${-i*1.8}s`,animationDuration:`${12+i}s`}}/>)}<span className="cozy-lamp-glow"/></div>})
