import {memo} from 'react'
import type {RoomThemeId} from './room/theme'
import {HalloweenDecor} from './room/HalloweenDecor'
import {room,roomScale} from './room/config'
import watercolor from './assets/room/woodland-watercolor.webp'
import winter from './assets/room/winter-watercolor.webp'
import {WinterDecor} from './room/WinterDecor'
import './room/theme.css'
/** Painted built-in scenery; user placements remain independent RoomExtras. */
export const RoomArt=memo(function RoomArt({theme='default',now,crowded=false,suspended=false}:{theme?:RoomThemeId;now?:()=>number;crowded?:boolean;suspended?:boolean}){
 return <svg className={`room-art theme-${theme}`} data-room-art="woodland-watercolor-v1" viewBox={`0 0 ${room.width} ${room.height}`} preserveAspectRatio="none" fill="none" aria-hidden="true">
  <image className="watercolor-scenery" href={theme==='winter'?winter:watercolor} width={room.width} height={room.height} preserveAspectRatio="none"/>
  {theme==='winter'&&<g transform={`scale(${roomScale})`}><WinterDecor now={now} crowded={crowded} suspended={suspended}/></g>}
  {theme==='halloween'&&<g transform={`scale(${roomScale})`}><HalloweenDecor/></g>}
 </svg>
})
