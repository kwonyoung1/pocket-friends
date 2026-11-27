/** Display-only scene geometry. Never imported by combat/reward calculation. */
export type Box={x:number;y:number;width:number;height:number}
export type ScenePreset={id:string;crop:{top:number;bottom:number;left:number;right:number};ally:{back:number;front:number};enemy:{back:number;front:number};safe:number;scale:number;maxEnemies:6;floor:string}
const preset=(id:string,top:number,back:number,front:number,floor:string,scale=1):ScenePreset=>({id,crop:{top,bottom:.98,left:.02,right:.98},ally:{back:back+.01,front},enemy:{back,front:front-.015},safe:18,scale,maxEnemies:6,floor})
/** Feet sit in the painted foreground, after the crop is projected. No shared sky Y. */
export const SCENE_PRESETS:Record<string,ScenePreset>={
 forest:preset('forest',.31,.53,.94,'달빛 흙길'),lake:preset('lake',.31,.55,.93,'호숫가 석재'),cave:preset('cave',.30,.54,.94,'수정 동굴 바닥'),ruins:preset('ruins',.32,.55,.94,'유적 석판'),
 canyon:preset('canyon',.32,.54,.94,'용암 앞 석재 길'),snow:preset('snow',.34,.55,.94,'눈 덮인 광장'),shadow:preset('shadow',.33,.55,.94,'그림자 숲길'),sanctuary:preset('sanctuary',.32,.54,.94,'성역 광장'),
 eclipse:preset('eclipse',.34,.54,.94,'성채 석재 바닥'),heaven:preset('heaven',.34,.55,.94,'천상 광장'),garden:preset('garden',.36,.56,.94,'별꽃의 길'),dream:preset('dream',.36,.56,.94,'미궁 회랑'),skycastle:preset('skycastle',.36,.56,.94,'성의 테라스'),'star-temple':preset('star-temple',.36,.56,.94,'신전 석판'),christmas:preset('christmas',.32,.55,.94,'겨울 마을 눈길'),
}
export const scenePreset=(region='forest')=>SCENE_PRESETS[region]??SCENE_PRESETS.forest
export type Footprint={width:number;height:number;footX:number;footY:number;tile:number}
export type LayoutUnit={id:string;side:'ally'|'enemy';boss:boolean;footprint?:Footprint}
export type Slot={id:string;side:'ally'|'enemy';x:number;y:number;scale:number;width:number;height:number;depth:number;index:number;label:Box;shadow:{width:number;height:number;alpha:number}}
export type SceneLayout={preset:ScenePreset;viewport:Box;allyZone:Box;enemyZone:Box;slots:Slot[];camera:{x:number;y:number;maxZoom:number}}
type Point=[number,number]
const formations:Record<number,Point[]>={1:[[.5,.5]],2:[[.18,.2],[.82,.85]],3:[[.15,0],[.85,0],[.5,1]],4:[[.18,0],[.82,0],[.18,1],[.82,1]],5:[[.18,0],[.82,0],[.04,1],[.5,1],[.96,1]],6:[[.04,0],[.5,0],[.96,0],[.04,1],[.5,1],[.96,1]]}
const bossFormations:Record<number,Point[]>={1:[[.5,.6]],2:[[.5,0],[.2,1]],3:[[.5,0],[.12,1],[.88,1]],4:[[.5,0],[.05,.52],[.95,.52],[.5,1]],5:[[.5,0],[.05,.5],[.95,.5],[.2,1],[.8,1]],6:[[.5,0],[.05,.5],[.95,.5],[.04,1],[.5,1],[.96,1]]}
const allyFormations:Record<number,Point[]>={1:[[.55,.66]],2:[[.25,.22],[.8,.85]],3:[[.18,0],[.82,.44],[.18,1]],4:[[.15,0],[.85,.18],[.15,.8],[.85,1]],5:[[.15,0],[.85,.16],[.15,.5],[.85,.66],[.15,1]]}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))
/** Source-image crop is aspect-correct cover, never width/height stretching. */
export function backgroundFrame(w:number,h:number,sourceWidth:number,sourceHeight:number,p:ScenePreset):Box{
 const sw=sourceWidth*(p.crop.right-p.crop.left),sh=sourceHeight*(p.crop.bottom-p.crop.top),scale=Math.max(w/sw,h/sh)
 return{x:(w-sw*scale)/2-p.crop.left*sourceWidth*scale,y:(h-sh*scale)/2-p.crop.top*sourceHeight*scale,width:sourceWidth*scale,height:sourceHeight*scale}
}
export function sceneLayout(units:readonly LayoutUnit[],height:number,region='forest'):SceneLayout{
 const h=clamp(height,260,560),p=scenePreset(region),safe=p.safe,viewport={x:safe,y:40,width:390-safe*2,height:h-54},allyZone={x:safe+3,y:p.ally.back*h,width:157,height:(p.ally.front-p.ally.back)*h},enemyZone={x:212,y:p.enemy.back*h,width:157,height:(p.enemy.front-p.enemy.back)*h},slots:Slot[]=[]
 for(const side of ['ally','enemy'] as const){const group=units.filter(u=>u.side===side),bossIndex=group.findIndex(u=>u.boss),zone=side==='ally'?allyZone:enemyZone,points=side==='ally'?allyFormations[Math.min(5,group.length)]:bossIndex>=0?bossFormations[Math.min(6,group.length)]:formations[Math.min(6,group.length)]
  if(group.length>(side==='ally'?5:6))throw Error('Display formation exceeds supported party size')
  group.forEach((u,index)=>{const order=bossIndex<0||side==='ally'?index:index===bossIndex?0:index<bossIndex?index+1:index,point=points[order],fp=u.footprint??{width:48,height:56,footX:32,footY:60,tile:64},depth=point[1],x=zone.x+24+point[0]*(zone.width-48),y=zone.y+depth*zone.height
   const neighbors=points.filter((q,i)=>i!==order&&Math.abs(q[1]-depth)<.3),gap=neighbors.length?Math.min(...neighbors.map(q=>Math.abs(q[0]-point[0])*(zone.width-48))):120
   const vertical=points.filter((q,i)=>i!==order&&Math.abs(q[0]-point[0])<.34&&q[1]<depth),headRoom=vertical.length?Math.min(...vertical.map(q=>(depth-q[1])*zone.height))-17:110
   const desired=(u.boss?group.length===1?94:76:side==='ally'?group.length===5?54:60:group.length>=4?48:58)*p.scale*(.96+depth*.06)
   const bodyHeight=Math.min(desired,headRoom,y-viewport.y-18),bodyWidth=Math.min(gap-7,2*(x-viewport.x)-6,2*(viewport.x+viewport.width-x)-6,side==='enemy'&&group.length>=4&&!u.boss?50:u.boss?90:67)
   const scale=Math.max(.1,Math.min(bodyHeight/fp.height,bodyWidth/fp.width)),width=fp.width*scale,actualHeight=fp.height*scale,labelWidth=Math.min(50,Math.max(35,gap-6))
   slots.push({id:u.id,side,x,y,scale,width,height:actualHeight,depth,index,label:{x:clamp(x-labelWidth/2,viewport.x,viewport.x+viewport.width-labelWidth),y:y-actualHeight-17,width:labelWidth,height:14},shadow:{width:width*.73,height:Math.max(3,width*.12),alpha:.22+depth*.13}})
  })
 }
 // Small header-plate collisions are packed laterally; bodies retain their ground anchors.
 const placed:Box[]=[]
 for(const slot of [...slots].sort((a,b)=>a.label.y-b.label.y||a.x-b.x)){const b=slot.label;for(let n=0;n<8&&placed.some(a=>overlap(a,b,2));n++){const side=slot.side==='ally'?allyZone:enemyZone;b.x=clamp(b.x+(n%2?-1:1)*(7+n*2),side.x,side.x+side.width-b.width);if(n===7)b.y=Math.max(viewport.y,b.y-15)}placed.push(b)}
 return{preset:p,viewport,allyZone,enemyZone,slots,camera:{x:195,y:h*.57,maxZoom:units.filter(u=>u.side==='enemy').length>=4?1.025:1.04}}
}
export function overlap(a:Box,b:Box,gap=0){return a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y}
/** Compatibility helper for callers using the old display API; no battle stats involved. */
export function enemyLayout(index:number,count:number,boss:boolean,yScale=1){
 if(count<=3)return {x:boss?286:[270,325,253][index%3],y:(boss?335:[215,292,364][index%3])*yScale,scale:boss?1.95:1.27}
 const denseScale=Math.max(.5,Math.min(1,yScale));return{x:index%2?330:236,y:[145,285,425][Math.floor(index/2)]*yScale,scale:(boss?1.1:.9)*denseScale}
}
/** Alpha bounds ignore transparent tile padding; measured once per decoded atlas frame. */
export function alphaFootprint(data:ArrayLike<number>,width:number,height:number,tile=width):Footprint{let left=width,top=height,right=-1,bottom=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}return right<0?{width:tile*.7,height:tile*.8,footX:tile/2,footY:tile*.95,tile}:{width:right-left+1,height:bottom-top+1,footX:(left+right+1)/2,footY:bottom+1,tile}}
