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
/** AI-painted frames made with the existing hairstyle/outfit references. */
export const humanAssetManifest={
 source:'Image generation: new painted PNG/WebP art, not poses extracted from the original seated pictures.',
 images:{boy:'src/assets/characters/boy/idle.png',girl:'src/assets/characters/girl/idle.png'},
 authored:['standing','happy','closed-eyes','stride','passing-step','blanket-sleep'],
 extracted:[],missing:['side-view','rear-view','seated','surprised-face','separate-limb-layers'],
 fallback:'Two distinct painted leg poses cycle during walking. Rest uses closed eyes; surprise uses the existing exclamation effect. Original seated references are retained.',
}
