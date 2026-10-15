import { HumanSprite } from './humans/HumanSprite'
import type { Friend } from './game'
export function Character({ friend, mini = false, emotion = 'normal' }: { friend: Pick<Friend, 'kind' | 'color' | 'photo' | 'name'> & Partial<Friend>; mini?: boolean; emotion?: 'normal' | 'smile' | 'closed' }) {
  if(friend.kind==='boy'||friend.kind==='girl')return <HumanSprite friend={friend} emotion={emotion} mini={mini}/>
  if (friend.photo) return <div className={`photo-character ${mini ? 'mini' : ''}`}><img src={friend.photo} alt={`${friend.name}의 등록 사진`} draggable={false} /><span className="photo-feet" /></div>
  const { kind, color } = friend
  return <svg className="character-art" viewBox="0 0 120 140" aria-hidden="true">
    <ellipse cx="60" cy="128" rx="31" ry="7" fill="#654d3c" opacity=".09" />
    <path d="M83 93q35-10 25 11-8 11-21 3" fill={color} stroke="#936f55" strokeWidth="2" />
    <ellipse cx="60" cy="101" rx="29" ry="29" fill={color} />
    <ellipse cx="60" cy="107" rx="18" ry="18" fill="#fff9ec" opacity=".7" />
    <ellipse cx="42" cy="123" rx="12" ry="6" fill={color} />
    <ellipse cx="78" cy="123" rx="12" ry="6" fill={color} />
    {kind === 'bunny' ? <><ellipse cx="41" cy="30" rx="12" ry="27" transform="rotate(-12 41 30)" fill={color} /><ellipse cx="79" cy="30" rx="12" ry="27" transform="rotate(12 79 30)" fill={color} /><ellipse cx="41" cy="28" rx="5" ry="18" fill="#d98f9d" opacity=".55" /><ellipse cx="79" cy="28" rx="5" ry="18" fill="#d98f9d" opacity=".55" /></> : kind === 'dog' ? <><ellipse cx="26" cy="60" rx="13" ry="27" fill="#d8c4aa" transform="rotate(15 26 60)"/><ellipse cx="94" cy="60" rx="13" ry="27" fill="#d8c4aa" transform="rotate(-15 94 60)"/></> : kind === 'bear' ? <><circle cx="30" cy="43" r="16" fill={color} /><circle cx="90" cy="43" r="16" fill={color} /><circle cx="30" cy="43" r="9" fill="#b5997c" /><circle cx="90" cy="43" r="9" fill="#b5997c" /></> : <><path d="m22 56-3-36q18 1 29 22m24 0q11-21 29-22l-3 36" fill={color} stroke="#936f55" strokeWidth="1.5" /><path d="m26 41-1-13 14 14m43 0 13-14-1 13" fill="#e99598" /></>}
    <path d="M21 65C21 40 40 35 60 35S99 40 99 65c0 23-15 33-39 33S21 88 21 65Z" fill={color} />
    {kind === 'fox' && <path d="M23 65q19 5 37 18 18-13 37-18c0 21-14 32-37 32S23 86 23 65" fill="#fff8e9" />}
    {kind === 'cat' && <><path d="m48 36 4 13m8-14v13m11-12-4 13" stroke="#cc946c" strokeWidth="4" strokeLinecap="round" /><path d="m24 72 11 3m-10 5 10-1m61-7-11 3m10 5-10-1" stroke="#ad7f61" strokeWidth="1.5" strokeLinecap="round" /></>}
    {color === '#c4afe4' && <><path d="M66 42a9 9 0 1 1-9-9 7 7 0 0 0 9 9Z" fill="#fff0af"/><path d="m88 100 2 4 5 1-4 3 1 5-4-3-5 3 2-5-4-3 5-1Z" fill="#fff0af"/></>}
    {kind === 'bear' && <ellipse cx="60" cy="76" rx="17" ry="13" fill="#eee1ca" />}
    {emotion === 'normal' ? <g data-expression="normal"><ellipse cx="42" cy="66" rx="3.1" ry="4.4" fill="#624b42" /><ellipse cx="78" cy="66" rx="3.1" ry="4.4" fill="#624b42" /></g> : <g data-expression={emotion} fill="none" stroke="#624b42" strokeWidth="2.6" strokeLinecap="round">{emotion === 'closed' ? <path d="M36 66q6 7 12 0m24 0q6 7 12 0" /> : <path d="M36 68q6-9 12 0m24 0q6-9 12 0" />}</g>}
    <circle cx="33" cy="77" r="7" fill="#e78d8b" opacity=".45" /><circle cx="87" cy="77" r="7" fill="#e78d8b" opacity=".45" />
    <path d="m56 74 4 3 4-3" fill="#936856" /><path d="M60 77v4m-6-1q3 5 6 1 3 4 6-1" fill="none" stroke="#795748" strokeWidth="1.8" strokeLinecap="round" />
    <path d="m31 98-7 8m65-8 7 8" stroke={color} strokeWidth="11" strokeLinecap="round" />
    <path d="m50 94 10 5 10-5-2 12-8-5-8 5Z" fill={kind === 'bunny' ? '#b8899b' : kind === 'bear' ? '#89a28a' : kind === 'fox' ? '#829dab' : '#d69787'} />
  </svg>
}
