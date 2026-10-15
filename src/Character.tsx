import type { Friend } from './game'
export function Character({ friend, mini = false }: { friend: Pick<Friend, 'kind' | 'color' | 'photo' | 'name'>; mini?: boolean }) {
  if (friend.photo) return <div className={`photo-character ${mini ? 'mini' : ''}`}><img src={friend.photo} alt={`${friend.name}의 등록 사진`} draggable={false} /><span className="photo-feet" /></div>
  const { kind, color } = friend
  return <svg className="character-art" viewBox="0 0 120 140" aria-hidden="true">
    <ellipse cx="60" cy="128" rx="31" ry="7" fill="#654d3c" opacity=".09" />
    <path d="M83 93q35-10 25 11-8 11-21 3" fill={color} stroke="#936f55" strokeWidth="2" />
    <ellipse cx="60" cy="101" rx="29" ry="29" fill={color} />
    <ellipse cx="60" cy="107" rx="18" ry="18" fill="#fff9ec" opacity=".7" />
    <ellipse cx="42" cy="123" rx="12" ry="6" fill={color} />
    <ellipse cx="78" cy="123" rx="12" ry="6" fill={color} />
    {kind === 'bunny' ? <><ellipse cx="41" cy="30" rx="12" ry="27" transform="rotate(-12 41 30)" fill={color} /><ellipse cx="79" cy="30" rx="12" ry="27" transform="rotate(12 79 30)" fill={color} /><ellipse cx="41" cy="28" rx="5" ry="18" fill="#d98f9d" opacity=".55" /><ellipse cx="79" cy="28" rx="5" ry="18" fill="#d98f9d" opacity=".55" /></> : kind === 'bear' ? <><circle cx="30" cy="43" r="16" fill={color} /><circle cx="90" cy="43" r="16" fill={color} /><circle cx="30" cy="43" r="9" fill="#b5997c" /><circle cx="90" cy="43" r="9" fill="#b5997c" /></> : <><path d="m22 56-3-36q18 1 29 22m24 0q11-21 29-22l-3 36" fill={color} stroke="#936f55" strokeWidth="1.5" /><path d="m26 41-1-13 14 14m43 0 13-14-1 13" fill="#e99598" /></>}
    <path d="M21 65C21 40 40 35 60 35S99 40 99 65c0 23-15 33-39 33S21 88 21 65Z" fill={color} />
    {kind === 'fox' && <path d="M23 65q19 5 37 18 18-13 37-18c0 21-14 32-37 32S23 86 23 65" fill="#fff8e9" />}
    {kind === 'cat' && <><path d="m48 36 4 13m8-14v13m11-12-4 13" stroke="#cc946c" strokeWidth="4" strokeLinecap="round" /><path d="m24 72 11 3m-10 5 10-1m61-7-11 3m10 5-10-1" stroke="#ad7f61" strokeWidth="1.5" strokeLinecap="round" /></>}
    {kind === 'bear' && <ellipse cx="60" cy="76" rx="17" ry="13" fill="#eee1ca" />}
    <ellipse cx="42" cy="66" rx="3.1" ry="4.4" fill="#624b42" /><ellipse cx="78" cy="66" rx="3.1" ry="4.4" fill="#624b42" />
    <circle cx="33" cy="77" r="7" fill="#e78d8b" opacity=".45" /><circle cx="87" cy="77" r="7" fill="#e78d8b" opacity=".45" />
    <path d="m56 74 4 3 4-3" fill="#936856" /><path d="M60 77v4m-6-1q3 5 6 1 3 4 6-1" fill="none" stroke="#795748" strokeWidth="1.8" strokeLinecap="round" />
    <path d="m31 98-7 8m65-8 7 8" stroke={color} strokeWidth="11" strokeLinecap="round" />
    <path d="m50 94 10 5 10-5-2 12-8-5-8 5Z" fill={kind === 'bunny' ? '#b8899b' : kind === 'bear' ? '#89a28a' : kind === 'fox' ? '#829dab' : '#d69787'} />
  </svg>
}
