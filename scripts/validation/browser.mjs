import {execFileSync} from 'node:child_process'
import {readdirSync,rmSync} from 'node:fs'
import {homedir} from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
/** One recovery attempt for a missing/corrupt browser cache. A second failure remains a failure. */
export async function ensureBrowser({probe,repair,install}){try{await probe();return{repaired:false}}catch(first){await repair();await install();await probe();return{repaired:true,reason:first.message}}}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const {chromium}=await import('playwright'),root=path.join(homedir(),'.cache','ms-playwright')
 const result=await ensureBrowser({
  probe:async()=>{const b=await chromium.launch({headless:true});try{const p=await b.newPage();await p.goto('data:text/html,<title>cache check</title>');if(await p.title()!=='cache check')throw Error('Browser probe failed')}finally{await b.close()}},
  repair:()=>{if(process.env.PLAYWRIGHT_BROWSERS_PATH&&process.env.PLAYWRIGHT_BROWSERS_PATH!==root)throw Error('Custom browser cache path: refusing automatic removal');for(const name of readdirSync(root,{withFileTypes:true}).filter(d=>/^chromium(?:_headless_shell)?-\d+$/.test(d.name)).map(d=>d.name))rmSync(path.join(root,name),{recursive:true,force:true})},
  install:()=>execFileSync('npx',['playwright','install','--with-deps','chromium'],{stdio:'inherit'})
 });console.log(result.repaired?'Chromium cache repaired and probed.':'Chromium cache probe passed.')
}
