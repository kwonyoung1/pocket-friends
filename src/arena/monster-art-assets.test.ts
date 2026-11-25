import {test,expect} from 'vitest'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {HD_MONSTER_REGIONS} from './monster-art.ts'
test('all six shipped atlases have clean gutters, distinct attack/recoil poses and audited hashes',async()=>{
 const manifest=JSON.parse(await readFile('docs/arena-monsters/assets.json','utf8'));let total=0
 for(const id of HD_MONSTER_REGIONS){
 const file=await readFile(`src/arena/art/enemies-${id}-hd.webp`),meta=await sharp(file).metadata();total+=file.length
 const raw=await sharp(file).ensureAlpha().raw().toBuffer();expect([meta.width,meta.height,meta.hasAlpha]).toEqual([512,640,true]);expect(createHash('sha256').update(file).digest('hex')).toBe(manifest.regions[id].sha256)
 for(let row=0;row<5;row++){
 const hashes=[]
 for(let frame=0;frame<4;frame++){
 const data=Buffer.alloc(128*128*4);for(let y=0;y<128;y++)raw.copy(data,y*128*4,((row*128+y)*512+frame*128)*4,((row*128+y)*512+frame*128+128)*4)
 let opaque=0,gutter=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++){const alpha=data[(y*128+x)*4+3];opaque+=alpha>0?1:0;if(x<4||x>=124||y<4||y>=124)gutter+=alpha}
 expect(gutter,`${id}/${row}/${frame} gutter`).toBe(0);expect(opaque).toBeGreaterThan(400);hashes.push(createHash('sha256').update(data).digest('hex'))
 }expect(new Set(hashes).size).toBe(4)
 }
 }expect(total).toBeLessThan(2*1024*1024)
})
