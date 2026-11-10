import {HumanSprite} from './humans/HumanSprite'
import {AnimalSprite} from './animals/AnimalSprite'
import type {Feeling} from './cozy/presence'
import type {Friend} from './game'
export function Character({friend,mini=false,emotion='normal',feeling,gaze=0}:{friend:Pick<Friend,'kind'|'color'|'photo'|'name'>&Partial<Friend>;mini?:boolean;emotion?:'normal'|'smile'|'closed';feeling?:Feeling;gaze?:number}){
 // Registered personal photos always take precedence over the new masters.
 if(friend.photo)return <div className={`photo-character ${mini?'mini':''}`}><img src={friend.photo} alt={`${friend.name}의 등록 사진`} draggable={false}/><span className="photo-feet"/></div>
 if(friend.kind==='boy'||friend.kind==='girl')return <HumanSprite friend={friend} emotion={emotion} mini={mini} gaze={gaze}/>
 return <AnimalSprite friend={friend} mini={mini} emotion={emotion} feeling={feeling}/>
}
