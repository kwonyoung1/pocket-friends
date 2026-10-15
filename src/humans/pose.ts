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
    p === 'settling' ||
    emotion === 'smile'
  )
    return 'smile'
  if ((f.furnitureUntil ?? 0) > now && f.furnitureActivity?.includes('놀이'))
    return 'play'
  if ((f.stats?.energy ?? 100) <= 30 || f.life?.coldAt) return 'sleepy'
  if (f.moving) return 'walk'
  if (f.life?.coldAt) return 'sleepy'
  if ((f.bubbleUntil ?? 0) > now && f.bubblePriority === 2) return 'smile'
  if ((f.restingUntil ?? 0) > now) return 'rest'
  return 'idle'
}
/** One seated illustration per character. Missing camera views are never fabricated. */
export const humanAssetManifest = {
  source:
    'User supplied single seated couple illustration; background removal and small occluded clothing contours repaired with image editing.',
  images: {
    boy: 'src/assets/humans/boy.png',
    girl: 'src/assets/humans/girl.png',
  },
  extracted: ['seated', 'smiling-front-three-quarter'],
  missing: [
    'neutral-standing',
    'exact-front',
    'side',
    'rear',
    'surprised-face',
    'sleepy-face',
    'walk-frames',
    'play-pose',
    'lying-sleep',
  ],
  fallback:
    'Fixed size/foot anchor; CSS motion and overlays reuse each original seated face without face warping.',
}
