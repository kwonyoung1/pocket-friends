import sharp from 'sharp'
import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const records=JSON.parse(await readFile('art-source/characters/metadata.json','utf8'));let count=0,bytes=0
for(const [kind,frames]of Object.entries(records))for(const [frame,record]of Object.entries(frames)){
 const input=await readFile(`src/assets/characters/${kind}/${frame}.webp`);assert.equal(createHash('sha256').update(input).digest('hex'),record.sha256)
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,512);assert.equal(info.height,512);let solid=0,clear=0
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const a=data[(y*512+x)*4+3];if(!x||!y||x===511||y===511)assert.equal(a,0,`${kind}/${frame} edge`);if(a>128)solid++;if(a===0)clear++}
 assert(solid>10000,`${kind}/${frame} empty art`);assert(clear>10000,`${kind}/${frame} opaque background`);count++;bytes+=input.length
}
assert.equal(count,42);console.log(`Verified ${count} 512px frames: clear margins, alpha, nonempty artwork and source hashes; ${(bytes/1024/1024).toFixed(2)} MiB runtime WebP.`)
