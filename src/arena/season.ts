export const WINTER_EVENT={id:'winter-2026',name:'겨울밤의 선물',stageId:'xmas-2026',startsAt:Date.parse('2026-12-01T00:00:00+09:00'),endsAt:Date.parse('2027-01-01T00:00:00+09:00'),energy:10} as const
export const eventOpen=(now:number)=>now>=WINTER_EVENT.startsAt&&now<WINTER_EVENT.endsAt
export const eventLabel=(now:number)=>now<WINTER_EVENT.startsAt?'12월 1일 시작 예정':now>=WINTER_EVENT.endsAt?'이벤트 종료':'이벤트 진행 중'
