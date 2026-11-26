import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {checkAssets} from './assets.mjs'
import {assess} from './policy.mjs'
test('real shared character image paths are FAST and require explicit asset decoding',()=>{const p=assess([{path:'src/assets/directional/boy.webp',status:'M',mode:'100644'}]);assert.equal(p.mode,'FAST');assert.deepEqual(p.assetFiles,['src/assets/directional/boy.webp'])})
test('valid runtime image is decoded while missing/corrupt bytes fail validation',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'pocket-asset-')),previous=process.cwd();try{process.chdir(root);mkdirSync('src/assets',{recursive:true});await sharp({create:{width:4,height:3,channels:4,background:'#ffffff'}}).png().toFile('src/assets/check.png');assert.equal((await checkAssets(['src/assets/check.png']))[0].width,4);writeFileSync('src/assets/broken.png','not an image');await assert.rejects(()=>checkAssets(['src/assets/broken.png']));await assert.rejects(()=>checkAssets(['src/assets/missing.png']))}finally{process.chdir(previous);rmSync(root,{recursive:true,force:true})}
})
test('asset checks reject directory traversal and malformed font headers',async()=>{await assert.rejects(()=>checkAssets(['src/assets/../../secret.png']));const root=mkdtempSync(path.join(tmpdir(),'pocket-font-')),previous=process.cwd();try{process.chdir(root);mkdirSync('public');writeFileSync('public/bad.woff2','bad');await assert.rejects(()=>checkAssets(['public/bad.woff2']))}finally{process.chdir(previous);rmSync(root,{recursive:true,force:true})}})
