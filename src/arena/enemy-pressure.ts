/** Applied ONCE after the complete frozen-rules6 enemy scaling and rounding. */
export const CHAPTER_PRESSURE=[
 {hp:1,atk:1,def:1},{hp:1,atk:1,def:1},{hp:1,atk:1,def:1},{hp:1,atk:1,def:1},
 {hp:1.4,atk:1.6,def:1.2},{hp:1.5,atk:1.8,def:1.3},{hp:1.6,atk:2,def:1.4},{hp:1.7,atk:2.2,def:1.5},
 {hp:1.8,atk:2.4,def:1.6},{hp:1.85,atk:2.5,def:1.65},{hp:1.9,atk:2.6,def:1.7},{hp:1.95,atk:2.7,def:1.75},{hp:2,atk:2.8,def:1.8},{hp:2.05,atk:2.9,def:1.85},
] as const
export function pressureFor(chapter:number|undefined){return CHAPTER_PRESSURE[Math.max(0,Math.min(13,(chapter??1)-1))]}
