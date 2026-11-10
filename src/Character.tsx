import {sleeping} from './expansion/model'
import {HumanSprite} from './humans/HumanSprite'
import {IllustratedSprite} from './art/IllustratedSprite'
import type {Feeling} from './cozy/presence'
import type {Friend} from './game'
export function Character({friend,mini=false,emotion='normal',feeling,gaze=0}:{friend:Pick<Friend,'kind'|'color'|'photo'|'name'>&Partial<Friend>;mini?:boolean;emotion?:'normal'|'smile'|'closed';feeling?:Feeling;gaze?:number}){
 // Registered personal photos always take precedence over the new masters.
 if(friend.photo)return <div className={`photo-character ${mini?'mini':''}`}><img src={friend.photo} alt={`${friend.name}의 등록 사진`} draggable={false}/><span className="photo-feet"/></div>
 if(friend.kind==='boy'||friend.kind==='girl')return <HumanSprite friend={friend} emotion={emotion} mini={mini} gaze={gaze}/>
 const expression=feeling==='surprised'?'surprised':emotion==='closed'||feeling==='sleepy'||feeling==='rest'?'closed':feeling==='joy'||feeling==='excited'?'happy':emotion==='smile'||feeling==='content'?'smile':feeling==='hungry'?'hungry':'normal'
 return <IllustratedSprite kind={friend.kind} gaze={gaze} color={friend.color} expression={expression} pose={friend.id&&sleeping(friend as Friend,Date.now())?'sleep':friend.moving?'walk':feeling==='rest'?'rest':'idle'}/>
}
