/** Six distinct two-column slots in the enemy half; never modulo three. */
export function enemyLayout(index:number,count:number,boss:boolean,yScale=1){
 if(count<=3)return {x:boss?286:[270,325,253][index%3],y:(boss?335:[215,292,364][index%3])*yScale,scale:boss?1.95:1.27}
 const denseScale=Math.max(.5,Math.min(1,yScale))
 return {x:index%2?330:236,y:[145,285,425][Math.floor(index/2)]*yScale,scale:(boss?1.1:.9)*denseScale}
}
