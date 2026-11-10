import sharp from 'sharp'
import {readFile,stat} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const metadata=JSON.parse(await readFile('art-source/woodland/metadata.json','utf8'));let bytes=0,count=0
for(const[kind,m]of Object.entries(metadata)){
 const silhouettes=[]
 for(const f of m.frames){const path=`src/assets/animals/${kind}/${f.name}.webp`,input=await readFile(path);assert.equal(createHash('sha256').update(input).digest('hex'),f.sha256);assert.equal(f.sourceEdgePixels,0,`${kind}/${f.name} source crosses cell boundary`);const{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,512);assert.equal(info.height,512);let clear=0,solid=0;const alpha=[];for(let y=0;y<512;y++)for(let x=0;x<512;x++){const a=data[(y*512+x)*4+3];if(!a)clear++;if(a>128)solid++;if(!x||!y||x===511||y===511)assert.equal(a,0,`${path} edge`);if(y>300)alpha.push(a>128?1:0)}assert(clear>10000);assert(solid>10000);if(f.name.startsWith('walk-'))silhouettes.push(alpha);count++}
 assert.equal(new Set(m.frames.slice(0,8).map(f=>f.sha256)).size,8)
 for(let i=0;i<8;i++){let difference=0;for(let p=0;p<silhouettes[i].length;p++)difference+=silhouettes[i][p]!==silhouettes[(i+1)%8][p]?1:0;assert(difference>300,`${kind} adjacent gait ${i} duplicates silhouette`)}
 for(const type of ['walk','life']){const path=`src/assets/animals/${kind}/${type}-atlas.webp`,info=await sharp(path).metadata();assert.equal(info.width,4096);assert.equal(info.height,512);bytes+=(await stat(path)).size}
}
console.log(`Verified ${count} transparent 512px frames, source cell margins and 40 distinct gait transitions; 10 runtime atlases ${(bytes/1024/1024).toFixed(2)} MiB.`)
