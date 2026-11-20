import sharp from 'sharp'
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const sources=JSON.parse(await readFile('art-source/directional/sources.json','utf8')),metadata={frameSize:256,grid:[4,3],items:{}}
async function cut(path,rect){
 const {data,info}=await sharp(path).extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 // Extract the character's connected silhouette, discarding tiny fragments
 // from neighbouring grid cells and disconnected alpha specks, not body parts.
 for(let p=0;p<info.width*info.height;p++)if(data[p*4+3]<=32)data[p*4+3]=0
 const visited=new Uint8Array(info.width*info.height);let largest=[]
 for(let p=0;p<visited.length;p++){
  if(visited[p]||!data[p*4+3])continue
  const component=[p];visited[p]=1
  for(let j=0;j<component.length;j++){
   const v=component[j],x=v%info.width,y=Math.floor(v/info.width)
   for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const nx=x+ox,ny=y+oy,n=ny*info.width+nx
    if(nx<0||ny<0||nx>=info.width||ny>=info.height||visited[n]||!data[n*4+3])continue
    visited[n]=1;component.push(n)
   }
  }
  if(component.length>largest.length)largest=component
 }
 const keep=new Uint8Array(visited.length);for(const p of largest)keep[p]=1
 for(let p=0;p<keep.length;p++)if(!keep[p])data[p*4+3]=0
 let l=info.width,t=info.height,r=-1,b=-1
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const n=(y*info.width+x)*4;if(data[n+3]<=32)data[n+3]=0
  if(data[n+3]>100){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y)}
 }
 if(r<l)throw Error('Empty directional cell')
 return{data,info,box:{left:l,top:t,width:r-l+1,height:b-t+1}}
}
for(const [id,record] of Object.entries(sources.items)){
 const meta=await sharp(record.source).metadata(),cells=[]
 for(let n=0;n<12;n++){const x=n%4,y=Math.floor(n/4),left=Math.round(x*meta.width/4),top=Math.round(y*meta.height/3);cells.push(await cut(record.source,{left,top,width:Math.round((x+1)*meta.width/4)-left,height:Math.round((y+1)*meta.height/3)-top}))}
 const human=['boy','girl'].includes(id),base=human?`src/assets/characters/${id}/idle.webp`:`src/assets/animals/plush-A/${id}/idle.webp`,bm=await sharp(base).metadata(),bb=await cut(base,{left:0,top:0,width:bm.width,height:bm.height})
 const targetHeight=bb.box.height/bm.height*256
 const normalized=[]
 for(let row=0;row<3;row++){
  const group=cells.slice(row*4,row*4+4),scale=Math.min(targetHeight/group[0].box.height,220/Math.max(...group.map(c=>c.box.height)),232/Math.max(...group.map(c=>c.box.width)))
  for(const c of group){const w=Math.round(c.box.width*scale),h=Math.round(c.box.height*scale),input=await sharp(c.data,{raw:{width:c.info.width,height:c.info.height,channels:4}}).extract(c.box).resize(w,h).png().toBuffer();normalized.push(await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((256-w)/2),top:238-h}]).png().toBuffer())}
 }
 const atlas=await sharp({create:{width:1024,height:768,channels:4,background:'#00000000'}}).composite(normalized.map((input,n)=>({input,left:n%4*256,top:Math.floor(n/4)*256}))).webp({quality:88,alphaQuality:100}).toBuffer()
 const output=`src/assets/directional/${id}.webp`;await writeFile(output,atlas);metadata.items[id]={output,bytes:atlas.length,sha256:createHash('sha256').update(atlas).digest('hex')};console.log(id,atlas.length)
}
await writeFile('art-source/directional/metadata.json',JSON.stringify(metadata,null,2)+'\n')
