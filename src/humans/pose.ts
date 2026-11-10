import type { Friend } from '../game.ts'
import { sleeping } from '../expansion/model.ts'
export type HumanPose =
  | 'idle'
  | 'walk'
  | 'smile'
  | 'happy'
  | 'surprised'
  | 'sleepy'
  | 'rest'
  | 'play'
  | 'sleep'
export function humanPose(
  f: Pick<Friend, 'kind'> & Partial<Friend>,
  emotion: string,
  now: number,
): HumanPose {
  if (f.id && sleeping(f as Friend, now)) return 'sleep'
  if (f.life?.bath) return 'rest'
  const p = f.interaction?.phase
  if (p === 'dragging' || p === 'pressing') return 'surprised'
  if (p === 'bonding' || (f.growth?.levelUpUntil ?? 0) > now) return 'happy'
  if (
    p === 'petting' ||
    p === 'delighted' ||
    p === 'settling'
  )
    return 'smile'
  if(f.moving)return 'walk'
  if ((f.furnitureUntil ?? 0) > now && f.furnitureActivity?.includes('놀이'))
    return 'play'
  if ((f.stats?.energy ?? 100) <= 30 || f.life?.coldAt) return 'sleepy'
  if (emotion==='smile')return 'smile'
  if ((f.bubbleUntil ?? 0) > now && f.bubblePriority === 2) return 'smile'
  if ((f.restingUntil ?? 0) > now) return 'rest'
  return 'idle'
}
/** Original SVG layers, newly authored from the existing hair and outfit identity. */
export const humanAssetManifest={
 source:'New original layered SVG artwork. Existing seated PNGs are retained as historical sources; poses are not extracted from them.',
 images:{boy:'src/assets/characters-v2/boy.svg',girl:'src/assets/characters-v2/girl.svg'},
 authored:['standing','smile','happy','sleepy','surprised','seated','blanket-sleep'],
 extracted:[],missing:['side-view','rear-view','hand-drawn-walk-frame-sheet'],
 fallback:'Walking articulates the new separate standing legs/arms. Sleep uses a new pillow/blanket layer, not an extracted lying photograph.',
}
