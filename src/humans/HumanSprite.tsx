import boy from '../assets/humans/boy.png'
import girl from '../assets/humans/girl.png'
import type { Friend } from '../game'
import { humanPose } from './pose'
import './styles.css'
export function HumanSprite({
  friend,
  emotion,
  mini,
}: {
  friend: Pick<Friend, 'kind' | 'name'> & Partial<Friend>
  emotion: string
  mini: boolean
}) {
  const pose = humanPose(friend, emotion, Date.now())
  return (
    <span
      className={`human-sprite ${mini ? 'mini' : ''} human-${friend.kind}`}
      data-human={friend.kind}
      data-human-pose={pose}
    >
      <span className="human-motion">
        <img
          className="human-art"
          src={friend.kind === 'boy' ? boy : girl}
          alt={`${friend.name} · ${friend.kind === 'boy' ? '회색 니트 남자' : '검은 재킷 여자'} 캐릭터`}
          draggable={false}
        />
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
          <span className="human-blanket" aria-hidden="true" />
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
