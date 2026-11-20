import sharp from 'sharp'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const metadata=JSON.parse(await readFile('art-source/plush-A/metadata.json','utf8'))
const sources=JSON.parse(await readFile('art-source/plush-A/sources.json','utf8'))
let bytes=0,frames=0
assert.equal(Object.keys(metadata.animals).length,9)
for(const [id,record] of Object.entries(metadata.animals)){
 for(const type of ['master','sheet'])assert.equal(createHash('sha256').update(await readFile(sources.animals[id][type])).digest('hex'),sources.animals[id][type+'SHA256'],`${id}: changed source ${type}`)
 const walkHashes=new Set()
 for(const [type,count] of [['idle',1],['walk',8],['life',12]]){
  const path=`src/assets/animals/plush-A/${id}/${type==='idle'?'idle':type+'-atlas'}.webp`,buffer=await readFile(path)
  assert.equal(createHash('sha256').update(buffer).digest('hex'),record.files[type].sha256)
  const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  assert.equal(info.height,256);assert.equal(info.width,256*count)
  for(let n=0;n<count;n++){
   let solid=0,clear=0
   for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const alpha=data[(y*info.width+n*256+x)*4+3]
    if(!x||!y||x===255||y===255)assert.equal(alpha,0,`${id} ${type} ${n}: clipped output`)
    if(alpha>128)solid++;if(alpha===0)clear++
   }
   assert(solid>1000,`${id} ${type} ${n}: empty`);assert(clear>10000,`${id} ${type} ${n}: matte background`)
   if(type==='walk'){
    const png=await sharp(buffer).extract({left:n*256,top:0,width:256,height:256}).png().toBuffer();walkHashes.add(createHash('sha256').update(png).digest('hex'))
   }
   frames++
  }
  bytes+=buffer.length
 }
 assert.equal(walkHashes.size,8,`${id}: walk frames must be distinct drawings`)
}
console.log(`Verified ${frames} rendered frames (including 9 approved idle originals), 9 identities, alpha, bounds and hashes; ${(bytes/1024/1024).toFixed(2)} MiB runtime WebP.`)
