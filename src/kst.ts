// Calendar dates for clocks and competition ranks always reset at Korean midnight,
// independently of configurable mission reset hours.
export const kstDateKey=(at:number)=>new Date(at+9*3600000).toISOString().slice(0,10)
export const untilKstMidnight=(at:number)=>86400000-((at+9*3600000)%86400000)
