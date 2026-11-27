import {test,expect} from 'vitest'
import {sceneLayout,SCENE_PRESETS,backgroundFrame,alphaFootprint,overlap} from './battle-layout.ts'
const small={width:42,height:54,footX:32,footY:60,tile:64},large={width:82,height:98,footX:64,footY:120,tile:128}
for(const region of ['forest','canyon','snow','eclipse'])for(const height of [300,340,460])for(const count of [1,2,3,4,5,6])for(const boss of [false,true])test(`${region} ${height}px ${count} enemies boss=${boss} stay on ground without body/plate overlap`,()=>{
 const units=[...Array.from({length:5},(_,i)=>({id:'ally-'+i,side:'ally' as const,boss:false,footprint:small})),...Array.from({length:count},(_,i)=>({id:'enemy-'+i,side:'enemy' as const,boss:boss&&i===0,footprint:i%3===0?large:small}))],s=sceneLayout(units,height,region)
 for(const p of s.slots){const zone=p.side==='ally'?s.allyZone:s.enemyZone;expect(p.x-p.width/2).toBeGreaterThanOrEqual(s.viewport.x);expect(p.x+p.width/2).toBeLessThanOrEqual(s.viewport.x+s.viewport.width);expect(p.y).toBeGreaterThanOrEqual(zone.y);expect(p.y).toBeLessThanOrEqual(zone.y+zone.height+.01);expect(p.y-p.height-17).toBeGreaterThanOrEqual(s.viewport.y-.01);expect(p.y+7).toBeLessThan(height);expect(p.shadow.alpha).toBeGreaterThan(0)}
 for(let i=0;i<s.slots.length;i++)for(let j=i+1;j<s.slots.length;j++){const a=s.slots[i],b=s.slots[j];expect(overlap({x:a.x-a.width/2,y:a.y-a.height,width:a.width,height:a.height},{x:b.x-b.width/2,y:b.y-b.height,width:b.width,height:b.height}),`bodies ${a.id}/${b.id}`).toBe(false);expect(overlap(a.label,b.label),`labels ${a.id}/${b.id}`).toBe(false)}
 if(boss)expect(s.slots.find(p=>p.id==='enemy-0')!.x).toBeCloseTo(s.enemyZone.x+s.enemyZone.width/2)
})
test('every chapter has an explicit foreground camera/ground preset and aspect ratio is preserved',()=>{
 expect(Object.keys(SCENE_PRESETS)).toHaveLength(15)
 for(const p of Object.values(SCENE_PRESETS)){const f=backgroundFrame(390,340,1000,1200,p);expect(f.width/f.height).toBeCloseTo(1000/1200);expect(f.x).toBeLessThanOrEqual(0);expect(f.y).toBeLessThan(0);expect(f.x+f.width).toBeGreaterThanOrEqual(390);expect(f.y+f.height).toBeGreaterThanOrEqual(340);expect(p.crop.top).toBeGreaterThan(.25);expect(p.maxEnemies).toBe(6)}
})
test('transparent tile padding is excluded and the opaque feet map exactly to the floor origin',()=>{
 const pixels=new Uint8ClampedArray(8*10*4);for(let y=2;y<8;y++)for(let x=1;x<5;x++)pixels[(y*8+x)*4+3]=255
 const p=alphaFootprint(pixels,8,10,10);expect(p).toEqual({width:4,height:6,footX:3,footY:8,tile:10});const scale=2;expect((-10+8)*scale+(10-p.footY)*scale).toBe(0)
})
