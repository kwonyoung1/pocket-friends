import {readFileSync,writeFileSync} from 'node:fs'
import {gzipSync} from 'node:zlib'
const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8')),audit=JSON.parse(readFileSync('dist/.vite/effects-lab-audit.json','utf8'))
function closure(entry){const set=new Set(),walk=f=>{if(set.has(f))return;set.add(f);const c=audit.chunks[f];if(c)for(const d of [...c.imports,...c.dynamicImports])walk(d)};walk(manifest[entry].file);return set}
const game=closure('index.html'),lab=closure('effects-lab/index.html'),files=[...lab].filter(f=>!game.has(f)).map(file=>{const buf=readFileSync(`dist/${file}`);return {file,rawBytes:buf.length,gzipBytes:gzipSync(buf).length}})
const report={description:'All potentially reachable lab-only JS including dynamic renderer backends; not initial network transfer. Shared React/current Painter/GemArt chunks excluded.',files,totalRawBytes:files.reduce((n,f)=>n+f.rawBytes,0),totalGzipBytes:files.reduce((n,f)=>n+f.gzipBytes,0)};writeFileSync('docs/EFFECTS_LAB_BUNDLE.json',JSON.stringify(report,null,2)+'\n');console.log(report.totalGzipBytes)
