/** Cosmetic scheduling must never consume the simulation's seeded Math.random.
 * Visibility, viewport and reduced-motion settings may change call counts.
 */
export function visualRandom(){return crypto.getRandomValues(new Uint32Array(1))[0]/4294967296}
