import sharp from 'sharp'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
// Technical atlas packing only. Source artwork is generated, never synthesized from shapes.
const source=process.argv[2]
if(!source)throw Error('Usage: node scripts/prepare-arena-monsters.mjs <source-directory>')
const manifest={version:1,tile:128,columns:4,rows:5,poses:['idle','breathing (derived idle)','attack','hit'],provenance:'Original image generation; transparent source sheets, five identities × three drawn poses. Sharp isolates alpha islands, removes subpixel noise, resizes and packs; WebP quality 92/alpha 100. Death is a runtime fade, not an additional drawn pose.',regions:{}}
for(const id of ['eclipse','heaven','garden','dream','skycastle','star-temple']){
 const input=await readFile(path.join(source,id+'.png')),meta=await sharp(input).metadata(),layers=[]
 // Assign connected alpha islands to the nearest sprite center before packing.
 // This prevents a weapon tip from the adjacent source cell leaking into the atlas.
 const {data:rgba,info:rawInfo}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const w=rawInfo.width,h=rawInfo.height,seen=new Uint8Array(w*h),groups=Array.from({length:15},()=>[])
 for(let start=0;start<w*h;start++){
  if(seen[start]||rgba[start*4+3]<100)continue
  const stack=[start],pixels=[];seen[start]=1;let sumX=0,sumY=0
  while(stack.length){const n=stack.pop(),x=n%w,y=Math.floor(n/w);pixels.push(n);sumX+=x;sumY+=y
   for(const next of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(next>=0&&!seen[next]&&rgba[next*4+3]>=100){seen[next]=1;stack.push(next)}
  }
  if(pixels.length<100)continue
  const col=Math.min(4,Math.floor(sumX/pixels.length/w*5)),row=Math.min(2,Math.floor(sumY/pixels.length/h*3))
  for(const pixel of pixels)groups[row*5+col].push(pixel)
 }

 for(let monster=0;monster<5;monster++)for(let frame=0;frame<4;frame++){
  const pose=frame<2?0:frame-1,pixels=groups[pose*5+monster]
  if(pixels.length<200)throw Error(`Missing opaque sprite ${id} ${monster} ${pose}`)
  let left=w,top=h,right=0,bottom=0;for(const n of pixels){left=Math.min(left,n%w);right=Math.max(right,n%w);top=Math.min(top,Math.floor(n/w));bottom=Math.max(bottom,Math.floor(n/w))}
  const cw=right-left+1,ch=bottom-top+1,cell=Buffer.alloc(cw*ch*4)
  for(const n of pixels){const to=((Math.floor(n/w)-top)*cw+n%w-left)*4;rgba.copy(cell,to,n*4,n*4+4)}
  let image=sharp(cell,{raw:{width:cw,height:ch,channels:4}})
  const {data,info}=await image.resize({width:112,height:112,fit:'inside'}).png().toBuffer({resolveWithObject:true})
  layers.push({input:data,left:frame*128+Math.round((128-info.width)/2),top:monster*128+120-info.height+(frame===1?1:0)})
 }
 const output=await sharp({create:{width:512,height:640,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp({quality:92,alphaQuality:100,effort:6}).toBuffer()
 const file='src/arena/art/enemies-'+id+'-hd.webp';await writeFile(file,output)
 manifest.regions[id]={file,bytes:output.length,sourceSha256:createHash('sha256').update(input).digest('hex'),sha256:createHash('sha256').update(output).digest('hex')}
}
await mkdir('docs/arena-monsters',{recursive:true});await writeFile('docs/arena-monsters/assets.json',JSON.stringify(manifest,null,2)+'\n')
