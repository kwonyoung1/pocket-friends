import sharp from 'sharp'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const sources=JSON.parse(await readFile('art-source/directional/sources.json','utf8')),meta=JSON.parse(await readFile('art-source/directional/metadata.json','utf8'))
const hash=b=>createHash('sha256').update(b).digest('hex');let bytes=0
assert.equal(Object.keys(meta.items).length,11)
for(const [id,record] of Object.entries(meta.items)){
 assert.equal(hash(await readFile(sources.items[id].source)),sources.items[id].sha256)
 const buffer=await readFile(record.output);assert.equal(hash(buffer),record.sha256);bytes+=buffer.length
 const m=await sharp(buffer).metadata();assert.equal(m.width,1024);assert.equal(m.height,768)
 for(let row=0;row<3;row++){
  const hashes=new Set()
  for(let frame=0;frame<4;frame++){
   const {data}=await sharp(buffer).extract({left:frame*256,top:row*256,width:256,height:256}).ensureAlpha().raw().toBuffer({resolveWithObject:true});let solid=0
   for(let y=0;y<256;y++)for(let x=0;x<256;x++){const a=data[(y*256+x)*4+3];if(!x||!y||x===255||y===255)assert.equal(a,0,`${id}: frame border`);if(a>128)solid++}
   assert(solid>1000);hashes.add(hash(data))
  }
  assert.equal(hashes.size,4,`${id}: distinct walking drawings required`)
 }
}
console.log(`Verified 11 directional atlases, 132 distinct drawings, transparent frame margins, source/output hashes; ${bytes} bytes.`)
