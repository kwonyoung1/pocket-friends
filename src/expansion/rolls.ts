import { lifeBalance, tripEvents } from './config.ts'
/** Three separate server RNG draws per trip, never per loot item or on reload. */
export function rollTripExtras(random: () => number) {
  const cold = random() < lifeBalance.coldChance,
    hamster = random() < lifeBalance.hamsterChance,
    value = random()
  let threshold = 0
  for (const event of tripEvents) {
    threshold += event.chance
    if (value < threshold)
      return { cold, hamster, eventId: event.id, bonusCoins: event.coins }
  }
  return { cold, hamster, eventId: undefined, bonusCoins: 0 }
}
