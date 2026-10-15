import { expect, type Page } from '@playwright/test'

/** Check every friend's actual travel across samples, including pauses and return trips. */
export async function expectFriendsToWalk(page: Page, ids: string[]) {
  const positions = () => page.locator('.room-friend[data-testid^="room-"]').evaluateAll(nodes => nodes.map(node => ({
    id: node.getAttribute('data-testid')!.replace('room-', ''),
    x: Number(node.getAttribute('data-x')), y: Number(node.getAttribute('data-y')),
  })))
  const origins = new Map((await positions()).map(p => [p.id, p]))
  const waiting = new Set(ids)
  for (const id of ids) expect(origins.has(id), `${id} must be present before walking`).toBe(true)
  for (let second = 0; second < 15 && waiting.size; second++) {
    await page.clock.runFor(1000)
    for (const p of await positions()) {
      const origin = origins.get(p.id)
      if (origin && Math.hypot(p.x - origin.x, p.y - origin.y) >= 5) waiting.delete(p.id)
    }
  }
  expect([...waiting], 'Every requested friend must travel at least 5 room units within 15 seconds').toEqual([])
}
