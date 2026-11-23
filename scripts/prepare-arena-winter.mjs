import sharp from 'sharp'
import{mkdir,writeFile}from'node:fs/promises'
const out='src/arena/art';await mkdir(out,{recursive:true})
if(process.argv[2]){const src=sharp(process.argv[2]),{width,height}=await src.metadata();for(const[i,id]of ['eclipse','heaven','christmas'].entries()){const left=Math.floor(width*i/3),right=Math.floor(width*(i+1)/3);await src.clone().extract({left,top:0,width:right-left,height}).webp({quality:80,effort:6}).toFile(`${out}/bg-${id}.webp`)}}
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`,poly=(p,c)=>`<polygon points="${p}" fill="${c}"/>`,circle=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`
const palettes={eclipse:['#17172b','#62528e','#a793d8','#e8d6ff','#f8c987'],heaven:['#40345e','#c9b16b','#f0dda1','#fff3d9','#98dcef'],christmas:['#27374d','#bb4651','#f3cf7d','#fff6e4','#a8e3ee']}
function figure(kind,frame,region){const[p,c,l,white,accent]=palettes[region],lift=frame===1?-1:0,hand=frame===2?3:0;let s=''
 if(kind==='moth')s=poly('14,14 4,8 2,18 10,22 14,19',c)+poly('18,14 28,8 30,18 22,22 18,19',l)+rect(14,12,4,14,p)+rect(13,9,6,6,l)+rect(11,5,2,5,accent)+rect(19,5,2,5,accent)+circle(9,16,3,accent)+circle(23,16,3,accent)
 else if(kind==='orb')s=poly('11,15 2,10 4,21 12,24',white)+poly('21,15 30,10 28,21 20,24',white)+circle(16,18,9,l)+poly('16,9 11,18 16,27 21,18',accent)+poly('7,6 10,11 22,11 25,6 20,8 16,3 12,8',c)
 else if(kind==='slime')s=poly('5,25 4,19 7,13 12,9 21,10 27,17 28,25 23,28 9,28',accent)+poly('8,19 9,14 14,12 15,15',white)+rect(15,6,2,9,white)+rect(12,9,8,2,white)+rect(9,27,4,2,l)+rect(21,27,4,2,l)
 else if(kind==='mimic')s=rect(5,14,22,15,c)+rect(4,10-lift,24,6,c)+rect(14,10,4,19,accent)+rect(5,16,22,3,accent)+poly('13,11 8,7 10,4 16,10 22,4 25,7 19,11',accent)+poly('8,20 24,20 22,24 10,24',p)+rect(10,20,3,2,white)+rect(19,20,3,2,white)
 else if(kind==='snowman')s=circle(16,24,8,white)+circle(16,15,6,white)+circle(16,7,4,white)+rect(11,2,10,3,p)+rect(13,0,6,3,p)+rect(11,11,10,3,c)+rect(19,12,3,7,c)+poly('17,7 24,8 17,9','#ebad6c')+rect(3,15,8,2,'#806446')+rect(22,13-hand,7,2,'#806446')+rect(15,18,2,2,p)+rect(15,23,2,2,p)
 else if(kind==='reindeer')s=rect(7,21,2,9-lift,'#806446')+rect(11,21,2,8+lift,'#a38562')+rect(20,21,2,9+lift,'#806446')+rect(24,21,2,8-lift,'#a38562')+poly('5,17 10,13 23,14 27,20 22,24 9,23',l)+poly('8,19 5,12 8,5 14,6 17,12 14,19',l)+rect(4,10,11,4,c)+rect(6,1,2,7,accent)+rect(3,2,3,2,accent)+rect(4,0,2,3,accent)+rect(12,1,2,7,accent)+rect(14,2,3,2,accent)+rect(15,0,2,3,accent)+rect(8,14,3,3,accent)+circle(7,10,1,p)+rect(3,11,3,2,'#f4b5b5')+rect(26,16,3,2,white)
 else{const priest=kind==='priest',boss=kind==='king'||kind==='judge'||kind==='krampus';s+=rect(9,24,5,6,p)+rect(19,24,5,6,p)+poly('10,12 22,12 25,25 7,25',c)+poly('10,12 16,8 22,12 22,4 10,4',boss?l:c)+rect(11,7,10,8,white)+rect(11,14,10,3,l)+rect(7,16,3,8,l)+rect(23+hand,14,3,9,l)
  if(priest)s+=rect(4,8,2,19,accent)+circle(5,7,3,accent)+rect(12,18,8,7,p)+rect(14,18,4,7,accent)
  else if(kind==='krampus')s+=poly('10,5 7,1 7,7',accent)+poly('22,5 25,1 25,7',accent)+circle(26,21,6,'#46775f')+rect(21+hand,11,9,8,c)+rect(24+hand,11,3,8,accent)+rect(21+hand,14,9,2,accent)+rect(10,26,5,4,c)+rect(19,26,5,4,c)
  else{s+=poly(`4,15 10,16 10,23 6,26 2,22`,l)+rect(26+hand,6,2,20,white)+poly(`${27+hand},1 ${24+hand},7 ${30+hand},7`,accent);if(boss)s+=poly('8,2 12,5 16,0 20,5 24,2 23,7 9,7',accent)}
  if(kind==='judge')s+=poly('8,12 1,6 2,19 8,23',white)+poly('24,12 31,6 30,19 24,23',white)+rect(7,0,18,1,accent)
 }
 s+=rect(kind==='moth'?14:12,kind==='slime'?19:kind==='snowman'?6:9,2,2,p)+rect(kind==='moth'?18:18,kind==='slime'?19:kind==='snowman'?6:9,2,2,p)
 if(frame===2)s+=poly('27,3 28,8 32,9 28,11 27,15 25,11 22,9 25,8',accent)
 if(frame===3)s+=poly('2,5 6,3 9,5 7,8 4,8',accent)+rect(21,2,2,4,white)
 return `<g transform="translate(0 ${lift})">${s}</g>`
}
for(const[region,kinds]of Object.entries({eclipse:['moth','priest','knight','king'],heaven:['orb','priest','knight','judge'],christmas:['slime','mimic','snowman','reindeer','krampus']})){
 let body='';for(let r=0;r<kinds.length;r++)for(let c=0;c<4;c++)body+=`<g transform="translate(${c*64} ${r*64}) scale(2)">${figure(kinds[r],c,region)}</g>`
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="${kinds.length*64}" shape-rendering="crispEdges">${body}</svg>`;await writeFile(`${out}/enemies-${region}.svg`,svg);await sharp(Buffer.from(svg)).png({palette:true,effort:10}).toFile(`${out}/enemies-${region}.png`)
}
console.log('Prepared three optimized backgrounds when source supplied; authored 13 monsters × 4 distinct pose frames.')
