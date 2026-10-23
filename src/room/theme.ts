import type {Save} from '../game.ts'
export type RoomThemeId='default'|'halloween'
export type RoomTheme={id:RoomThemeId;changedAt:number}
export const themeLabels={default:'기본',halloween:'할로윈'} as const
export function roomTheme(s:Save):RoomThemeId{return s.world?.roomTheme?.id??'default'}
export function changeRoomTheme(s:Save,id:RoomThemeId,now:number){
 if(id!=='default'&&id!=='halloween')throw Error('방 테마를 확인해 주세요.')
 if(!s.world)throw Error('먼저 방을 불러와 주세요.')
 if(roomTheme(s)!==id)s.world.roomTheme={id,changedAt:now}
 return `${themeLabels[id]} 테마로 꾸몄어요!`
}
