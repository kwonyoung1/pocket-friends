import {memo} from 'react'
import type {RoomThemeId} from './room/theme'
import {HalloweenDecor} from './room/HalloweenDecor'
import {room,roomScale} from './room/config'
import watercolor from './assets/room/woodland-watercolor.webp'
import './room/theme.css'
/** Painted built-in scenery; user placements remain independent RoomExtras. */
export const RoomArt=memo(function RoomArt({theme='default'}:{theme?:RoomThemeId}){
 return <svg className={`room-art theme-${theme}`} data-room-art="woodland-watercolor-v1" viewBox={`0 0 ${room.width} ${room.height}`} preserveAspectRatio="none" fill="none" aria-hidden="true">
  <image className="watercolor-scenery" href={watercolor} width={room.width} height={room.height} preserveAspectRatio="none"/>
  {theme==='halloween'&&<g transform={`scale(${roomScale})`}><HalloweenDecor/></g>}
 </svg>
})
