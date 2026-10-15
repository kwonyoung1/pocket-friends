import type { Point } from './game.ts'

// Coordinates mark feet in the 1000 × 640 room. Furniture includes a walking clearance.
export type Obstacle = { x: number; y: number; w: number; h: number }
export const obstacles: Obstacle[] = [
  { x: 55, y: 180, w: 250, h: 135 },
  { x: 790, y: 150, w: 175, h: 135 },
  { x: 665, y: 420, w: 135, h: 95 },
  { x: 25, y: 430, w: 105, h: 100 },
]
export function walkable(p: Point, extra: Obstacle[] = []): boolean {
  return (
    p.x >= 50 &&
    p.x <= 950 &&
    p.y >= 230 &&
    p.y <= 570 &&
    ![...obstacles, ...extra].some(
      (o) => p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h,
    )
  )
}
export const cells: Point[] = []
for (let row = 0; row < 9; row++)
  for (let col = 0; col < 23; col++) {
    const p = { x: 50 + col * 40, y: 230 + row * 40 }
    if (walkable(p)) cells.push(p)
  }
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export function segmentWalkable(
  a: Point,
  b: Point,
  extra: Obstacle[] = [],
): boolean {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 3))
  for (let i = 0; i <= steps; i++)
    if (
      !walkable(
        {
          x: a.x + ((b.x - a.x) * i) / steps,
          y: a.y + ((b.y - a.y) * i) / steps,
        },
        extra,
      )
    )
      return false
  return true
}
function nearest(p: Point, extra: Obstacle[] = []) {
  const reachable = cells.filter((c) => segmentWalkable(p, c, extra))
  return reachable.reduce(
    (best, c) => (distance(c, p) < distance(best, p) ? c : best),
    reachable[0] ??
      cells
        .filter((c) => walkable(c, extra))
        .sort((a, b) => distance(a, p) - distance(b, p))[0] ??
      cells[0],
  )
}
/** Project an arbitrary pointer location onto the nearest legal floor position. */
export function validPosition(p: Point, extra: Obstacle[] = []): Point {
  const bounded = {
    x: Math.max(50, Math.min(950, p.x)),
    y: Math.max(230, Math.min(570, p.y)),
  }
  if (walkable(bounded, extra)) return bounded
  const candidates = [...obstacles, ...extra]
    .flatMap((o) => [
      { x: o.x - 1, y: bounded.y },
      { x: o.x + o.w + 1, y: bounded.y },
      { x: bounded.x, y: o.y - 1 },
      { x: bounded.x, y: o.y + o.h + 1 },
    ])
    .filter((p) => walkable(p, extra))
  return candidates.reduce(
    (best, c) => (distance(c, bounded) < distance(best, bounded) ? c : best),
    nearest(bounded, extra),
  )
}
export function findRoute(
  from: Point,
  to: Point,
  extra: Obstacle[] = [],
): Point[] {
  const start = nearest(from, extra),
    end = nearest(to, extra)
  const key = (p: Point) => `${p.x},${p.y}`
  const queue = [start],
    parents = new Map<string, Point | null>([[key(start), null]])
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]
    if (key(current) === key(end)) break
    // Four directions prevent diagonal clipping through furniture corners.
    for (const [dx, dy] of [
      [40, 0],
      [-40, 0],
      [0, 40],
      [0, -40],
    ]) {
      const p = { x: current.x + dx, y: current.y + dy }
      if (
        p.x > 930 ||
        p.y > 550 ||
        !walkable(p, extra) ||
        !segmentWalkable(current, p, extra) ||
        parents.has(key(p))
      )
        continue
      parents.set(key(p), current)
      queue.push(p)
    }
  }
  if (!parents.has(key(end))) return []
  const route: Point[] = []
  let cursor: Point | null = end
  while (cursor) {
    route.unshift(cursor)
    cursor = parents.get(key(cursor)) ?? null
  }
  return route
}
