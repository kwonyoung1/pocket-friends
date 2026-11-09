import {readFileSync} from 'node:fs'
const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8')),audit=JSON.parse(readFileSync('dist/.vite/effects-lab-audit.json','utf8'))
function reachable(entry){const seen=new Set(),walk=file=>{if(seen.has(file))return;seen.add(file);const chunk=audit.chunks[file];if(!chunk)return;for(const dep of [...chunk.imports,...chunk.dynamicImports])walk(dep)};if(!manifest[entry])throw Error(`Missing build entry ${entry}`);walk(manifest[entry].file);return [...seen]}
const game=reachable('index.html'),lab=reachable('effects-lab/index.html')
for(const file of game){const chunk=audit.chunks[file];if(chunk?.lab)throw Error(`Effects lab leaked into game bundle: ${file}`)}
for(const name of ['pixi.js','gsap'])if(!lab.some(file=>audit.chunks[file]?.libraries.includes(name)))throw Error(`Lab dependency missing: ${name}`)
console.log(`Effects isolation verified: ${game.length} game chunks, ${lab.length} lab chunks; lab demo code excluded; production PixiJS effects allowed.`)

for(const name of ['pixi.js','gsap'])if(!game.some(file=>audit.chunks[file]?.libraries.includes(name)))throw Error(`Production effects dependency missing: ${name}`)

const initial=new Set()
function staticWalk(file){if(initial.has(file))return;initial.add(file);for(const dep of audit.chunks[file]?.imports??[])staticWalk(dep)}
staticWalk(manifest['index.html'].file)
for(const file of initial)if(audit.chunks[file]?.libraries.length)throw Error(`Effects vendor must load only when opening the minigame: ${file}`)
console.log('PixiJS/GSAP excluded from initial room imports.')
