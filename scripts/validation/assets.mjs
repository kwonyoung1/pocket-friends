import sharp from 'sharp'
import {readFileSync,lstatSync} from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
export async function checkAssets(files){
 const results=[]
 for(const file of files){
  if(!/^(?:src\/assets\/|src\/arena\/art\/|public\/)[^\0]+\.(?:png|webp|jpe?g|gif|avif|svg|ico|woff2)$/i.test(file)||file.split('/').includes('..')||!lstatSync(file).isFile())throw Error('Unsupported asset path/type: '+file)
  const data=readFileSync(file),ext=path.extname(file).toLowerCase()
  if(ext==='.woff2'){if(data.toString('ascii',0,4)!=='wOF2')throw Error('Invalid WOFF2: '+file)}
  else if(ext==='.ico'){if(data.length<6||data.readUInt32LE(0)!==65536||data.readUInt16LE(4)<1)throw Error('Invalid ICO: '+file)}
  else{const metadata=await sharp(data,{failOn:'error'}).metadata();if(!metadata.width||!metadata.height)throw Error('Missing image dimensions: '+file);await sharp(data,{failOn:'error'}).resize(1,1).raw().toBuffer();results.push({file,width:metadata.width,height:metadata.height,bytes:data.length});continue}
  results.push({file,bytes:data.length})
 }
 return results
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await checkAssets(process.argv.slice(2)),null,2))
