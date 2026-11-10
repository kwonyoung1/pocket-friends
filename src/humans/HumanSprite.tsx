import {CalmWalk} from './calm/CalmWalk'
import {PaintedSprite} from '../art/PaintedSprite'
import type { Friend } from '../game'
import { humanPose } from './pose'
import './styles.css'
export function HumanSprite({
  friend,
  emotion,
  mini,
  gaze=0,
}: {
  friend: Pick<Friend, 'kind' | 'name'> & Partial<Friend>
  emotion: string
  mini: boolean
  gaze?:number
}) {
  const pose = humanPose(friend, emotion, Date.now())
  return (
    <span
      className={`human-sprite ${mini ? 'mini' : ''} human-${friend.kind}`}
      data-human={friend.kind}
      data-human-pose={pose}
    >
      <span className="human-motion">
        <CalmWalk friend={friend} mini={mini}><PaintedSprite kind={friend.kind==='boy'?'boy':'girl'} human gaze={gaze} pose={pose==='walk'?'idle':pose} expression={pose==='surprised'?'surprised':pose==='happy'?'happy':['sleep','sleepy','rest'].includes(pose)?'closed':pose==='smile'?'smile':emotion==='closed'?'closed':'normal'}/></CalmWalk>
      </span>
      {pose === 'surprised' && (
        <span className="human-expression" aria-hidden="true">
          !
        </span>
      )}
      {pose === 'happy' && (
        <span className="human-expression human-joy" aria-hidden="true">
          ✧ ♡
        </span>
      )}
      {pose === 'sleep' && (
        <>

          <span className="human-dream" aria-hidden="true">
            ☾ z z
          </span>
        </>
      )}
      {pose === 'play' && (
        <span className="human-plaything" aria-hidden="true">
          ✦
        </span>
      )}
    </span>
  )
}
