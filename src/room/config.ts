export const roomScale=Math.sqrt(1.5)
export const room={width:1000*roomScale,height:640*roomScale,minX:50*roomScale,maxX:950*roomScale,minY:230*roomScale,maxY:570*roomScale,scale:roomScale} as const
export const scaledPoint=(p:{x:number;y:number})=>({x:p.x*roomScale,y:p.y*roomScale})
export const leftPercent=(x:number)=>`${100*x/room.width}%`
export const topPercent=(y:number)=>`${100*y/room.height}%`
