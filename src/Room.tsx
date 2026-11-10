import {memo,useState} from 'react'
import type {RoomThemeId} from './room/theme'
import {HalloweenDecor} from './room/HalloweenDecor'
import {room,roomScale} from './room/config'
import watercolor from './assets/room/woodland-watercolor.webp'
import winter from './assets/room/winter-watercolor.webp'
import {WinterDecor} from './room/WinterDecor'
import './room/theme.css'
/** Painted built-in scenery; user placements remain independent RoomExtras. */
export const RoomArt=memo(function RoomArt({theme='default',now,crowded=false,suspended=false}:{theme?:RoomThemeId;now?:()=>number;crowded?:boolean;suspended?:boolean}){
 const [winterFailed,setWinterFailed]=useState(false)
 return <svg className={`room-art theme-${theme}`} data-room-art="woodland-watercolor-v1" data-theme-art={theme==='winter'?'christmas-v2':theme} viewBox={`0 0 ${room.width} ${room.height}`} preserveAspectRatio="none" fill="none" aria-hidden="true">
  <image data-testid="room-scenery" className="watercolor-scenery" href={theme==='winter'&&!winterFailed?winter:watercolor} onError={()=>{if(theme==='winter')setWinterFailed(true)}} width={room.width} height={room.height} preserveAspectRatio="none"/>
  {theme==='winter'&&<g transform={`scale(${roomScale})`}><WinterDecor fallback={winterFailed} now={now} crowded={crowded} suspended={suspended}/></g>}
  {theme==='halloween'&&<g transform={`scale(${roomScale})`}><HalloweenDecor/></g>}
 </svg>
})
