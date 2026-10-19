import type {Stats} from '../game.ts'
export const statusBalance={
 version:1 as const,
 // Natural energy is +8, not a multiplier of the former decay or any sleep bonus.
 perHour:{hunger:-9,hygiene:-9,happiness:-6.6,energy:8},
 needPenaltyPerHour:{hunger:3.6,hygiene:2.4},
 penaltyThreshold:10,
} as const
const clamp=(n:number)=>Math.max(0,Math.min(100,n))
export function naturalChange(stats:Stats,milliseconds:number):Stats{
 const hours=Math.max(0,milliseconds)/3600000,{perHour:r,needPenaltyPerHour:p,penaltyThreshold:limit}=statusBalance
 // Integrate threshold crossings rather than charging an entire interval at its starting rate.
 // This makes frequent updates equivalent to one offline update, including fractional milliseconds.
 const hungryHours=Math.max(0,hours-Math.max(0,(stats.hunger-limit)/-r.hunger))
 const dirtyHours=Math.max(0,hours-Math.max(0,(stats.hygiene-limit)/-r.hygiene))
 return {hunger:clamp(stats.hunger+r.hunger*hours),hygiene:clamp(stats.hygiene+r.hygiene*hours),energy:clamp(stats.energy+r.energy*hours),happiness:clamp(stats.happiness+r.happiness*hours-p.hunger*hungryHours-p.hygiene*dirtyHours),affection:stats.affection}
}
// Used once when an unmarked pre-update world is first settled. Never apply new rules retroactively.
export function legacyChange(stats:Stats,milliseconds:number):Stats{
 const minutes=Math.max(0,Math.min(milliseconds,8*3600000))/60000
 return {hunger:clamp(stats.hunger-minutes*.45),happiness:clamp(stats.happiness-minutes*(.22+(stats.hunger<=10?.12:0)+(stats.hygiene<=10?.08:0))),energy:clamp(stats.energy-minutes*.16),hygiene:clamp(stats.hygiene-minutes*.3),affection:stats.affection}
}
