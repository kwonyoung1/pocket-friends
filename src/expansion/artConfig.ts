// Shared by SVG rendering and server placement bounds (100 × 110 art coordinates).
const shapes=[['plant','chair','stones','basket','mushroom','frame','cushion','shell'],['plant','heart','fountain','lamp','cactus','aquarium','doll','clock'],['rainbow','cactus','moon','tree','fountain','telescope','chest','bed'],['tree','throne','orb','fountain','hourglass','egg','plant','bookshelf']]
export function furnitureShape(id:string){const [,grade,index]=id.split('-');return id==='light'?'lamp':id==='decoration'?'orb':id.startsWith('decor-')?shapes[Number(grade)]?.[Number(index)]??'plant':'plant'}
// Conservative ink bounds, including body strokes, excluding shadows and decorative sparkles.
export const furnitureInk:Record<string,{left:number;top:number;right:number;bottom:number}>={
 plant:{left:17,top:2,right:86,bottom:100},rainbow:{left:17,top:2,right:86,bottom:100},cactus:{left:21,top:15,right:79,bottom:100},
 chair:{left:17,top:30,right:83,bottom:104},throne:{left:17,top:3,right:83,bottom:104},stones:{left:14,top:45,right:85,bottom:99},
 basket:{left:17,top:27,right:83,bottom:99},mushroom:{left:13,top:8,right:87,bottom:97},frame:{left:16,top:22,right:84,bottom:102},
 cushion:{left:10,top:39,right:90,bottom:100},heart:{left:10,top:39,right:90,bottom:100},shell:{left:6,top:18,right:96,bottom:98},
 fountain:{left:14,top:12,right:86,bottom:102},lamp:{left:17,top:8,right:83,bottom:103},moon:{left:20,top:10,right:81,bottom:103},
 aquarium:{left:11,top:31,right:89,bottom:94},doll:{left:15,top:21,right:85,bottom:102},clock:{left:17,top:9,right:83,bottom:95},
 tree:{left:8,top:0,right:93,bottom:99},telescope:{left:23,top:13,right:95,bottom:102},chest:{left:18,top:23,right:82,bottom:97},
 bed:{left:9,top:45,right:91,bottom:104},orb:{left:18,top:20,right:82,bottom:100},hourglass:{left:19,top:10,right:81,bottom:102},
 egg:{left:15,top:15,right:85,bottom:101},bookshelf:{left:7,top:17,right:93,bottom:99},
}
