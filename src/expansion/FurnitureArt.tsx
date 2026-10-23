import { itemById } from '../progression/config'
import {furnitureShape} from './artConfig'
/** Local SVG illustrations: stable asset identity, no remote images or photo processing. */
export function FurnitureArt({ itemId,worldSize }: { itemId: string;worldSize?:{w:number;h:number} }) {
  const item = itemById[itemId],
    parts = itemId.split('-'),
    grade = item?.rarity ?? 'common',
    g = itemId.startsWith('decor-') ? Number(parts[1]) : 0
  const shape=furnitureShape(itemId)
  const color = ['#94b89a', '#91b8c8', '#baa4d4', '#d6b45f'][g],
    accent = ['#eab4ab', '#e4b9ce', '#aad5d4', '#f4e4ac'][g],
    wood = '#b58e70',
    ink = '#8e7760'
  return (
    <svg
      viewBox={worldSize?`0 0 ${worldSize.w} ${worldSize.h}`:"0 0 100 110"}
      preserveAspectRatio={worldSize?"none":"xMidYMid meet"}
      className={`furniture-art furniture-${grade}`}
      data-art={itemId}
      aria-hidden="true"
    >
      <g transform={worldSize?`translate(${(worldSize.w-100*Math.min(worldSize.w/100,worldSize.h/110))/2} ${(worldSize.h-110*Math.min(worldSize.w/100,worldSize.h/110))/2}) scale(${Math.min(worldSize.w/100,worldSize.h/110)})`:undefined}>
      <ellipse cx="50" cy="99" rx="35" ry="7" fill="#6b5544" opacity=".14" />
      <g
        data-placement-body
        stroke={ink}
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {['plant', 'rainbow', 'cactus'].includes(shape) && (
          <>
            <path
              d="M31 74h38l-6 24H37Z"
              fill={g === 3 ? '#eee1b3' : '#cda486'}
            />
            {shape === 'cactus' ? (
              <>
                <path
                  d="M50 75V27m0 28H31V40m19 22h19V44"
                  stroke={color}
                  strokeWidth="17"
                  fill="none"
                />
                <path
                  d="M48 75V28m-18 12v13m39-8v14"
                  stroke="#fff6cf"
                  strokeWidth="2"
                />
                <circle cx="50" cy="23" r="7" fill={accent} />
              </>
            ) : (
              <>
                <path d="M50 75V27" stroke="#7e9c74" strokeWidth="4" />
                <path
                  d="M48 59Q13 58 23 28q28 3 25 31Zm4-10q-3-31 27-31 7 26-27 31Z"
                  fill={color}
                />
                <path
                  d="M50 31q-15-20 0-27 17 10 0 27Z"
                  fill={shape === 'rainbow' ? '#edbead' : accent}
                />
                {shape === 'rainbow' && (
                  <>
                    <path
                      d="M21 44q6-30 22-24"
                      fill="none"
                      stroke="#d9a9c0"
                      strokeWidth="4"
                    />
                    <path
                      d="M58 36q13-25 20-12"
                      fill="none"
                      stroke="#f1d58a"
                      strokeWidth="4"
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
        {['chair', 'throne'].includes(shape) && (
          <>
            <path d="M29 77v23m42-23v23" stroke={wood} strokeWidth="6" />
            <rect
              x="23"
              y="32"
              width="54"
              height="46"
              rx="8"
              fill={shape === 'throne' ? color : wood}
            />
            <path d="M22 65h56v19H22Z" fill={accent} />
            <path
              d="M22 57v27m56-27v27"
              stroke={shape === 'throne' ? color : wood}
              strokeWidth="8"
            />
            {shape === 'throne' && (
              <path
                d="m28 33-4-21 17 10 9-17 10 17 16-10-4 21Z"
                fill="#edcf7d"
              />
            )}
          </>
        )}
        {shape === 'stones' && (
          <>
            <ellipse cx="35" cy="80" rx="20" ry="15" fill="#b6b5a5" />
            <ellipse cx="65" cy="86" rx="19" ry="12" fill="#d3cabc" />
            <ellipse cx="55" cy="63" rx="18" ry="17" fill="#a6b5a2" />
            <path d="m50 55 9-4m-34 24 9-2" stroke="#f2e8d4" strokeWidth="3" />
          </>
        )}
        {shape === 'basket' && (
          <>
            <path d="M24 66h52l-8 31H32Z" fill={wood} />
            <path
              d="M31 66V48a19 19 0 0 1 38 0v18"
              fill="none"
              stroke={wood}
              strokeWidth="5"
            />
            {[30, 50, 70].map((x, i) => (
              <g key={x}>
                <path d={`M${x} 73V49`} stroke="#83a276" strokeWidth="3" />
                <circle
                  cx={x}
                  cy={48 - (i % 2) * 8}
                  r="12"
                  fill={i % 2 ? accent : '#edd190'}
                />
                <circle cx={x} cy={48 - (i % 2) * 8} r="4" fill="#fdf0bd" />
              </g>
            ))}
            <path d="M29 78h43m-39 9h36m-22-18v24m11-24v24" stroke="#e2c1a0" />
          </>
        )}
        {shape === 'mushroom' && (
          <>
            <path d="M41 55h18l9 40H32Z" fill="#f4e6c8" />
            <path d="M14 57q4-48 36-48t36 48Q50 70 14 57Z" fill={accent} />
            <circle cx="34" cy="36" r="6" fill="#fff5df" />
            <circle cx="63" cy="28" r="7" fill="#fff5df" />
            <circle cx="71" cy="50" r="5" fill="#fff5df" />
          </>
        )}
        {shape === 'frame' && (
          <>
            <path d="m49 83-8 17h18l-8-17Z" fill={wood} />
            <rect x="17" y="23" width="66" height="64" rx="7" fill={wood} />
            <rect x="24" y="30" width="52" height="50" fill="#faf2da" />
            <circle cx="60" cy="43" r="8" fill="#eacf8c" />
            <path d="m28 74 16-25 14 21 10-12 6 16Z" fill={color} />
          </>
        )}
        {['cushion', 'heart'].includes(shape) && (
          <>
            <path
              d="M18 63q-7-17 7-22l25 7 25-7q14 5 7 22l-4 24q-7 15-28 7-21 8-28-7Z"
              fill={color}
            />
            <path
              d="M26 57q24 10 48 0m-47 26q23-9 46 0"
              stroke="#f7e8d5"
              fill="none"
            />
            {shape === 'heart' && (
              <path
                d="M50 80 34 64q-8-16 7-16 7 0 9 8 3-8 10-8 15 0 7 16Z"
                fill={accent}
              />
            )}
          </>
        )}
        {shape === 'shell' && (
          <>
            <path
              d="M47 96Q7 77 13 56q2-10 13-8-1-19 14-16 9-16 20-3 17-5 19 13 19 1 10 22L54 96Z"
              fill={accent}
            />
            <path
              d="m50 92-30-35m30 35L34 42m16 50 1-55m-1 55 21-44m-21 44 30-31"
              fill="none"
              stroke="#f8e3ca"
              strokeWidth="3"
            />
          </>
        )}
        {shape === 'fountain' && (
          <>
            <ellipse cx="50" cy="86" rx="35" ry="12" fill={color} />
            <path d="M20 86v8q30 13 60 0v-8" fill={color} />
            <path
              d="M50 81V25m0 0q-25 4-24 28m24-28q25 4 24 28"
              stroke={g === 3 ? '#c8b7e8' : '#abd6e1'}
              strokeWidth="5"
              fill="none"
            />
            <ellipse cx="50" cy="61" rx="22" ry="8" fill="#d8eced" />
            <path d="M50 51v32" stroke="#edf9f0" strokeWidth="3" />
            <circle cx="50" cy="19" r="6" fill={accent} />
            {g === 3 && (
              <path d="m29 75 4-8 4 8-4 7m25-1 3-7 3 7-3 6" fill="#fff0b6" />
            )}
          </>
        )}
        {['lamp', 'moon'].includes(shape) && (
          <>
            <path
              d="M50 43v51m-18 5h36"
              fill="none"
              stroke={wood}
              strokeWidth="5"
            />
            {shape === 'moon' ? (
              <path
                d="M67 12a25 25 0 1 1-31 4 21 21 0 0 0 31-4Z"
                fill="#f2dfaa"
              />
            ) : (
              <path
                d="m50 9 10 20 22 3-16 16 4 22-20-11-20 11 4-22-16-16 22-3Z"
                fill={accent}
              />
            )}
          </>
        )}
        {shape === 'aquarium' && (
          <>
            <rect x="12" y="32" width="76" height="61" rx="8" fill="#acd4db" />
            <path
              d="M13 48q17-8 37 0t37 0"
              fill="none"
              stroke="#e6f4ed"
              strokeWidth="3"
            />
            <path d="M16 88h68" stroke="#d1be95" strokeWidth="8" />
            <path
              d="M25 85q-8-12-2-24m52 24q6-13 1-31"
              stroke="#7eaf91"
              strokeWidth="5"
            />
            <ellipse cx="48" cy="66" rx="13" ry="8" fill={accent} />
            <path d="m61 66 10-8v16Z" fill={accent} />
            <circle cx="43" cy="64" r="1.7" fill="#776052" />
          </>
        )}
        {shape === 'doll' && (
          <>
            <circle cx="30" cy="34" r="12" fill={color} />
            <circle cx="70" cy="34" r="12" fill={color} />
            <ellipse cx="50" cy="74" rx="26" ry="23" fill={color} />
            <ellipse cx="50" cy="48" rx="28" ry="22" fill={color} />
            <ellipse cx="50" cy="54" rx="12" ry="8" fill="#f4e8d5" />
            <path d="m46 50 4 4 4-4" fill={wood} />
            <circle cx="36" cy="44" r="2" />
            <circle cx="64" cy="44" r="2" />
            <path d="M31 80 22 94m47-14 9 14" stroke={color} strokeWidth="12" />
            <path d="m41 68 9 4 9-4v10l-9-4-9 4Z" fill={accent} />
          </>
        )}
        {shape === 'clock' && (
          <>
            <path d="M50 10v17m-14-4 14-13 14 13" fill={accent} />
            <circle cx="50" cy="62" r="32" fill={color} />
            <circle cx="50" cy="62" r="25" fill="#fff5de" />
            <path
              d="M50 43v19l15 9"
              fill="none"
              stroke={wood}
              strokeWidth="4"
            />
            <circle cx="50" cy="62" r="3" fill={accent} />
          </>
        )}
        {shape === 'tree' && (
          <>
            <path d="M42 97 46 51h8l5 46Z" fill={wood} />
            <path d="m50 72-18-15m19 8 17-15" stroke={wood} strokeWidth="6" />
            <circle cx="30" cy="43" r="21" fill={color} />
            <circle cx="69" cy="41" r="23" fill={color} />
            <circle cx="49" cy="24" r="23" fill={color} />
            {[27, 50, 73].map((x, i) => (
              <path
                key={x}
                d={`m${x} ${26 + i * 4} 2 5 6 1-5 4 1 6-4-4-5 3 1-6-4-4 6 0Z`}
                fill={accent}
              />
            ))}
            {g === 3 && (
              <path d="m20 82 4-6 4 6-4 5m46-8 4-7 4 7-4 6" fill="#f1d788" />
            )}
          </>
        )}
        {shape === 'telescope' && (
          <>
            <path
              d="m50 62-22 36m22-36 22 36m-22-36v36"
              stroke={wood}
              strokeWidth="5"
            />
            <path d="m26 39 49-20 10 27-49 20Z" fill={color} />
            <ellipse
              cx="80"
              cy="32"
              rx="9"
              ry="15"
              transform="rotate(-20 80 32)"
              fill="#d0e9ec"
            />
            <path d="m30 42 6 18" stroke={accent} strokeWidth="7" />
          </>
        )}
        {shape === 'chest' && (
          <>
            <rect x="19" y="49" width="62" height="46" rx="8" fill={color} />
            <path d="M19 53V37q31-25 62 0v16Z" fill={accent} />
            <path
              d="M19 58h62m-44-7v43m27-43v43"
              stroke="#f0d9a1"
              strokeWidth="5"
            />
            <rect x="44" y="54" width="12" height="18" rx="3" fill="#e7c773" />
          </>
        )}
        {shape === 'bed' && (
          <>
            <path d="M14 50v49m72-33v33" stroke={wood} strokeWidth="7" />
            <rect x="17" y="58" width="66" height="30" rx="7" fill={color} />
            <rect x="21" y="50" width="24" height="15" rx="6" fill="#f8ecd9" />
            <path d="M47 63h33v18H47Z" fill={accent} />
            <path
              d="m62 66 2 4 5 1-4 3 1 5-4-3-5 3 2-5-4-3 5-1Z"
              fill="#fff2bf"
            />
          </>
        )}
        {shape === 'orb' && (
          <>
            <path d="M32 86h36l9 12H23Z" fill={wood} />
            <circle cx="50" cy="52" r="31" fill="#b8badb" />
            <path
              d="M27 48q20-27 46-3M25 60q25-20 49 2"
              fill="none"
              stroke="#c6e3d4"
              strokeWidth="7"
            />
            <path
              d="M34 35q10-10 21-7"
              fill="none"
              stroke="#fff7dd"
              strokeWidth="4"
            />
          </>
        )}
        {shape === 'hourglass' && (
          <>
            <path d="M24 15h52M24 97h52" stroke={wood} strokeWidth="8" />
            <path
              d="M29 20q-2 25 21 36-23 12-21 36h42q2-24-21-36 23-11 21-36Z"
              fill="#d2e7e5"
            />
            <path d="m32 34 18 19 18-19Zm0 55 18-20 18 20Z" fill={accent} />
            <path d="M50 56v12" stroke="#e6bd6c" strokeWidth="3" />
          </>
        )}
        {shape === 'egg' && (
          <>
            <path
              d="M50 16c-19 0-34 38-34 53 0 19 14 30 34 30s34-11 34-30c0-15-15-53-34-53Z"
              fill={accent}
            />
            <path
              d="m22 63 13-9 13 12 15-11 14 10m-40 8 9 9m13-47 8 12"
              fill="none"
              stroke={color}
              strokeWidth="5"
            />
          </>
        )}
        {shape === 'bookshelf' && (
          <>
            <path d="M15 18h70v79H15Z" fill={wood} />
            <path d="M22 26h56v26H22Zm0 34h56v28H22Z" fill="#e3c5a4" />
            {[25, 37, 49, 61].map((x, i) => (
              <g key={x}>
                <path
                  d={`M${x} 29h9v22h-9Zm0 35h9v22h-9Z`}
                  fill={i % 2 ? color : accent}
                />
                <path d={`M${x + 2} 35h5m-5 35h5`} stroke="#fcf0ca" />
              </g>
            ))}
            <path d="M11 55h78" stroke={wood} strokeWidth="6" />
          </>
        )}
      </g>
      <path
        d="m83 9 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"
        fill={grade === 'legendary' ? '#e0b84c' : '#fff4d5'}
      />
      </g>
    </svg>
  )
}
