import sharp from 'sharp'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const source=JSON.parse(await readFile('art-source/plush-A/sources.json','utf8'))
const life=['idle','blink','sit','sleep','stretch','groom','yawn','look','happy','eatOpen','eatClosed','play']
const metadata={version:1,approval:'User approved design A on 2026-11-20',frameSize:256,anchor:[128,238],animals:{}}
const hash=b=>createHash('sha256').update(b).digest('hex')
async function cut(input,rect){
 const {data,info}=await sharp(input).extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let l=info.width,t=info.height,r=0,b=0,edge=0
 // Generated sheets can retain nearly transparent matte RGB. Quantize only alpha;
 // do not recolor the approved face/fur or manufacture missing poses.
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const n=(y*info.width+x)*4
  if(data[n+3]<=24)data[n+3]=0
  else if(data[n+3]>=245)data[n+3]=255
  if(data[n+3]>80){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}
  if(data[n+3]>128&&(!x||!y||x===info.width-1||y===info.height-1))edge++
 }
 if(r<=l||b<=t)throw Error('Empty source cell')
 l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(info.width-1,r+2);b=Math.min(info.height-1,b+2)
 return {data,info,box:{left:l,top:t,width:r-l+1,height:b-t+1},edge}
}
async function raster(cell,scale){
 const w=Math.max(1,Math.round(cell.box.width*scale)),h=Math.max(1,Math.round(cell.box.height*scale))
 if(w>240||h>232)throw Error('Plush source exceeds safe frame')
 const image=await sharp(cell.data,{raw:{width:cell.info.width,height:cell.info.height,channels:4}}).extract(cell.box).resize(w,h).png().toBuffer()
 return sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite([{input:image,left:Math.round((256-w)/2),top:238-h}]).png().toBuffer()
}
for(const [id,record] of Object.entries(source.animals)){
 const meta=await sharp(record.sheet).metadata(),cells=[]
 for(let n=0;n<20;n++){
  const x=n%4,y=Math.floor(n/4),left=Math.round(x*meta.width/4),top=Math.round(y*meta.height/5)
  cells.push(await cut(record.sheet,{left,top,width:Math.round((x+1)*meta.width/4)-left,height:Math.round((y+1)*meta.height/5)-top}))
 }
 const masterMeta=await sharp(record.master).metadata()
 const master=await cut(record.master,{left:0,top:0,width:masterMeta.width,height:masterMeta.height})
 const scale=Math.min(196/cells[8].box.width,232/Math.max(...cells.map(c=>c.box.width)),220/Math.max(...cells.map(c=>c.box.height)))
 const normalized=await Promise.all(cells.map(c=>raster(c,scale)))
 const dir=`src/assets/animals/plush-A/${id}`;await mkdir(dir,{recursive:true})
 // The standing pose is the exact approved master, uniformly scaled. Other poses
 // were newly drawn by image_gen from that master, never lifted from old animals.
 normalized[8]=await raster(master,Math.min(cells[8].box.width*scale/master.box.width,220/master.box.height))
 const idle=await sharp(normalized[8]).webp({quality:88,alphaQuality:100}).toBuffer()
 await writeFile(`${dir}/idle.webp`,idle)
 const files={idle:{bytes:idle.length,sha256:hash(idle)}}
 for(const [name,start,count] of [['walk',0,8],['life',8,12]]){
  const buffer=await sharp({create:{width:256*count,height:256,channels:4,background:'#00000000'}}).composite(normalized.slice(start,start+count).map((input,i)=>({input,left:i*256,top:0}))).webp({quality:88,alphaQuality:100}).toBuffer()
  await writeFile(`${dir}/${name}-atlas.webp`,buffer);files[name]={bytes:buffer.length,sha256:hash(buffer)}
 }
 const names=[...Array.from({length:8},(_,i)=>'walk-'+i),...life]
 metadata.animals[id]={sourceWidth:meta.width,sourceHeight:meta.height,files,frames:normalized.map((buffer,i)=>({name:names[i],sha256:hash(buffer),sourceEdgePixels:cells[i].edge}))}
 console.log(id,Object.fromEntries(Object.entries(files).map(([k,v])=>[k,v.bytes])), 'edge pixels:',cells.reduce((n,c)=>n+c.edge,0))
}
await writeFile('art-source/plush-A/metadata.json',JSON.stringify(metadata,null,2)+'\n')
