import catUrl from '../assets/characters-v2/cat.svg?url'
import bunnyUrl from '../assets/characters-v2/bunny.svg?url'
import dogUrl from '../assets/characters-v2/dog.svg?url'
import bearUrl from '../assets/characters-v2/bear.svg?url'
import foxUrl from '../assets/characters-v2/fox.svg?url'
import boyUrl from '../assets/characters-v2/boy.svg?url'
import girlUrl from '../assets/characters-v2/girl.svg?url'
import {memo,useId,useMemo} from 'react'
import type {CSSProperties} from 'react'
import cat from '../assets/characters-v2/cat.svg?raw'
import bunny from '../assets/characters-v2/bunny.svg?raw'
import dog from '../assets/characters-v2/dog.svg?raw'
import bear from '../assets/characters-v2/bear.svg?raw'
import fox from '../assets/characters-v2/fox.svg?raw'
import boy from '../assets/characters-v2/boy.svg?raw'
import girl from '../assets/characters-v2/girl.svg?raw'
import type {Kind} from '../game'
import './styles.css'
const artworkUrl={cat:catUrl,bunny:bunnyUrl,dog:dogUrl,bear:bearUrl,fox:foxUrl,boy:boyUrl,girl:girlUrl}
export const characterArtwork={cat,bunny,dog,bear,fox,boy,girl}
/** Only bundled original SVG masters are inserted. User images never enter this path. */
export const IllustratedSprite=memo(function IllustratedSprite({kind,color,expression='normal',pose='idle',human=false,gaze=0}:{kind:Kind;color?:string;expression?:string;pose?:string;human?:boolean;gaze?:number}){
 const id=useId().replaceAll(':','')
 const markup=useMemo(()=>characterArtwork[kind].replace(/id="art-/g,`id="${id}-`).replace(/url\(#art-/g,`url(#${id}-`).replace(/href="#art-/g,`href="#${id}-`),[kind,id])
 return <span className={`illustrated-art ${human?'human-art':'character-art'} art-${kind}`} data-art-version="2" data-art-source={artworkUrl[kind]} data-art-kind={kind} data-expression={expression==='happy'?'smile':expression} data-art-expression={expression} data-art-pose={pose} aria-hidden="true" style={{'--gaze-x':`${gaze*1.8}px`,...(color?{'--fur':color,'--fur-light':`color-mix(in srgb, ${color} 55%, white)`,'--fur-dark':`color-mix(in srgb, ${color} 75%, #795444)`}:{})} as CSSProperties} dangerouslySetInnerHTML={{__html:markup}}/>
})
