import { createFriends } from '../game.ts'
import type { Friend, Save } from '../game.ts'
import { growth, world } from '../progression/model.ts'
import { life } from '../expansion/model.ts'
import { specialCatalog, specialIds } from './config.ts'
export function makeSpecialFriend(id: string, now: number): Friend {
  const d = specialCatalog.find((d) => d.id === id)
  if (!d) throw Error('알 수 없는 특별 친구예요.')
  const f: Friend = {
    ...createFriends(now)[0],
    ...d,
    stats: {
      hunger: 78,
      happiness: 85,
      energy: 90,
      hygiene: 82,
      affection: 20,
    },
  }
  growth(f, now).traits.affectionate = 50
  life(f, now)
  return f
}
/** Append only missing fixed IDs. Never reconstruct or replace an existing friend. */
export function grantSpecialFriends(save: Save, now = Date.now()) {
  const w = world(save, now)
  let added = 0
  for (const id of specialIds)
    if (!save.friends.some((f) => f.id === id)) {
      save.friends.push(makeSpecialFriend(id, now))
      added++
    }
  w.specialFriendsVersion = 1
  return added
}
export function normalFriendCount(save: Save) {
  return save.friends.filter((f) => !specialIds.includes(f.id)).length
}
