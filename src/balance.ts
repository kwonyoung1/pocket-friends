/** Interaction balance. Times are milliseconds; drag thresholds are CSS pixels. */
export const interactionBalance = {
  holdStartMs: 800,
  bondMs: 2000,
  resumeMs: 1500,
  tapEffectMs: 1600,
  landingMs: 450,
  rewardCooldownMs: 10000,
  dragThreshold: { mouse: 8, touch: 12, pen: 10 },
  followSpeed: 24,
  normal: { happiness: 2, affection: 1 },
  special: { happiness: 5, affection: 3 },
  // Fraction measured from the top of the character's rendered image, not AI recognition.
  headByFriend: {
    momo: { normal: .64, photo: .5 },
    bibi: { normal: .64, photo: .5 },
    coco: { normal: .64, photo: .5 },
    dudu: { normal: .64, photo: .5 },
  } as Record<string, { normal: number; photo: number }>,
  headCutoff: { cat: .64, bunny: .64, bear: .64, fox: .64, photo: .5 },
} as const
