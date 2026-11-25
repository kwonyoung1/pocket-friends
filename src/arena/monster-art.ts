/** HD atlases: five identities, four cells per identity, 128px each. */
export const HD_MONSTER_REGIONS=['eclipse','heaven','garden','dream','skycastle','star-temple'] as const
export function hdMonster(region:string){return (HD_MONSTER_REGIONS as readonly string[]).includes(region)}
export function monsterArtRow(region:string,row:number,id:string,boss:boolean){
 if(!hdMonster(region))return row
 if(region==='eclipse'||region==='heaven')return id.endsWith('-sovereign')?4:row
 return row===3?4:row===2&&boss?3:row
}
export function monsterArtCell(frame:number,hd:boolean){return frame===15||frame===16?3:frame>=10?hd?2:[10,13,17,18].includes(frame)?1:2:hd&&frame===1?1:0}
