import {memo} from 'react'
import type {CSSProperties} from 'react'
import type {Kind} from '../game'
import {paintedArt,paintedPng} from './paintedManifest'
import type {PaintFrame} from './paintedManifest'
import './styles.css'
import './painted.css'
/** Painted frames are presentation only. Personal photos bypass this component. */
export const PaintedSprite=memo(function PaintedSprite({kind,color,expression='normal',pose='idle',human=false,gaze=0}:{kind:Kind;color?:string;expression?:string;pose?:string;human?:boolean;gaze?:number}){
 const frame:PaintFrame=pose==='sleep'?'sleep':pose==='walk'?'walk-a':['happy','smile','play'].includes(pose)||['happy','smile'].includes(expression)?'happy':['closed'].includes(expression)||['sleepy','rest'].includes(pose)?'closed':'idle'
 const palette=human?'none':kind==='dog'&&color==='#f5eee3'?'saturate(.16) brightness(1.22)':color==='#f4dfb8'?'saturate(.55) brightness(1.1)':color==='#b48c71'?'brightness(.85)':color==='#c4afe4'?'hue-rotate(325deg) saturate(1.15)':'none'
 return <span className={`painted-art ${human?'human-art':'character-art'} art-${kind}`} data-art-version="3" data-art-source={paintedPng[kind]} data-art-kind={kind} data-expression={expression==='happy'?'smile':expression} data-art-expression={expression} data-art-pose={pose} data-art-frame={frame} aria-hidden="true" style={{'--paint-palette':palette,'--paint-look':`${gaze*1.2}deg`} as CSSProperties}>
   <img className={`painted-frame frame-primary ${frame==='sleep'?'sleep-scene':''}`} data-frame={frame} src={paintedArt[kind][frame]} alt="" draggable={false} decoding="async"/>
   {frame==='walk-a'&&<img className="painted-frame frame-passing" data-frame="walk-b" src={paintedArt[kind]['walk-b']} alt="" draggable={false} decoding="async"/>}
   {frame==='idle'&&<img className="painted-frame frame-blink" data-frame="closed" src={paintedArt[kind].closed} alt="" draggable={false} decoding="async"/>}
 </span>
})
