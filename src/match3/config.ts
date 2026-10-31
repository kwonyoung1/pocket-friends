export const SIZE=8
export const COLORS=['루비','사파이어','에메랄드','자수정','토파즈','다이아몬드','호박석'] as const
export const COMBOS=[1,1.5,2,3,4,5] as const
export const CHEERS=['GOOD!','GREAT!','AMAZING!','FANTASTIC!','INCREDIBLE!','LEGENDARY COMBO!']
export const DIRECT_MULTIPLIERS=[1,1.3,1.6,2,2.5,3,3.5,4,4.5,5]
export const directMultiplier=(combo:number)=>combo>=20?8:combo>=15?7:combo>=11?6:DIRECT_MULTIPLIERS[Math.max(0,combo-1)]??1
export const LEGACY_CHALLENGE_TIERS=[{at:0,colors:5,candidates:5},{at:5000,colors:5,candidates:5},{at:15000,colors:6,candidates:4},{at:30000,colors:6,candidates:4},{at:50000,colors:7,candidates:3},{at:80000,colors:7,candidates:3},{at:120000,colors:7,candidates:2}]
export const CHALLENGE_TIERS=LEGACY_CHALLENGE_TIERS.map((tier,i)=>({...tier,at:[0,3000,8000,15000,25000,40000,60000][i]}))
export const stages=Array.from({length:30},(_,i)=>{
 const n=i+1,anchors=[[1,2000],[5,5000],[10,9000],[20,18000],[30,32000]]
 const end=anchors.findIndex(([stage])=>stage>=n),[b,y]=anchors[end],[a,x]=anchors[Math.max(0,end-1)]
 // Seven colors sharply reduce cascades: seeded simulations could not reach 26,400–32,000.
 const target=n>=26?10000+(n-26)*1000:a===b?y:Math.round(x+(y-x)*(n-a)/(b-a))
 return {id:n,colors:n<=10?5:n<=25?6:7,moves:n<=5?25:n<=15?23:n<=20?21:20,target,ice:n<16?0:n<=20?4:n<=25?8:12,layers:n<21?1:2}
})
export const durations={IDLE:0,SWAPPING:120,MATCHING:20,CLEARING:190,FALLING:160,REFILLING:20,CASCADING:20} as const
